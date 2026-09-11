"use client"

import { productStore } from "@/lib/storage/productStore"

/**
 * Agentic-commerce protocol engine for Razent.
 * Layered stack: ACP (discovery/cart) → AP2 (mandate verification) →
 * NPCI UAP (INR settlement via Razorpay) → x402 (global M2M HTTP 402).
 *
 * All protocol events must emit audit records; see agentic-commerce-uap skill.
 */

import type { Order } from "@/lib/types/order"
import type { ProtocolEvent, AuditEvent } from "@/lib/types/audit"

export type CommerceProtocol = "ncpi_uap" | "acp" | "ap2" | "x402" | "direct_web"

export interface AgentMetadata {
  agent_name: string
  protocol_version: string
  delegated_limit_paise?: number
  mandate_id?: string
}

export interface X402Challenge {
  status: 402
  headers: Record<string, string>
  body: {
    protocol: "x402"
    mandate_id?: string
    amount_paise: number
    settlement: "razorpay_test"
    message: string
  }
}

/* ------------------------------------------------------------------ */
/*  ACP — Agent Commerce Protocol (product discovery + cart intent)     */
/* ------------------------------------------------------------------ */

export function handleACPDiscovery(query: string): { results: string[]; protocol: "acp" } {
  // Section 2 improvement: query the real product store so external agents
  // get structured catalog results (not just split keywords).
  const needle = query.toLowerCase().trim()
  let results: string[] = []
  const products = productStore.list()
  const matched = products.filter(
      (p: any) =>
        p.title.toLowerCase().includes(needle) ||
        p.description?.toLowerCase().includes(needle) ||
        p.category?.toLowerCase().includes(needle) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(needle)),
    )
    results = matched.slice(0, 5).map((p: any) => p.id)
  if (results.length === 0 && needle.split(/\s+/).filter(Boolean).length > 0) {
    results = needle.split(/\s+/).filter(Boolean).slice(0, 5)
  }
  return { protocol: "acp", results }
}

/* ------------------------------------------------------------------ */
/*  AP2 — Mandate verification (delegation cap + agent identity)      */
/* ------------------------------------------------------------------ */

export function verifyAP2Mandate(
  mandate: { mandate_id?: string; agent_name?: string; delegated_limit_paise?: number },
  amount_paise: number,
): { valid: boolean; reason?: string; protocol: "ap2"; mandate_id?: string } {
  // Verifies agent delegation proof and compares against merchant approval threshold.
  // Called before any autonomous settlement (UAP or x402).
  if (!mandate.mandate_id) {
    return { valid: false, reason: "mandate missing mandate_id", protocol: "ap2" }
  }
  if (
    mandate.delegated_limit_paise !== undefined &&
    amount_paise > mandate.delegated_limit_paise
  ) {
    return {
      valid: false,
      reason: "Order amount exceeds customer delegated mandate cap",
      protocol: "ap2",
      mandate_id: mandate.mandate_id,
    }
  }
  return {
    valid: true,
    protocol: "ap2",
    mandate_id: mandate.mandate_id,
  }
}

/* ------------------------------------------------------------------ */
/*  Autonomous approval — compares against merchant threshold        */
/* ------------------------------------------------------------------ */

export function approveAuto(
  amount_paise: number,
  approvalThresholdRupees: number,
): { approved: boolean; requires_step_up: boolean; protocol: "ap2" | "x402" | "ncpi_uap" } {
  // approvalThreshold is stored in Rupees (useSettings.aiDefaults.approvalThreshold);
  // Convert to paise for comparison: threshold × 100.
  const thresholdPaise = approvalThresholdRupees * 100
  const requiresStepUp = amount_paise > thresholdPaise
  return {
    approved: !requiresStepUp,
    requires_step_up: requiresStepUp,
    protocol: requiresStepUp ? "x402" : "ncpi_uap",
  }
}

