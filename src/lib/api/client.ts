/**
 * Single API surface for the merchant dashboard AND storefront. Backed by
 * either Supabase (when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set)
 * or an in-memory store seeded from lib/mock/* (fallback for local dev).
 *
 * Call sites never change when the backend is wired up.
 */
import { mockAnalytics } from "@/lib/mock/analytics"
import { mockDashboard } from "@/lib/mock/kpis"
import type { AnalyticsData } from "@/lib/types/analytics"
import type { DashboardData } from "@/lib/types/kpi"
import type { Order } from "@/lib/types/order"
import type { Product, ProductStatus } from "@/lib/types/product"
import type { AuditEvent, AuditSession } from "@/lib/types/audit"
import type { Conversation } from "@/lib/types/conversation"
import { supabase, isSupabaseEnabled } from "@/lib/api/supabase"
import { productStore } from "@/lib/storage/productStore"
import { orderStore } from "@/lib/storage/orderStore"
import { conversationStore } from "@/lib/storage/conversationStore"
import { auditStore } from "@/lib/storage/auditStore"
import {
  verifyAP2Mandate,
  approveAuto,
  processUAPTransaction,
  createX402Challenge,
  type CommerceProtocol,
  type X402Challenge,
} from "@/lib/protocol/agenticCommerce"

// --- DB Row Mappers (reconciling SQL ↔ TypeScript models) -----------------

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
    razorpay_order_id: row.razorpay_order_id,
    razorpay_payment_id: row.razorpay_payment_id,
    status: row.status,
    shipping_status: row.shipping_status,
    currency: row.currency || "INR",
    total_paise: Number(row.total_paise),
    shipping_paise: Number(row.shipping_paise || 0),
    items: row.items || [],
    shipping_address: row.shipping_address || {},
    billing_address: row.billing_address,
    via_ai: Boolean(row.via_ai),
    conversation_id: row.conversation_id,
    mandate_id: row.mandate_id,
    checkout_session_id: row.checkout_session_id,
    notes: row.notes,
    created_at: row.created_at,
    paid_at: row.paid_at,
    shipped_at: row.shipped_at,
    delivered_at: row.delivered_at,
  }
}

function mapDbConversation(row: any): Conversation {
  return {
    id: row.external_id || String(row.id),
    customer_name: row.customer_name || "Customer",
    type: row.type || "human_customer",
    agent_id: row.agent_id,
    protocol: row.protocol,
    status: row.status,
    last_message: row.last_message || "",
    amount_paise: row.amount_paise ? Number(row.amount_paise) : undefined,
    messages: row.messages || [],
    products_recommended: row.products_recommended || [],
    products_compared: row.products_compared || [],
    shipping_collected: Boolean(row.shipping_collected),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapDbAuditSession(row: any): AuditSession {
  const events: AuditEvent[] = Array.isArray(row.events) ? row.events : []
  const lastEv = events.length > 0 ? events[events.length - 1] : null
  return {
    session_id: row.external_id || String(row.id),
    order_id: row.order_id,
    customer: row.customer,
    actor_label: row.actor_label,
    last_event: row.last_event || (lastEv ? `${lastEv.actor} · ${lastEv.type}` : "Session Started"),
    event_count: row.event_count || events.length || 1,
    status: row.status || (events.some((e: any) => e.result === "Failed") ? "Failed" : "Success"),
    severity: (row.severity as any) || "low",
    created_at: row.created_at,
    events,
  }
}

// --- Products --------------------------------------------------------------

export type ListProductsArgs = {
  q?: string
  category?: string
  status?: ProductStatus
}

export async function listProducts(
  args: ListProductsArgs = {},
): Promise<Product[]> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) {
      const mapped = (data as any[]).map(mapDbProduct)
      return applyProductFilter(mapped, args)
    }
  }
  await delay(60)
  return applyProductFilter(productStore.list(), args)
}

function applyProductFilter(rows: Product[], args: ListProductsArgs): Product[] {
  const { q, category, status } = args
  return rows.filter((p) => {
    if (status && p.status !== status) return false
    if (category && p.category !== category) return false
    if (q) {
      const needle = q.toLowerCase()
      if (
        !p.title.toLowerCase().includes(needle) &&
        !p.description.toLowerCase().includes(needle) &&
        !p.tags.some((t) => t.toLowerCase().includes(needle))
      ) {
        return false
      }
    }
    return true
  })
}

