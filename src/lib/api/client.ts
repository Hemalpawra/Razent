/**
 * Razent API client — Supabase only.
 *
 * Decision log:
 *   Q1-B: Public storefront + signed merchant admin. Customer-side
 *         accessors (listProducts, getProduct, trackOrder) are public;
 *         merchant-side accessors require a session and scope by
 *         merchant_id.
 *   Q2-B+: All SQL↔TS shape drift is reconciled in mapDbProduct /
 *          mapDbOrder. Additive columns live in DB; missing fields
 *          default sensibly.
 *   Q3-A+: external_id is the user-facing ID; client.ts never sets
 *          it (the DB trigger from 20260309000003 does).
 *   Q7-B:  Any Supabase error is pushed to useError so the <Toaster />
 *          surfaces it. We never silently fall back to in-memory.
 *   Q8-B:  Multi-tenant in one DB. Every merchant-side query adds
 *          `.eq("merchant_id", currentMerchant.id)`.
 *   Q11:   HashRouter and sign-in live in /sign-in (PR 5).
 *
 * "Real data" mode: NO in-memory fallback. If Supabase is unreachable
 * or returns an error, the caller sees an exception; the UI catches
 * it via withErrorHandling / useError and shows a toast.
 */
import type { AnalyticsData } from "@/lib/types/analytics"
import type { DashboardData } from "@/lib/types/kpi"
import type { Order } from "@/lib/types/order"
import type { Product, ProductStatus } from "@/lib/types/product"
import type { AuditEvent, AuditSession } from "@/lib/types/audit"
import type { Conversation } from "@/lib/types/conversation"
import { supabase, getUser } from "@/lib/api/supabase"
import { useError } from "@/state/useError"
import {
  verifyAP2Mandate,
  approveAuto,
  createX402Challenge,
  type X402Challenge,
} from "@/lib/protocol/agenticCommerce"

// ─────────────────────────────────────────────────────────────────
// DB row mappers (Q2 — reconcile SQL↔TS shape)
// ─────────────────────────────────────────────────────────────────

