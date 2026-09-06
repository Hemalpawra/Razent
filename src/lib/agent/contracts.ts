import { z } from "zod"
import type { Product } from "@/lib/types/product"
import type { Order } from "@/lib/types/order"

export type ToolCallerRole = "customer" | "merchant" | "system"
export type ToolMutability = "read-only" | "write"

/**
 * 1. searchCatalog Tool Contract
 * Mutability: read-only
 * Caller: customer | merchant
 */
export const SearchCatalogInputSchema = z.object({
  query: z.string().optional().describe("Free text search query or keywords"),
  category: z.string().optional().describe("Optional product category filter"),
  maxPricePaise: z.number().int().positive().optional().describe("Upper price limit in paise"),
  inStockOnly: z.boolean().default(true).describe("Filter only active in-stock items"),
  limit: z.number().int().min(1).max(20).default(6).describe("Maximum items to return"),
})
export type SearchCatalogInput = z.infer<typeof SearchCatalogInputSchema>

export interface SearchCatalogOutput {
  success: boolean
  count: number
  products: Product[]
  queryApplied: {
    query?: string
    category?: string
    maxPricePaise?: number
  }
}

/**
 * 2. queryStoreData Tool Contract (Natural Language DB Query)
 * Mutability: read-only
 * Caller: customer (scoped to public/own data) | merchant (full analytics)
 */
export const QueryStoreDataInputSchema = z.object({
  intent: z.enum([
    "catalog_stats",
    "low_stock_alerts",
    "category_breakdown",
    "order_summary",
    "customer_recent_orders",
  ]),
  filter: z.record(z.string(), z.any()).optional(),
  requesterRole: z.enum(["customer", "merchant"]).default("customer"),
  requesterId: z.string().optional().describe("Customer session/phone or merchant ID for tenancy isolation"),
})
export type QueryStoreDataInput = z.infer<typeof QueryStoreDataInputSchema>

export interface QueryStoreDataOutput {
  success: boolean
  intent: string
  data: Record<string, any>
  restricted: boolean
}

/**
 * 3. createAP2Mandate Tool Contract
 * Mutability: write
 * Caller: customer | system
 */
export const CreateAP2MandateInputSchema = z.object({
  totalPaise: z.number().int().positive().describe("Total cart or item amount in paise"),
  scope: z.enum(["one_time", "recurring"]).default("one_time"),
  payerAccount: z.string().describe("UPI VPA or tokenized card reference"),
  cartHash: z.string().describe("Cryptographic SHA-256 hash of ordered items"),
  delegatedCapPaise: z.number().int().positive().describe("Customer's configured AutoPay max cap in paise"),
})
export type CreateAP2MandateInput = z.infer<typeof CreateAP2MandateInputSchema>

export interface CreateAP2MandateOutput {
  success: boolean
  mandateChainId: string
  status: "created" | "exceeds_cap" | "requires_step_up"
  amountPaise: number
  capPaise: number
}

/**
 * 4. verifyMandate Tool Contract
 * Mutability: read-only
 * Caller: customer | system
 */
export const VerifyMandateInputSchema = z.object({
  mandateChainId: z.string(),
  amountPaise: z.number().int().positive(),
  userDelegatedLimitPaise: z.number().int().positive(),
})
export type VerifyMandateInput = z.infer<typeof VerifyMandateInputSchema>

export interface VerifyMandateOutput {
  verified: boolean
  mandateChainId: string
  reason: "approved" | "exceeds_limit" | "invalid_mandate_id"
  requiresHumanApproval: boolean
}

/**
 * 5. createOrder Tool Contract (Prepare / Execute Order)
 * Mutability: write
 * Caller: customer
 */
export const CreateOrderInputSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      qty: z.number().int().positive(),
    })
  ).min(1),
  shippingAddress: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(10),
    email: z.string().email(),
    line1: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(6),
    country: z.string().default("India"),
    phoneVerified: z.boolean().default(false),
  }),
  paymentMethod: z.enum(["razorpay_checkout", "ap2_autopay"]),
  mandateId: z.string().optional(),
  conversationId: z.string().optional(),
})
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>

export interface CreateOrderOutput {
  success: boolean
  orderId?: string
  totalPaise?: number
  phoneVerified: boolean
  status: "pending_payment" | "pending_otp" | "failed" | "paid"
  errorMessage?: string
}

/**
 * 6. trackOrder Tool Contract
 * Mutability: read-only
 * Caller: customer | merchant
 */
export const TrackOrderInputSchema = z.object({
  orderId: z.string().min(1).describe("Order identifier (e.g. RAZ-XXXX)"),
  mobile: z.string().describe("Mobile number for 3-factor verification"),
  email: z.string().describe("Email address for 3-factor verification"),
  isMerchantAdmin: z.boolean().default(false).describe("If true, merchant bypasses customer 3-factor check"),
})
export type TrackOrderInput = z.infer<typeof TrackOrderInputSchema>

export interface TrackOrderOutput {
  found: boolean
  order?: Order
  errorReason?: string
}

/**
 * 7. logAuditEvent Tool Contract
 * Mutability: write
 * Caller: system | customer | merchant
 */
export const LogAuditEventInputSchema = z.object({
  sessionId: z.string(),
  orderId: z.string().nullable().optional(),
  eventType: z.string(),
  actor: z.enum(["customer", "AI Assistant", "merchant", "system"]),
  source: z.enum(["store", "AI Agent", "AI Assistant", "Razorpay", "NPCI UAP", "system"]),
  result: z.enum(["Success", "Warning", "Failed", "Critical"]),
  payloadSummary: z.string(),
  statusCode: z.number().int().default(200),
  metadata: z.record(z.string(), z.string()).optional(),
})
export type LogAuditEventInput = z.infer<typeof LogAuditEventInputSchema>

export interface LogAuditEventOutput {
  logged: boolean
  eventId: string
  timestamp: string
}