export async function getProduct(id: string): Promise<Product | null> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("products")
      .select("*")
      .or(`external_id.eq.${id},id.eq.${/^\d+$/.test(id) ? id : 0}`)
      .maybeSingle()
    if (!error && data) return mapDbProduct(data)
  }
  await delay(30)
  return productStore.get(id)
}

export type UpsertProductInput = Omit<Product, "id" | "created_at" | "updated_at">

export async function upsertProduct(
  input: UpsertProductInput & { id?: string },
): Promise<Product> {
  const id = input.id ?? `prod_${Date.now().toString(36)}`
  const now = new Date().toISOString()
  const existing = isSupabaseEnabled()
    ? null
    : productStore.get(id)
  const product: Product = {
    ...input,
    id,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }
  if (isSupabaseEnabled()) {
    const user = (await supabase!.auth.getUser()).data?.user
    const dbPayload = {
      external_id: product.id,
      title: product.title,
      description: product.description,
      category: product.category,
      price_paise: product.price_paise,
      status: product.status,
      image_url: product.image_url,
      images: product.images?.length ? product.images : (product.image_url ? [product.image_url] : []),
      tags: product.tags,
      stock: product.stock,
      rating: product.rating ?? 4.8,
      review_count: product.review_count ?? 0,
      currency: "INR",
      ...(user ? { merchant_id: user.id } : {}),
    }
    const { data, error } = await supabase!
      .from("products")
      .upsert(dbPayload as never, { onConflict: "external_id" })
      .select()
      .maybeSingle()
    if (!error && data) return mapDbProduct(data)
  }
  return productStore.upsert(product)
}

export async function deleteProduct(id: string): Promise<{ id: string }> {
  if (isSupabaseEnabled()) {
    const { error } = await supabase!
      .from("products")
      .delete()
      .or(`external_id.eq.${id},id.eq.${/^\d+$/.test(id) ? id : 0}`)
    if (!error) return { id }
  }
  productStore.remove(id)
  return { id }
}

// --- Orders ----------------------------------------------------------------

export async function listOrders(): Promise<Order[]> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) return (data as any[]).map(mapDbOrder)
  }
  await delay(40)
  return orderStore.list()
}

export async function getOrder(id: string): Promise<Order | null> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("orders")
      .select("*")
      .or(`external_id.eq.${id},id.eq.${/^\d+$/.test(id) ? id : 0}`)
      .maybeSingle()
    if (!error && data) return mapDbOrder(data)
  }
  await delay(30)
  return orderStore.get(id)
}

export type TrackOrderArgs = { orderId: string; mobile: string; email: string }

export async function trackOrder(args: TrackOrderArgs): Promise<Order | null> {
  if (isSupabaseEnabled()) {
    const orderId = args.orderId.trim()
    const { data, error } = await supabase!
      .from("orders")
      .select("*")
      .or(`external_id.eq.${orderId},id.eq.${/^\d+$/.test(orderId) ? orderId : 0}`)
      .maybeSingle()
    if (!error && data) {
      const o = mapDbOrder(data)
      const last5 = args.mobile.replace(/\D/g, "")
      const cleanEmail = args.email.trim().toLowerCase()
      const phoneMatch =
        last5.length >= 5 &&
        o.shipping_address.phone.replace(/\D/g, "").endsWith(last5)
      const emailMatch =
        cleanEmail.length > 0 &&
        o.shipping_address.email.toLowerCase() === cleanEmail
      // Match if at least one of the secondary identifiers is provided + matches.
      if (phoneMatch || emailMatch) return o
      return null
    }
  }
  await delay(60)
  return orderStore.track(args.orderId, args.mobile, args.email)
}

// --- Conversations ---------------------------------------------------------

export async function listConversations(): Promise<Conversation[]> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false })
    if (!error && data) return (data as any[]).map(mapDbConversation)
  }
  await delay(40)
  return conversationStore.list()
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("conversations")
      .select("*")
      .or(`external_id.eq.${id},id.eq.${/^\d+$/.test(id) ? id : 0}`)
      .maybeSingle()
    if (!error && data) return mapDbConversation(data)
  }
  return conversationStore.get(id)
}

// --- Audit Trail -----------------------------------------------------------