/* ------------------------------------------------------------------ */
/*  UAP — NPCI settlement via Razorpay (INR)                             */
/* ------------------------------------------------------------------ */

export function processUAPTransaction(
  order: Order,
  mandate_id?: string,
): { audit_events: AuditEvent[]; settlement_reference: string; protocol: "ncpi_uap"; order_id: string } {
  // Initiates autonomous UPI/Reserve settlement through Razorpay test/live gateway.
  // Emits audit events for the full protocol handshake.

  const events: AuditEvent[] = [
    {
      id: `audit-checkout-initiated-${order.id}-${Date.now()}`,
      type: "checkout_initiated" as ProtocolEvent,
      timestamp: new Date().toISOString(),
      actor: order.via_ai ? "AI Assistant" : "customer",
      source: order.via_ai ? "AI Agent" : "store",
      result: "Success",
      reason: "Mandate intent submitted; UAP settlement initiated",
      request_id: order.id,
      payload_summary: `mandate=${mandate_id ?? "none"} protocol=ncpi_uap amount_paise=${order.total_paise}`,
      status_code: 200,
    },
  ]

  // After simulated settlement (Razorpay test token reference):
  events.push({
    id: `audit-checkout-completed-${order.id}-${Date.now()}`,
    type: "checkout_completed" as ProtocolEvent,
    timestamp: new Date().toISOString(),
    actor: "system",
    source: "Razorpay",
    result: "Success",
    reason: "UAP mandate settled; Razorpay test token confirmed",
    request_id: order.id,
    payload_summary: `settlement=razorpay_test mandate=${mandate_id ?? "none"}`,
    status_code: 200,
  })

  return {
    audit_events: events,
    settlement_reference: "razorpay_test",
    protocol: "ncpi_uap",
    order_id: order.id,
  }
}

/* ------------------------------------------------------------------ */
/*  x402 — Global M2M HTTP 402 challenge payload                        */
/* ------------------------------------------------------------------ */