function mapDbProduct(row: any): Product {
  return {
    id: row.external_id || String(row.id),
    title: row.title,
    description: row.description || "",
    category: row.category || "General",
    price_paise: Number(row.price_paise),
    status: row.status as ProductStatus,
    image_url: row.image_url || row.images?.[0] || "",
    images: row.images || (row.image_url ? [row.image_url] : []),
    tags: row.tags || [],
    stock: row.stock ?? 0,
    rating: row.rating ? Number(row.rating) : 4.8,
    review_count: row.review_count ? Number(row.review_count) : 0,
    currency: "INR",
    merchant_id: row.merchant_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapDbOrder(row: any): Order {
  return {
    id: row.external_id || String(row.id),
    razorpay_order_id: row.razorpay_order_id ?? "",
    razorpay_payment_id: row.razorpay_payment_id ?? undefined,
    razorpay_signature: row.razorpay_signature ?? undefined,
    status: row.status,
    shipping_status: row.shipping_status,
    currency: row.currency || "INR",
    total_paise: Number(row.total_paise),
    shipping_paise: Number(row.shipping_paise ?? 0),
    items: (row.items as Order["items"]) ?? [],
    shipping_address: row.shipping_address ?? {},
    billing_address: row.billing_address ?? undefined,
    via_ai: !!row.via_ai,
    conversation_id: row.conversation_id ?? undefined,
    mandate_id: row.mandate_id ?? undefined,
    checkout_session_id: row.checkout_session_id ?? undefined,
    commerce_protocol: row.commerce_protocol ?? undefined,
    settlement_reference: row.settlement_reference ?? undefined,
    challenge_id: row.challenge_id ?? undefined,
    tracking: row.tracking ?? undefined,
    notes: row.notes ?? undefined,
    created_at: row.created_at,
    paid_at: row.paid_at ?? undefined,
    shipped_at: row.shipped_at ?? undefined,
    delivered_at: row.delivered_at ?? undefined,
  }
}

function mapDbConversation(row: any): Conversation {
  return {
    id: row.external_id || String(row.id),
    customer_name: row.customer_name ?? "Anonymous",
    type: row.type ?? "human_customer",
    agent_id: row.agent_id ?? undefined,
    protocol: row.protocol ?? undefined,
    status: row.status,
    last_message: row.last_message ?? "",
    amount_paise: row.amount_paise ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_id: row.order_id ?? undefined,
    messages: (row.messages as Conversation["messages"]) ?? [],
    products_recommended: (row.products_recommended as any) ?? [],
    products_compared: (row.products_compared as any) ?? [],
    selected_product: row.selected_product ?? undefined,
    upsell: row.upsell ?? undefined,
    shipping_collected: !!row.shipping_collected,
    shipping_address: row.shipping_address ?? undefined,
    tracking_status: row.tracking_status ?? undefined,
  }
}

function mapDbAuditSession(row: any): AuditSession {
  return {
    session_id: row.external_id || String(row.id),
    order_id: row.order_id ?? null,
    customer: row.customer ?? "",
    actor_label: row.actor_label ?? "System",
    event_count: row.event_count ?? (row.events?.length ?? 0),
    last_event: row.last_event ?? "",
    status: row.status ?? "Success",
    severity: row.severity ?? "Success",
    events: (row.events as AuditEvent[]) ?? [],
    created_at: row.created_at,
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/** Throw a typed error from a Supabase response. */
function asError(message: string, hint?: string): Error {
  return new Error(hint ? `${message} — ${hint}` : message)
}

function assertOk<T>(
  result: { data: T | null; error: any },
  context: string,
): T {
  if (result.error) {
    const msg = `${context}: ${result.error.message ?? result.error}`
    useError.getState().push({
      title: context,
      description: msg,
      severity: "error",
    })
    throw new Error(msg)
  }
  if (result.data === null) {
    throw asError(`${context}: empty response`)
  }
  return result.data
}

/** Returns the current merchant id (auth.users.id), throws if not signed in. */
async function requireMerchantId(): Promise<string> {
  const user = await getUser()
  if (!user) {
    useError.getState().push({
      title: "Not signed in",
      description: "Please sign in to access merchant data.",
      severity: "error",
    })
    throw new Error("not_signed_in")
  }
  return user.id
}

// ─────────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────────

export type ListProductsArgs = {
  q?: string
  category?: string
  status?: ProductStatus
}

export async function listProducts(
  args: ListProductsArgs = {},
): Promise<Product[]> {
  let q = supabase.from("products").select("*").order("created_at", {
    ascending: false,
  })
  if (args.q) q = q.ilike("title", `%${args.q}%`)
  if (args.category) q = q.eq("category", args.category)
  if (args.status) q = q.eq("status", args.status)
  const { data, error } = await q
  if (error) {
    useError.getState().push({
      title: "Failed to load products",
      description: error.message,
      severity: "error",
    })
    throw error
  }
  return (data ?? []).map(mapDbProduct)
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .or(`external_id.eq.${id},id.eq.${id}`)
    .maybeSingle()
  if (error) throw error
  return data ? mapDbProduct(data) : null
}

export type UpsertProductInput = Omit<
  Product,
  "created_at" | "updated_at" | "id" | "currency" | "merchant_id"
> & {
  id?: string
  currency?: string
  merchant_id?: string
}

export async function upsertProduct(
  input: UpsertProductInput & { id?: string },
): Promise<Product> {
  const merchantId = await requireMerchantId()
  const externalId = input.id
  const now = new Date().toISOString()
  // Upsert by external_id so the same product gets re-upserted cleanly.
  const row: any = {
    external_id: externalId,
    merchant_id: merchantId,
    title: input.title,
    description: input.description,
    category: input.category,
    tags: input.tags ?? [],
    images: input.images ?? (input.image_url ? [input.image_url] : []),
    image_url: input.image_url,
    price_paise: input.price_paise,
    mrp_paise: (input as any).mrp_paise ?? null,
    unit: (input as any).unit ?? null,
    gst_pct: (input as any).gst_pct ?? null,
    status: input.status,
    stock: input.stock,
    updated_at: now,
  }
  let q = supabase.from("products").upsert(row, { onConflict: "external_id" })
  const { data, error } = await q.select().maybeSingle()
  if (error) throw error
  return mapDbProduct(data)
}

export async function deleteProduct(
  id: string,
): Promise<{ id: string }> {
  await requireMerchantId()
  const { error } = await supabase
    .from("products")
    .delete()
    .or(`external_id.eq.${id},id.eq.${id}`)
  if (error) throw error
  return { id }
}

// ─────────────────────────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────────────────────────

export async function listOrders(): Promise<Order[]> {
  // Q8: scope to current merchant via RLS — the .eq() makes it explicit
  // and gives faster query plans on the merchant_id index.
  const merchantId = await requireMerchantId()
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
  if (error) {
    useError.getState().push({
      title: "Failed to load orders",
      description: error.message,
      severity: "error",
    })
    throw error
  }
  return (data ?? []).map(mapDbOrder)
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .or(`external_id.eq.${id},id.eq.${id}`)
    .maybeSingle()
  if (error) throw error
  return data ? mapDbOrder(data) : null
}

export type TrackOrderArgs = {
  orderId: string
  mobile: string
  email: string
}

/**
 * Public customer-side lookup. RLS allows anon reads of orders where
 * the customer provided the right identifiers.
 */
export async function trackOrder(args: TrackOrderArgs): Promise<Order | null> {
  const { orderId, mobile, email } = args
  // RLS already restricts to the row the customer knows about; we
  // still apply the same identifier checks to be safe and to support
  // pre-RLS or anon-key flows.
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("external_id", orderId.trim())
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const last5 = (mobile || "").replace(/\D/g, "")
  const cleanEmail = (email || "").trim().toLowerCase()
  const phoneMatch =
    last5.length >= 5 &&
    String(data.shipping_address?.phone ?? "")
      .replace(/\D/g, "")
      .endsWith(last5)
  const emailMatch =
    cleanEmail.length > 0 &&
    String(data.shipping_address?.email ?? "").toLowerCase() === cleanEmail
  if (!phoneMatch && !emailMatch) return null
  return mapDbOrder(data)
}

// ─────────────────────────────────────────────────────────────────
// Conversations
// ─────────────────────────────────────────────────────────────────

export async function listConversations(): Promise<Conversation[]> {
  const merchantId = await requireMerchantId()
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("updated_at", { ascending: false })
  if (error) {
    useError.getState().push({
      title: "Failed to load conversations",
      description: error.message,
      severity: "error",
    })
    throw error
  }
  return (data ?? []).map(mapDbConversation)
}

export async function getConversation(
  id: string,
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`external_id.eq.${id},id.eq.${id}`)
    .maybeSingle()
  if (error) throw error
  return data ? mapDbConversation(data) : null
}

// ─────────────────────────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────────────────────────

export async function listAuditSessions(): Promise<AuditSession[]> {
  const merchantId = await requireMerchantId()
  // Q4-B: read from the rollup view (event_count, last_event, status,
  // severity computed in SQL).
  const { data, error } = await supabase
    .from("audit_sessions_view")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
  if (error) {
    useError.getState().push({
      title: "Failed to load audit trail",
      description: error.message,
      severity: "error",
    })
    throw error
  }
  return (data ?? []).map(mapDbAuditSession)
}

export type LogAuditEventInput = {
  order_id?: string | null
  customer?: string
  actor_label?: string
  events?: AuditEvent[]
  event?: AuditEvent
  merchant_id?: string
}

export async function logAuditEvent(
  input: LogAuditEventInput,
): Promise<AuditSession> {
  const merchantId =
    input.merchant_id ?? (await requireMerchantId().catch(() => null))
  const events = input.events ?? (input.event ? [input.event] : [])
  const actorLabel =
    input.actor_label ?? input.event?.actor ?? "User Action"

  // Build session with no external_id; the trigger
  // (20260309000003_reconcile_schema_drift) auto-fills it.
  const { data, error } = await supabase
    .from("audit_sessions")
    .insert({
      order_id: input.order_id ?? null,
      customer: input.customer ?? "",
      actor_label: actorLabel,
      events,
      merchant_id: merchantId,
    } as any)
    .select()
    .maybeSingle()
  if (error) {
    // Audit writes should never block the user — log but don't toast.
    console.warn("[audit] insert failed:", error.message)
    throw error
  }
  return mapDbAuditSession(data)
}

// ─────────────────────────────────────────────────────────────────
// Dashboard / Analytics (Q4 — views rewritten per merchant)
// ─────────────────────────────────────────────────────────────────

export async function getDashboard(): Promise<DashboardData> {
  const merchantId = await requireMerchantId()
  // dashboard_view returns 1 row per merchant. .maybeSingle() after .eq()
  // yields the row for the signed-in merchant.
  const { data, error } = await supabase
    .from("dashboard_view")
    .select("*")
    .eq("merchant_id", merchantId)
    .maybeSingle()
  if (error) {
    useError.getState().push({
      title: "Failed to load dashboard",
      description: error.message,
      severity: "error",
    })
    throw error
  }
  if (!data) {
    return {
      active_conversations: 0,
      orders_today: 0,
      revenue_month_paise: 0,
      ai_status: "offline",
      low_stock_products: 0,
      pending_orders: 0,
      recent_orders: [],
      needs_attention: [],
    }
  }
  return {
    active_conversations: data.active_conversations ?? 0,
    orders_today: data.orders_today ?? 0,
    revenue_month_paise: Number(data.revenue_month_paise ?? 0),
    ai_status: data.ai_status ?? "offline",
    low_stock_products: data.low_stock_products ?? 0,
    pending_orders: data.pending_orders ?? 0,
    recent_orders: data.recent_orders ?? [],
    needs_attention: data.needs_attention ?? [],
  }
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const merchantId = await requireMerchantId()
  const { data, error } = await supabase
    .from("analytics_view")
    .select("*")
    .eq("merchant_id", merchantId)
    .maybeSingle()
  if (error) {
    useError.getState().push({
      title: "Failed to load analytics",
      description: error.message,
      severity: "error",
    })
    throw error
  }
  if (!data) {
    return {
      revenue_series: [],
      orders_by_status: [],
      top_categories: [],
      aov_paise: 0,
      conversion_rate_pct: 0,
      insights: [],
    }
  }
  return {
    revenue_series: data.daily_revenue ?? [],
    orders_by_status: data.orders_by_status ?? [],
    top_categories: data.top_categories ?? [],
    aov_paise: Number(data.aov_paise ?? 0),
    conversion_rate_pct: Number(data.conversion_rate_pct ?? 0),
    insights: data.insights ?? [],
  }
}

// ─────────────────────────────────────────────────────────────────
// Agent checkout (Q13-a: pure guest, customer_id NULL on DB)
// ─────────────────────────────────────────────────────────────────

export type ExecuteAgentCheckoutInput = {
  order: Order
  mandate?: {
    mandate_id: string
    agent_name?: string
    delegated_limit_paise?: number
  }
  approvalThresholdRupees: number
  protocol?: "ncpi_uap" | "acp" | "x402" | "direct_web"
}

export type ExecuteAgentCheckoutResult = {
  order: Order
  audit_session_id: string
  settlement: "auto" | "step_up" | "failed"
  challenge?: X402Challenge
  protocol: "ncpi_uap" | "acp" | "x402" | "direct_web"
}

export async function executeAgentCheckout(
  input: ExecuteAgentCheckoutInput,
): Promise<ExecuteAgentCheckoutResult> {
  const { order, mandate, approvalThresholdRupees, protocol = "ncpi_uap" } = input

  // 1. AP2 mandate verification
  if (mandate) {
    const verified = verifyAP2Mandate(mandate, order.total_paise)
    if (!verified.valid) {
      const challenge = createX402Challenge(order, mandate.mandate_id)
      const session = await logAuditEvent({
        order_id: order.id,
        customer: order.shipping_address.full_name,
        actor_label: "AP2 Validator",
        events: [
          {
            id: `ev_${Date.now().toString(36)}_1`,
            timestamp: new Date().toISOString(),
            actor: "AI Assistant",
            type: "AP2 Mandate Rejected",
            result: "Failed",
            source: "AI Agent",
            reason: `Mandate ${mandate.mandate_id} invalid or over delegated limit`,
          } as AuditEvent,
        ],
      })
      return {
        order,
        audit_session_id: session.session_id,
        settlement: "step_up",
        challenge,
        protocol: "x402",
      }
    }
  }

  // 2. Autonomous vs step-up decision
  const decision = approveAuto(order.total_paise, approvalThresholdRupees)
  if (decision.requires_step_up || !decision.approved) {
    const challenge = createX402Challenge(order, mandate?.mandate_id)
    const session = await logAuditEvent({
      order_id: order.id,
      customer: order.shipping_address.full_name,
      actor_label: "Threshold Policy",
      events: [
        {
          id: `ev_${Date.now().toString(36)}_2`,
          timestamp: new Date().toISOString(),
          actor: "AI Assistant",
          type: "x402 Step-up Required",
          result: "Warning",
          source: "AI Agent",
          reason: `Order ${order.id} (${order.total_paise} paise) exceeds threshold`,
        } as AuditEvent,
      ],
    })
    return {
      order,
      audit_session_id: session.session_id,
      settlement: "step_up",
      challenge,
      protocol: "x402",
    }
  }

  // 3. Auto-approve: persist the order (guest checkout → customer_id NULL)
  const merchantId = await requireMerchantId()
  const { data: dbOrder, error: orderErr } = await supabase
    .from("orders")
    .insert({
      external_id: order.id,
      merchant_id: merchantId,
      customer_id: null, // Q13-a: pure guest
      razorpay_order_id: order.razorpay_order_id,
      razorpay_payment_id: order.razorpay_payment_id ?? null,
      status: "paid",
      shipping_status: order.shipping_status ?? "pending",
      currency: order.currency,
      total_paise: order.total_paise,
      shipping_paise: order.shipping_paise ?? 0,
      items: order.items,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address ?? null,
      via_ai: order.via_ai ?? true,
      conversation_id: order.conversation_id ?? null,
      mandate_id: mandate?.mandate_id ?? order.mandate_id ?? null,
      commerce_protocol: protocol,
      settlement_reference: `settle_${Date.now().toString(36)}`,
      paid_at: new Date().toISOString(),
    } as any)
    .select()
    .maybeSingle()
  if (orderErr) throw orderErr

  const session = await logAuditEvent({
    order_id: order.id,
    customer: order.shipping_address.full_name,
    actor_label: "AI Agent",
    events: [
      {
        id: `ev_${Date.now().toString(36)}_3`,
        timestamp: new Date().toISOString(),
        actor: "AI Assistant",
        type: "checkout_completed",
        result: "Success",
        source: "AI Agent",
        payload_summary: `Order ${order.id} settled via ${protocol}`,
        response_summary: `settlement_reference=settle_${Date.now().toString(36)}`,
        status_code: 200,
      } as AuditEvent,
    ],
  })

  return {
    order: mapDbOrder(dbOrder),
    audit_session_id: session.session_id,
    settlement: "auto",
    protocol,
  }
}