export async function listAuditSessions(): Promise<AuditSession[]> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("audit_sessions")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) return (data as any[]).map(mapDbAuditSession)
  }
  await delay(40)
  return auditStore.listSessions()
}

export async function logAuditEvent(input: {
  order_id?: string | null
  customer?: string
  actor_label?: string
  event: AuditEvent
}): Promise<AuditSession> {
  const session = auditStore.log(input)
  if (isSupabaseEnabled()) {
    const user = (await supabase!.auth.getUser()).data?.user
    const dbSession = {
      external_id: session.session_id,
      order_id: session.order_id,
      customer: session.customer,
      actor_label: session.actor_label,
      events: session.events,
      last_event: session.last_event,
      event_count: session.event_count,
      status: session.status,
      severity: session.severity,
      ...(user ? { merchant_id: user.id } : {}),
    }
    await supabase!.from("audit_sessions").upsert(dbSession as never, { onConflict: "external_id" })
  }
  return session
}

// --- Dashboard / Analytics -------------------------------------------------

export async function getDashboard(): Promise<DashboardData> {
  if (isSupabaseEnabled()) {
    const user = (await supabase!.auth.getUser()).data?.user
    let query = supabase!.from("dashboard_view").select("*")
    if (user) {
      query = query.eq("merchant_id", user.id)
    }
    const { data, error } = await query.limit(1).maybeSingle()
    if (!error && data) {
      return {
        active_conversations: Number(data.active_conversations ?? 0),
        orders_today: Number(data.orders_today ?? 0),
        revenue_month_paise: Number(data.revenue_month_paise ?? 0),
        ai_status: data.ai_status ?? "online",
        low_stock_products: Number(data.low_stock_products ?? 0),
        pending_orders: Number(data.pending_orders ?? 0),
        recent_orders: Array.isArray(data.recent_orders) ? data.recent_orders : [],
        needs_attention: Array.isArray(data.needs_attention) ? data.needs_attention : [],
      }
    }
  }
  await delay(60)
  // Derive from live in-memory stores so new orders show.
  const orders = await listOrders()
  const todayStr = new Date().toISOString().split("T")[0]
  const ordersToday = orders.filter((o) => o.created_at.startsWith(todayStr))
  const revenueToday = ordersToday.filter((o) => o.status === "paid").reduce((s, o) => s + o.total_paise, 0)
  return {
    ...mockDashboard,
    orders_today: ordersToday.length,
    revenue_month_paise: revenueToday,
    recent_orders: orders.slice(0, 5).map((o) => o.id),
  }
}

export async function getAnalytics(): Promise<AnalyticsData> {
  if (isSupabaseEnabled()) {
    const user = (await supabase!.auth.getUser()).data?.user
    let query = supabase!.from("analytics_view").select("*")
    if (user) {
      query = query.eq("merchant_id", user.id)
    }
    const { data, error } = await query.limit(1).maybeSingle()
    if (!error && data) {
      return {
        revenue_series: Array.isArray(data.revenue_series) ? data.revenue_series : [],
        orders_by_status: typeof data.orders_by_status === "object" ? data.orders_by_status : {},
        top_categories: Array.isArray(data.top_categories) ? data.top_categories : [],
        aov_paise: Number(data.aov_paise ?? 0),
        conversion_rate_pct: Number(data.conversion_rate_pct ?? 0),
        insights: Array.isArray(data.insights) ? data.insights : [],
      }
    }
  }
  await delay(60)
  return mockAnalytics
}

// --- Agent checkout (Section 2 engine wired through Section 3 seam) -------

export type ExecuteAgentCheckoutInput = {
  /** Pre-built Order from the storefront cart/checkout. */
  order: Order
  /** AP2 mandate (if any). Without one, falls back to direct_web / x402. */
  mandate?: { mandate_id?: string; agent_name?: string; delegated_limit_paise?: number }
  /** Merchant threshold in RUPEES (useSettings.aiDefaults.approvalThreshold). */
  approvalThresholdRupees: number
  /** Protocol the agent is using. */
  protocol?: Exclude<CommerceProtocol, "direct_web">
}

export type ExecuteAgentCheckoutResult = {
  order: Order
  audit_session_id: string
  /** "auto" = settled, "step_up" = held awaiting customer approval. */
  settlement: "auto" | "step_up"
  /** Populated when settlement = "step_up" so the caller can surface 402. */
  challenge?: X402Challenge
  protocol?: CommerceProtocol
}

