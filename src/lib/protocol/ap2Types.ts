/**
 * Google Agent Payments Protocol (AP2) & Agentic Commerce Protocol (ACP) Type Definitions.
 * Aligned with https://github.com/google-agentic-commerce/AP2 specifications.
 * 
 * Defines the core Mandate primitives for verifiable, autonomous agent-to-agent transactions:
 * 1. IntentMandate - Human delegated purchase authority and constraints
 * 2. CartMandate   - Merchant-signed cart with cryptographic hash and authorization JWT
 * 3. PaymentMandate - Authorized payment instructions linked to payment network / PSP
 */

// ============================================================================
// 1. AP2 MANDATE PRIMITIVES
// ============================================================================

export interface IntentMandate {
  /**
   * If true, human presence/confirmation is required before completing purchase.
   * If false, external AI agent can autonomously purchase within constraints (Human-Not-Present).
   */
  user_cart_confirmation_required: boolean
  /** Natural language description of customer's intent */
  natural_language_description: string
  /** Maximum price cap in paise (e.g. 200000 = ₹2,000). Aligned with NPCI ₹15,000 UPI AutoPay limit */
  price_cap_paise: number
  /** Allowed merchant IDs. If null/empty, any suitable merchant is allowed */
  merchants?: string[]
  /** Specific product SKUs/IDs permitted. If null/empty, any SKU matching description is allowed */
  skus?: string[]
  /** Whether items must be refundable */
  requires_refundability?: boolean
  /** ISO 8601 timestamp when the intent mandate expires */
  intent_expiry: string
  /** Customer/delegator identifier or public key */
  customer_id?: string
  /** Digital signature from customer / trusted surface confirming intent */
  user_signature?: string
}

export interface W3CPaymentItem {
  label: string
  amount: {
    currency: "INR" | "USD"
    value: string // Formatted string, e.g. "1299.00"
  }
  amount_paise: number
}

export interface W3CPaymentMethod {
  supportedMethods: string // e.g. "https://npci.org.in/upi", "cards", "razorpay"
  data?: Record<string, unknown>
}

export interface CartContents {
  /** Unique cart identifier */
  id: string
  /** Whether the merchant demands interactive user confirmation */
  user_cart_confirmation_required: boolean
  /** Items, taxes, delivery fee, and totals */
  items: Array<{
    product_id: string
    title: string
    qty: number
    unit_price_paise: number
    image_url?: string
  }>
  total_paise: number
  currency: "INR"
  merchant_id: string
  merchant_name: string
  /** When this cart quote expires, in ISO 8601 format (typically 15 minutes) */
  cart_expiry: string
  /** Supported payment methods accepted by merchant */
  payment_methods: W3CPaymentMethod[]
}

export interface CartMandate {
  /** Unsigned cart contents */
  contents: CartContents
  /**
   * Base64url-encoded JWT digitally signed by merchant private key.
   * Contains:
   * - iss: Merchant ID
   * - aud: Shopping Agent or Payment Processor
   * - exp: Expiration (15 mins)
   * - cart_hash: SHA-256 hash of canonical JSON CartContents
   */
  merchant_authorization: string
  /** SHA-256 hash of canonical JSON CartContents for instant tampering checks */
  cart_hash: string
}

export interface PaymentMandateContents {
  payment_mandate_id: string
  cart_mandate_id: string
  payment_details_total: W3CPaymentItem
  merchant_agent: string
  /** Chosen payment method details (e.g. UPI VPA token or tokenized card) */
  payment_method: {
    type: "upi_autopay" | "upi_intent" | "card_token" | "razorpay_uap"
    token_reference: string
    masked_account?: string
  }
  timestamp: string
}

export interface PaymentMandate {
  contents: PaymentMandateContents
  /** Cryptographic signature authorizing payment execution */
  user_authorization: string
  /** Complete mandate chain linking IntentMandate -> CartMandate -> PaymentMandate */
  mandate_chain_id: string
}

// ============================================================================
// 2. NPCI & RBI COMPLIANCE SPECIFICATIONS
// ============================================================================

export interface NPCIMandateConfig {
  /** NPCI standard limit: ₹15,000 max without PIN */
  max_recurring_limit_rupees: number
  /** User configured per-transaction cap (e.g. ₹2,000) */
  user_delegated_limit_rupees: number
  /** UPI VPA for pre-authorized debit (e.g. user@okhdfcbank) */
  upi_vpa: string
  /** AutoPay mandate status */
  mandate_status: "active" | "paused" | "revoked"
  /** Frequency allowed */
  frequency: "as_presented" | "daily" | "weekly" | "monthly"
  /** UMN: Unique Mandate Number issued by NPCI */
  umn: string
  /** Created timestamp */
  created_at: string
  /** 24h pre-debit SMS/push notification opt-in */
  pre_debit_notification: boolean
}

// ============================================================================
// 3. A2A & ACP WIRE PROTOCOL FORMATS
// ============================================================================

export interface A2AAgentManifest {
  name: string
  description: string
  protocol_version: string
  protocols_supported: Array<"acp" | "ap2" | "ncpi_uap" | "x402">
  endpoints: {
    acp_catalog: string
    acp_cart: string
    ap2_mandate: string
    a2a_chat: string
  }
  merchant: {
    id: string
    business_name: string
    currency: "INR"
    npc_registered: boolean
    public_key_pem?: string
  }
}

export interface ACPCatalogQuery {
  query: string
  category?: string
  max_price_paise?: number
  in_stock_only?: boolean
  limit?: number
}

export interface ACPCatalogResponse {
  protocol: "acp"
  products: Array<{
    id: string
    title: string
    description: string
    price_paise: number
    currency: "INR"
    category: string
    stock: number
    image_url: string
    in_stock: boolean
  }>
  total_matches: number
}
