export type Currency = "INR"

export type OrderStatus = "created" | "paid" | "failed" | "refunded"

export type ShippingStatus = "pending" | "packed" | "shipped" | "out_for_delivery" | "delivered" | "returned"

export type CommerceProtocol = "ncpi_uap" | "acp" | "ap2" | "x402" | "direct_web"

export type OrderItem = {
  product_id: string
  title: string
  image_url: string
  qty: number
  /** Price per unit, in paise. */
  unit_price_paise: number
}

export type Address = {
  full_name: string
  phone: string
  email: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  country: string
  phone_verified?: boolean
  phone_verified_at?: string
}

export type Order = {
  id: string
  /** Razorpay order id (rzp_…) — generated server-side when the order is created. */
  razorpay_order_id: string
  /** Razorpay payment id (pay_…) — populated after successful payment. */
  razorpay_payment_id?: string
  /** Razorpay webhook signature for idempotent verification. */
  razorpay_signature?: string
  status: OrderStatus
  shipping_status: ShippingStatus
  currency: Currency
  /** Total amount in paise, including shipping. */
  total_paise: number
  shipping_paise: number
  items: OrderItem[]
  shipping_address: Address
  billing_address?: Address
  /** True if the order was created via the AI assistant (vs the storefront). */
  via_ai: boolean
  conversation_id?: string
  mandate_id?: string
  checkout_session_id?: string
  settlement_reference?: string
  challenge_id?: string
  commerce_protocol?: CommerceProtocol
  phone_verified?: boolean
  phone_verified_at?: string
  created_at: string
  paid_at?: string
  shipped_at?: string
  delivered_at?: string
  tracking?: {
    carrier: string
    tracking_number: string
    /** Demo-only simulated timeline. Real carrier integration is out of scope (AI_RULES §5). */
    events: { at: string; status: string; location: string }[]
  }
  notes?: string
}

export function formatPrice(paise: number, currency: "INR" = "INR"): string {
  const rupees = paise / 100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(rupees)
}