/**
 * Executes an agent-delegated checkout following UAP / ACP / AP2 / x402.
 *
 * Flow:
 * 1. If mandate provided -> verifyAP2Mandate (fails if expired / over limit)
 * 2. approveAuto(order.total_paise, approvalThresholdRupees)
 *    -> if "x402", step-up challenge generated, returns WITHOUT settlement.
 * 3. If auto -> processUAPTransaction -> emits audit events.
 * 4. Logs audit events into auditStore (and Supabase if enabled).
 * 5. Persists the settled order into orderStore (and Supabase if enabled).
 */
export async function executeAgentCheckout(
  input: ExecuteAgentCheckoutInput,
): Promise<ExecuteAgentCheckoutResult> {
  const { order, mandate, approvalThresholdRupees, protocol = "ncpi_uap" } = input

  // 1. Mandate verification (AP2)
  if (mandate) {
    const verified = verifyAP2Mandate(mandate, order.total_paise)
    if (!verified.valid) {
      const challenge = createX402Challenge(order, mandate.mandate_id)
      const session = await logAuditEvent({
        order_id: order.id,
        customer: order.shipping_address.full_name,
        actor_label: "AP2 Validator",
        event: {
          id: `ev_${Date.now().toString(36)}_1`,
          timestamp: new Date().toISOString(),
          actor: "AI Assistant",
          type: "AP2 Mandate Rejected",
          result: "Failed",
          source: "AI Agent",
          reason: `Mandate ${mandate.mandate_id} invalid or over delegated limit`,
        },
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
      event: {
        id: `ev_${Date.now().toString(36)}_2`,
        timestamp: new Date().toISOString(),
        actor: "system",
        type: "Step-Up Required (x402)",
        result: "Warning",
        source: "system",
        reason: `Amount ₹${(order.total_paise / 100).toFixed(2)} exceeds auto-approval threshold ₹${approvalThresholdRupees.toLocaleString("en-IN")}`,
      },
    })
    return {
      order,
      audit_session_id: session.session_id,
      settlement: "step_up",
      challenge,
      protocol: "x402",
    }
  }

  // 3. Auto-approval path: process UAP settlement
  const uapResult = processUAPTransaction(order, mandate?.mandate_id)

  // Persist each emitted audit event.
  let session_id = ""
  for (const event of uapResult.audit_events) {
    const s = await logAuditEvent({
      order_id: order.id,
      customer: order.shipping_address.full_name,
      actor_label: order.via_ai ? "AI" : "Customer",
      event,
    })
    session_id = s.session_id
  }

  // 4. Mark order as paid (settled) and persist
  const settled: Order = {
    ...order,
    status: "paid",
    paid_at: new Date().toISOString(),
    razorpay_payment_id: `pay_${Date.now().toString(36)}`,
  }
  if (isSupabaseEnabled()) {
    const user = (await supabase!.auth.getUser()).data?.user
    const dbOrder = {
      external_id: settled.id,
      merchant_id: user?.id ?? "00000000-0000-0000-0000-000000000000",
      razorpay_order_id: settled.razorpay_order_id,
      razorpay_payment_id: settled.razorpay_payment_id,
      status: settled.status,
      shipping_status: settled.shipping_status,
      currency: settled.currency,
      total_paise: settled.total_paise,
      shipping_paise: settled.shipping_paise,
      items: settled.items,
      shipping_address: settled.shipping_address,
      billing_address: settled.billing_address,
      via_ai: settled.via_ai,
      conversation_id: settled.conversation_id,
      mandate_id: settled.mandate_id,
      checkout_session_id: settled.checkout_session_id,
      commerce_protocol: "ncpi_uap",
      settlement_reference: `settle_${Date.now().toString(36)}`,
      notes: settled.notes,
      paid_at: settled.paid_at,
    }
    const { error } = await supabase!.from("orders").upsert(dbOrder as never, { onConflict: "external_id" })
    if (error) orderStore.upsert(settled)
  } else {
    orderStore.upsert(settled)
  }

  return {
    order: settled,
    audit_session_id: session_id,
    settlement: "auto",
    protocol: uapResult.protocol,
  }
}

// --- helpers ---------------------------------------------------------------

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