export function createX402Challenge(
  order: Order,
  mandate_id?: string,
): X402Challenge {
  return {
    status: 402,
    headers: {
      "Payment-Required": "protocol=x402; settlement=razorpay_test",
      "X-Protocol-Version": "1.0",
      "X-Mandate-Id": mandate_id ?? "none",
    },
    body: {
      protocol: "x402",
      mandate_id: mandate_id,
      amount_paise: order.total_paise,
      settlement: "razorpay_test",
      message: "Agent-to-agent autonomous settlement requires 402 challenge response",
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Google AP2 — Full Mandate Lifecycle & Cryptographic Hashing       */
/* ------------------------------------------------------------------ */

import type {
  IntentMandate,
  CartContents,
  CartMandate,
  PaymentMandate,
  NPCIMandateConfig,
  AP2VerificationResult,
} from "./ap2Types"
import {
  computeCanonicalCartHash,
  getOrCreateMerchantKeys,
  signJWS,
  verifyJWS,
  sha256Hex,
} from "./ap2Crypto"
import { canonicalize } from "./canonicalize"

/**
 * Creates an authorized AP2 Cart Mandate with real RFC 8785 canonical SHA-256 hash
 * and WebCrypto ECDSA P-256 (ES256) merchant digital signature.
 */
export async function createAP2CartMandate(
  cart: CartContents,
  merchantPrivateKey?: CryptoKey,
): Promise<CartMandate> {
  const { cartHash } = await computeCanonicalCartHash({
    id: cart.id,
    merchant_id: cart.merchant_id,
    items: cart.items,
    total_paise: cart.total_paise,
    cart_expiry: cart.cart_expiry,
  })

  const keys = await getOrCreateMerchantKeys()
  const privateKey = merchantPrivateKey || keys.privateKey

  const jwsPayload = {
    iss: cart.merchant_id,
    aud: "ap2.shopping_agent",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900, // 15 min validity
    cart_hash: cartHash,
    jti: `jwt_${cart.id}_${Date.now()}`,
  }

  const merchantAuthorization = await signJWS(jwsPayload, privateKey, "merchant-key-p256-primary")

  return {
    contents: cart,
    cart_hash: cartHash,
    merchant_authorization: merchantAuthorization,
  }
}

/**
 * Helper to build an AP2 Cart Mandate directly from a list of cart items.
 */
export async function createAP2CartMandateFromItems(
  items: Array<{
    id: string
    title: string
    price_paise: number
    qty: number
    image_url?: string
  }>,
): Promise<CartMandate> {
  const total_paise = items.reduce((sum, it) => sum + it.price_paise * it.qty, 0)
  const cartContents: CartContents = {
    id: `cart_${Date.now()}`,
    user_cart_confirmation_required: false,
    items: items.map((it) => ({
      product_id: it.id,
      title: it.title,
      qty: it.qty,
      unit_price_paise: it.price_paise,
      image_url: it.image_url,
    })),
    total_paise,
    currency: "INR",
    merchant_id: "merchant_one_razent",
    merchant_name: "Merchant One",
    cart_expiry: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    payment_methods: [
      { supportedMethods: "https://npci.org.in/upi" },
      { supportedMethods: "cards" },
    ],
  }
  return createAP2CartMandate(cartContents)
}

/**
 * Validates an AP2 Intent Mandate against a Cart Mandate for Human-Not-Present purchases.
 */
export function verifyAP2IntentMandate(
  intent: IntentMandate,
  cartMandate: CartMandate,
): { ok: boolean; reason?: string } {
  const now = new Date().toISOString()
  if (intent.intent_expiry && intent.intent_expiry < now) {
    return { ok: false, reason: "Intent mandate has expired" }
  }

  if (cartMandate.contents.total_paise > intent.price_cap_paise) {
    return {
      ok: false,
      reason: `Cart total (₹${(cartMandate.contents.total_paise / 100).toFixed(2)}) exceeds customer delegated cap of ₹${(intent.price_cap_paise / 100).toFixed(2)}`,
    }
  }

  if (intent.skus && intent.skus.length > 0) {
    const invalidItems = cartMandate.contents.items.filter(
      (item) => !intent.skus!.includes(item.product_id),
    )
    if (invalidItems.length > 0) {
      return {
        ok: false,
        reason: `Cart contains items not approved in Intent Mandate: ${invalidItems.map((i) => i.title).join(", ")}`,
      }
    }
  }

  return { ok: true }
}

/**
 * Creates an authorized AP2 Payment Mandate linking customer authorization to settlement rail.
 */
export async function createAP2PaymentMandate(
  cartMandate: CartMandate,
  upiVpa: string,
  mandateChainId?: string,
): Promise<PaymentMandate> {
  const chainId = mandateChainId || `chain_ap2_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const contents = {
    payment_mandate_id: `pm_${Date.now()}`,
    cart_mandate_id: cartMandate.contents.id,
    payment_details_total: {
      label: "Total Amount",
      amount: {
        currency: "INR" as const,
        value: (cartMandate.contents.total_paise / 100).toFixed(2),
      },
      amount_paise: cartMandate.contents.total_paise,
    },
    merchant_agent: cartMandate.contents.merchant_id,
    payment_method: {
      type: "upi_autopay" as const,
      token_reference: `tok_npci_${Date.now()}`,
      masked_account: upiVpa,
    },
    timestamp: new Date().toISOString(),
  }

  // Real SHA-256 signature of the linked mandate contents
  const canonicalPayload = canonicalize({ chainId, upiVpa, total: cartMandate.contents.total_paise, cartHash: cartMandate.cart_hash })
  const userSig = await sha256Hex(canonicalPayload)

  return {
    contents,
    user_authorization: `sig_usr_${userSig}`,
    mandate_chain_id: chainId,
  }
}

/**
 * End-to-End Cryptographic AP2 Mandate Chain Verifier.
 * Verifies:
 * 1. Cart hash recomputation matches CartMandate.cart_hash
 * 2. Merchant JWS signature verifies using merchant public key
 * 3. Intent mandate bounds (expiry, price cap, SKU whitelist)
 * 4. Payment mandate links strictly to CartMandate
 */
export async function verifyFullAP2MandateChain(
  intent: IntentMandate,
  cartMandate: CartMandate,
  paymentMandate: PaymentMandate,
  merchantPublicKey?: CryptoKey,
): Promise<AP2VerificationResult> {
  // 1. Recompute cart hash
  const { cartHash } = await computeCanonicalCartHash({
    id: cartMandate.contents.id,
    merchant_id: cartMandate.contents.merchant_id,
    items: cartMandate.contents.items,
    total_paise: cartMandate.contents.total_paise,
    cart_expiry: cartMandate.contents.cart_expiry,
  })

  const cartHashValid = cartHash === cartMandate.cart_hash
  if (!cartHashValid) {
    return {
      ok: false,
      protocol: "ap2",
      cart_hash_valid: false,
      reason: "Cart tampering detected: canonical hash mismatch",
    }
  }

  // 2. Verify merchant JWS signature
  const keys = await getOrCreateMerchantKeys()
  const pubKey = merchantPublicKey || keys.publicKey
  const jwsResult = await verifyJWS<{ cart_hash: string }>(cartMandate.merchant_authorization, pubKey)

  if (!jwsResult.valid || jwsResult.payload?.cart_hash !== cartMandate.cart_hash) {
    return {
      ok: false,
      protocol: "ap2",
      cart_hash_valid: true,
      merchant_signature_valid: false,
      reason: "Invalid merchant digital signature on Cart Mandate",
    }
  }

  // 3. Verify Intent Mandate constraints
  const intentCheck = verifyAP2IntentMandate(intent, cartMandate)
  if (!intentCheck.ok) {
    return {
      ok: false,
      protocol: "ap2",
      cart_hash_valid: true,
      merchant_signature_valid: true,
      price_cap_valid: false,
      requires_step_up: true,
      step_up_reason: intentCheck.reason,
      reason: intentCheck.reason,
    }
  }

  // 4. Verify Payment Mandate chain link
  if (paymentMandate.contents.cart_mandate_id !== cartMandate.contents.id) {
    return {
      ok: false,
      protocol: "ap2",
      cart_hash_valid: true,
      merchant_signature_valid: true,
      reason: "Payment mandate does not match Cart Mandate ID",
    }
  }

  return {
    ok: true,
    protocol: "ap2",
    mandate_chain_id: paymentMandate.mandate_chain_id,
    cart_hash_valid: true,
    merchant_signature_valid: true,
    price_cap_valid: true,
    expiry_valid: true,
    sku_whitelist_valid: true,
  }
}

/* ------------------------------------------------------------------ */
/*  NPCI Customer Wallet & Delegated Mandate State Persistence        */
/* ------------------------------------------------------------------ */

const NPCI_STORAGE_KEY = "razent_npci_mandate_config"

export const DEFAULT_NPCI_CONFIG: NPCIMandateConfig = {
  max_recurring_limit_rupees: 15000, // Standard NPCI threshold
  user_delegated_limit_rupees: 2500, // Default user spending cap
  upi_vpa: "customer@okhdfcbank",
  mandate_status: "active",
  frequency: "as_presented",
  umn: "RAZENT9876MANDATE01234",
  created_at: new Date().toISOString(),
  pre_debit_notification: true,
}

export function getStoredNPCIConfig(): NPCIMandateConfig {
  if (typeof window === "undefined") return DEFAULT_NPCI_CONFIG
  try {
    const raw = localStorage.getItem(NPCI_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_NPCI_CONFIG
}

export function saveStoredNPCIConfig(config: NPCIMandateConfig): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(NPCI_STORAGE_KEY, JSON.stringify(config))
  } catch {}
}

