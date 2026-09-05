/**
 * Universal Agent-to-Agent (A2A) Commerce Router & Handler
 * Implements Google AP2 (Agent Payments Protocol) & ACP (Agent Commerce Protocol).
 *
 * Provides standardized endpoints for external AI agents (ChatGPT, Claude, Gemini, Grok)
 * to discover products, negotiate cart mandates, and execute cryptographic purchases.
 */

import { listProducts, executeAgentCheckout } from "@/lib/api/client"
import {
  createAP2CartMandate,
  createAP2CartMandateFromItems,
  createAP2PaymentMandate,
  verifyAP2IntentMandate,
  getStoredNPCIConfig,
} from "@/lib/protocol/agenticCommerce"
import type {
  A2AAgentManifest,
  ACPCatalogQuery,
  ACPCatalogResponse,
  CartMandate,
  IntentMandate,
  PaymentMandate,
} from "@/lib/protocol/ap2Types"

export const A2A_MANIFEST: A2AAgentManifest = {
  name: "Razent Quick Commerce Agent",
  description:
    "Universal agentic commerce endpoint for 10-15 min grocery delivery. Supports ACP catalog discovery, Google AP2 cryptographic mandate verification, and NPCI UPI AutoPay settlement.",
  protocol_version: "1.0.0",
  protocols_supported: ["acp", "ap2", "ncpi_uap", "x402"],
  endpoints: {
    acp_catalog: "/api/a2a/acp/catalog",
    acp_cart: "/api/a2a/acp/cart",
    ap2_mandate: "/api/a2a/ap2/mandate",
    a2a_chat: "https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/ragent-chat",
  },
  merchant: {
    id: "merchant_one_razent",
    business_name: "Merchant One (Razent Quick Commerce)",
    currency: "INR",
    npc_registered: true,
  },
}

/**
 * Handles ACP Catalog Search from external or internal agents.
 */
export async function handleACPCatalogQuery(
  params: ACPCatalogQuery,
): Promise<ACPCatalogResponse> {
  const allProducts = await listProducts().catch(() => [])
  let filtered = allProducts.filter((p) => p.status === "active")

  if (params.category) {
    filtered = filtered.filter(
      (p) => p.category.toLowerCase() === params.category!.toLowerCase(),
    )
  }

  if (params.query && params.query.trim()) {
    const q = params.query.toLowerCase().trim()
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }

  if (params.max_price_paise) {
    filtered = filtered.filter((p) => p.price_paise <= params.max_price_paise!)
  }

  if (params.in_stock_only) {
    filtered = filtered.filter((p) => p.stock > 0)
  }

  const limit = params.limit || 10
  const results = filtered.slice(0, limit)

  return {
    protocol: "acp",
    total_matches: filtered.length,
    products: results.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description || "",
      price_paise: p.price_paise,
      currency: "INR",
      category: p.category,
      stock: p.stock,
      image_url: p.image_url,
      in_stock: p.stock > 0,
    })),
  }
}

/**
 * Creates an authorized AP2 Cart Mandate for requested items.
 */
export async function handleAP2CreateCartMandate(
  items: Array<{ product_id: string; qty: number }>,
): Promise<CartMandate> {
  const allProducts = await listProducts().catch(() => [])
  const cartItems = items
    .map((item) => {
      const prod = allProducts.find((p) => p.id === item.product_id)
      if (!prod) return null
      return {
        id: prod.id,
        title: prod.title,
        price_paise: prod.price_paise,
        qty: item.qty,
        image_url: prod.image_url,
      }
    })
    .filter(Boolean) as Array<{
    id: string
    title: string
    price_paise: number
    qty: number
    image_url?: string
  }>

  if (cartItems.length === 0) {
    throw new Error("No valid products provided for Cart Mandate")
  }

  return createAP2CartMandateFromItems(cartItems)
}

/**
 * Validates AP2 Mandate Chain and executes autonomous order settlement.
 */
export async function handleAP2VerifyAndCheckout(params: {
  intent: IntentMandate
  cartMandate: CartMandate
  upiVpa?: string
  customerProfile?: {
    fullName: string
    phone: string
    email: string
    address: string
  }
}) {
  const npciConfig = getStoredNPCIConfig()
  const upiVpa = params.upiVpa || npciConfig.upi_vpa

  // 1. Verify Intent vs Cart Mandate constraints
  const verification = verifyAP2IntentMandate(params.intent, params.cartMandate)
  if (!verification.ok) {
    return {
      success: false,
      error: verification.reason,
      status_code: 400,
    }
  }

  // 2. Form Payment Mandate
  const paymentMandate: PaymentMandate = createAP2PaymentMandate(
    params.cartMandate,
    upiVpa,
  )

  // 3. Customer details
  const cust = params.customerProfile || {
    fullName: "Autonomous Agent Customer",
    phone: "+91 98765 43210",
    email: "agent@razent.store",
    address: "Indiranagar 100ft Rd, Bengaluru",
  }

  const orderId = `RAZ-A2A-${Date.now().toString(36).toUpperCase()}`

  // 4. Execute checkout via client
  const checkoutResult = await executeAgentCheckout({
    order: {
      id: orderId,
      razorpay_order_id: `rzp_order_${Date.now()}`,
      total_paise: params.cartMandate.contents.total_paise,
      shipping_paise: 0,
      shipping_status: "pending",
      currency: "INR",
      status: "paid",
      items: params.cartMandate.contents.items.map((i) => ({
        product_id: i.product_id,
        title: i.title,
        image_url: i.image_url || "",
        qty: i.qty,
        unit_price_paise: i.unit_price_paise,
      })),
      shipping_address: {
        full_name: cust.fullName,
        phone: cust.phone,
        email: cust.email,
        line1: cust.address,
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038",
        country: "India",
      },
      via_ai: true,
      commerce_protocol: "ap2",
      mandate_id: paymentMandate.mandate_chain_id,
      created_at: new Date().toISOString(),
    },
    mandate: {
      mandate_id: paymentMandate.mandate_chain_id,
      agent_name: "External AI Agent (AP2)",
      delegated_limit_paise: npciConfig.user_delegated_limit_rupees * 100,
    },
    approvalThresholdRupees: npciConfig.max_recurring_limit_rupees,
  })

  return {
    success: true,
    order: checkoutResult.order,
    mandate_chain_id: paymentMandate.mandate_chain_id,
    cart_hash: params.cartMandate.cart_hash,
    protocol: "ap2",
    settlement: checkoutResult.settlement,
  }
}
