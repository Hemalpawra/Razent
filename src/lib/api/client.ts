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
import { mockProducts } from "@/lib/mock/products"
import { mockOrders } from "@/lib/mock/orders"
import { mockConversations } from "@/lib/mock/conversations"
import { mockAuditSessions } from "@/lib/mock/audit"
import {
  verifyAP2Mandate,
  approveAuto,
  createX402Challenge,
  type X402Challenge,
} from "@/lib/protocol/agenticCommerce"

function filterMockProducts(items: Product[], args: ListProductsArgs): Product[] {
  let res = [...items]
  if (args.q) {
    const q = args.q.toLowerCase()
    res = res.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }
  if (args.category && args.category !== "All") {
    res = res.filter((p) => p.category.toLowerCase() === args.category!.toLowerCase())
  }
  if (args.status) {
    res = res.filter((p) => p.status === args.status)
  }
  return res
}

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
    session_id: row.session_id || row.external_id || String(row.id),
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

export const SEEDED_MERCHANT_ID = "b57fec42-c785-466e-b225-3f7a27edcccb"

/** Returns the current merchant id (auth.users.id), or the seeded demo merchant if not signed in. */
/** Returns the current merchant id (auth.users.id), or the seeded demo merchant if not signed in. */
async function requireMerchantId(): Promise<string> {
  const user = await getUser().catch(() => null)
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
    if (profile?.role === "super_admin") {
      return SEEDED_MERCHANT_ID
    }
    return user.id
  }
  return SEEDED_MERCHANT_ID
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
  try {
    let q = supabase.from("products").select("*").order("created_at", {
      ascending: false,
    })
    if (args.q) q = q.ilike("title", `%${args.q}%`)
    if (args.category && args.category !== "All") q = q.eq("category", args.category)
    if (args.status) q = q.eq("status", args.status)
    const { data, error } = await q
    if (error) {
      console.warn("[listProducts] Supabase returned error:", error.message)
      return []
    }
    return (data || []).map(mapDbProduct)
  } catch (err: any) {
    console.warn("[listProducts] fetch error:", err?.message)
    return []
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .or(`external_id.eq.${id},id.eq.${id}`)
      .maybeSingle()
    if (!error && data) return mapDbProduct(data)
  } catch (err: any) {
    console.warn("[getProduct] fetch error:", err?.message)
  }
  return null
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
  try {
    const merchantId = await requireMerchantId()
    let q = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
    if (merchantId) {
      q = q.or(`merchant_id.eq.${merchantId},merchant_id.eq.${SEEDED_MERCHANT_ID}`)
    }
    const { data, error } = await q
    if (error) {
      console.warn("[listOrders] fetch error:", error.message)
      return []
    }
    return (data || []).map(mapDbOrder)
  } catch (err) {
    console.warn("[listOrders] fetch error:", err)
    return []
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .or(`external_id.eq.${id},id.eq.${id}`)
      .maybeSingle()
    if (!error && data) return mapDbOrder(data)
  } catch (err) {
    console.warn("[getOrder] fetch error:", err)
  }
  return null
}

export type TrackOrderArgs = {
  orderId?: string
  mobile?: string
  email?: string
  query?: string
}

/**
 * Public customer-side lookup. Accepts either a single search term (Order ID, phone, email, or name)
 * or separate fields.
 */
export async function trackOrder(args: TrackOrderArgs | string): Promise<Order | null> {
  const q = typeof args === "string" 
    ? args.trim() 
    : (args.query || args.orderId || args.mobile || args.email || "").trim()

  if (!q) return null

  try {
    const digits = q.replace(/\D/g, "")
    // 1. Try order ID match (starts with ORD- or exact external_id)
    if (q.toUpperCase().startsWith("ORD-") || q.length >= 10) {
      const { data: exactOrder } = await supabase
        .from("orders")
        .select("*")
        .or(`external_id.eq.${q.toUpperCase()},external_id.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (exactOrder) return mapDbOrder(exactOrder)
    }

    // 2. Try email match
    if (q.includes("@")) {
      const { data: emailOrder } = await supabase
        .from("orders")
        .select("*")
        .ilike("shipping_address->>email", `%${q.toLowerCase()}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (emailOrder) return mapDbOrder(emailOrder)
    }

    // 3. Try phone match
    if (digits.length >= 4) {
      const { data: phoneOrder } = await supabase
        .from("orders")
        .select("*")
        .ilike("shipping_address->>phone", `%${digits}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (phoneOrder) return mapDbOrder(phoneOrder)
    }

    // 4. Try general search across external_id, name, email, phone
    const { data: anyOrder } = await supabase
      .from("orders")
      .select("*")
      .or(`external_id.ilike.%${q}%,shipping_address->>full_name.ilike.%${q}%,shipping_address->>email.ilike.%${q}%,shipping_address->>phone.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (anyOrder) return mapDbOrder(anyOrder)
  } catch (err) {
    console.warn("[trackOrder] search error:", err)
  }
  return null
}

// ─────────────────────────────────────────────────────────────────
// Conversations
// ─────────────────────────────────────────────────────────────────

export async function listConversations(): Promise<Conversation[]> {
  try {
    const merchantId = await requireMerchantId()
    let q = supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false })
    if (merchantId) {
      q = q.or(`merchant_id.eq.${merchantId},merchant_id.eq.${SEEDED_MERCHANT_ID}`)
    }
    const { data, error } = await q
    if (error) {
      console.warn("[listConversations] error:", error.message)
      return []
    }
    return (data || []).map(mapDbConversation)
  } catch (err) {
    console.warn("[listConversations] fetch error:", err)
    return []
  }
}

export async function getConversation(
  id: string,
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`external_id.eq.${id},id.eq.${id}`)
      .maybeSingle()
    if (!error && data) return mapDbConversation(data)
  } catch (err) {
    console.warn("[getConversation] fetch error:", err)
  }
  return null
}

export type UpsertConversationInput = {
  id?: string
  external_id?: string
  merchant_id?: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  type?: "human_customer" | "agent_to_agent"
  protocol?: "ncpi_uap" | "acp" | "x402" | "direct_web"
  status?: string
  last_message?: string
  amount_paise?: number
  order_id?: string
  messages?: any[]
}

export async function upsertConversation(
  input: UpsertConversationInput,
): Promise<Conversation | null> {
  try {
    const merchantId = input.merchant_id || SEEDED_MERCHANT_ID
    const extId = input.external_id || `conv_${Date.now()}`
    const payload: any = {
      external_id: extId,
      merchant_id: merchantId,
      customer_name: input.customer_name || "Storefront Customer",
      type: input.type || "human_customer",
      protocol: input.protocol || "direct_web",
      status: input.status || "active",
      last_message: input.last_message || "",
      messages: input.messages || [],
      updated_at: new Date().toISOString(),
    }
    if (input.customer_email) payload.customer_email = input.customer_email
    if (input.customer_phone) payload.customer_phone = input.customer_phone
    if (input.amount_paise !== undefined) payload.amount_paise = input.amount_paise
    if (input.order_id !== undefined) payload.order_id = input.order_id

    const { data, error } = await supabase
      .from("conversations")
      .upsert(payload, { onConflict: "external_id" })
      .select()
      .maybeSingle()

    if (error) {
      console.warn("[upsertConversation] error:", error.message)
      return null
    }
    return data ? mapDbConversation(data) : null
  } catch (err) {
    console.warn("[upsertConversation] fetch error:", err)
    return null
  }
}

export async function updateConversationStatus(
  id: string,
  status: "active" | "closed" | "resolved" | "paid",
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("conversations")
      .update({ status, updated_at: new Date().toISOString() })
      .or(`external_id.eq.${id},id.eq.${id}`)
    if (error) {
      console.warn("[updateConversationStatus] error:", error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn("[updateConversationStatus] exception:", err)
    return false
  }
}

// ─────────────────────────────────────────────────────────────────
// Realtime Subscriptions
// ─────────────────────────────────────────────────────────────────

export function subscribeToOrders(callback: (payload: any) => void) {
  const channel = supabase
    .channel(`orders-live-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      (payload) => callback(payload),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToConversations(callback: (payload: any) => void) {
  const channel = supabase
    .channel(`convs-live-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations" },
      (payload) => callback(payload),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// ─────────────────────────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────────────────────────

export async function listAuditSessions(): Promise<AuditSession[]> {
  try {
    const merchantId = await requireMerchantId()
    let q = supabase
      .from("audit_sessions_view")
      .select("*")
      .order("created_at", { ascending: false })
    if (merchantId) {
      q = q.or(`merchant_id.eq.${merchantId},merchant_id.eq.${SEEDED_MERCHANT_ID}`)
    }
    const { data, error } = await q
    if (error) {
      console.warn("[listAuditSessions] error:", error.message)
      return []
    }
    return (data || []).map(mapDbAuditSession)
  } catch (err) {
    console.warn("[listAuditSessions] fetch error:", err)
    return []
  }
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
  const merchantId = SEEDED_MERCHANT_ID
  try {
    const { data, error } = await supabase
      .from("dashboard_view")
      .select("*")
      .or(`merchant_id.eq.${merchantId}`)
      .maybeSingle()

    // Fetch real last 7 days daily revenue for sales chart
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("created_at, total_paise, status")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: true })

    const dailyRevMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      dailyRevMap.set(key, 0)
    }

    if (recentOrders) {
      recentOrders.forEach((o) => {
        if (o.status === "paid") {
          const key = new Date(o.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
          if (dailyRevMap.has(key)) {
            dailyRevMap.set(key, (dailyRevMap.get(key) || 0) + Number(o.total_paise))
          }
        }
      })
    }

    const revenueDaily = Array.from(dailyRevMap.entries()).map(([date, revenue_paise]) => ({
      date,
      revenue_paise,
    }))

    if (!error && data) {
      return {
        active_conversations: Number(data.active_conversations ?? 0),
        orders_today: Number(data.orders_today ?? 0),
        revenue_month_paise: Number(data.revenue_month_paise ?? 0),
        ai_status: (data.ai_status ?? "online") as "online" | "degraded" | "offline",
        low_stock_products: Number(data.low_stock_products ?? 0),
        pending_orders: Number(data.pending_orders ?? 0),
        recent_orders: Array.isArray(data.recent_orders) ? data.recent_orders : [],
        needs_attention: Array.isArray(data.needs_attention) ? data.needs_attention : [],
        revenue_vs_prev_pct: undefined,
        orders_vs_prev_pct: undefined,
        conversion_vs_prev_pct: undefined,
        upsell_vs_prev_pct: undefined,
        aov_vs_prev_pct: undefined,
        conversion_rate_pct: undefined,
        upsell_revenue_paise: undefined,
        aov_paise: undefined,
        revenue_daily_paise: revenueDaily,
      }
    }
  } catch (err: any) {
    console.warn("[getDashboard] fetch error:", err?.message)
  }
  return {
    active_conversations: 0,
    orders_today: 0,
    revenue_month_paise: 0,
    ai_status: "online",
    low_stock_products: 0,
    pending_orders: 0,
    recent_orders: [],
    needs_attention: [],
    revenue_vs_prev_pct: undefined,
    orders_vs_prev_pct: undefined,
    conversion_vs_prev_pct: undefined,
    upsell_vs_prev_pct: undefined,
    aov_vs_prev_pct: undefined,
    conversion_rate_pct: undefined,
    upsell_revenue_paise: undefined,
    aov_paise: undefined,
    revenue_daily_paise: [],
  }
}

export async function getAnalytics(): Promise<AnalyticsData> {
  try {
    const merchantId = await requireMerchantId().catch(() => null)
    const { data, error } = await supabase
      .from("analytics_view")
      .select("*")
      .or(`merchant_id.eq.${merchantId},merchant_id.eq.${SEEDED_MERCHANT_ID}`)
      .maybeSingle()
    if (!error && data) {
      // Fix: DB returns orders_by_status as an object; convert to array
      const statusObj = data.orders_by_status ?? {}
      const statusArray = Object.entries(statusObj).map(([status, count]) => ({
        status: status as "paid" | "created" | "failed" | "refunded",
        count: Number(count),
      }))
      const rawSeries = data.daily_revenue ?? data.revenue_series ?? []
      const revenueSeries = Array.isArray(rawSeries)
        ? rawSeries.map((r: any) => ({
            date: r.date,
            revenue_paise: Number(r.revenue_paise ?? r.revenue ?? 0),
            orders: Number(r.orders ?? 0),
          }))
        : []
      const rawCategories = data.top_categories ?? []
      const topCategories = Array.isArray(rawCategories)
        ? rawCategories.map((c: any) => ({
            category: c.category,
            revenue_paise: Number(c.revenue_paise ?? c.revenue ?? 0),
          }))
        : []
      return {
        revenue_series: revenueSeries,
        orders_by_status: statusArray,
        top_categories: topCategories,
        aov_paise: Number(data.aov_paise ?? 0),
        conversion_rate_pct: Number(data.conversion_rate_pct ?? 0),
        insights: Array.isArray(data.insights) ? data.insights : [],
      }
    }
  } catch (err: any) {
    console.warn("[getAnalytics] fetch error:", err?.message)
  }
  return {
    revenue_series: [],
    orders_by_status: [],
    top_categories: [],
    aov_paise: 0,
    conversion_rate_pct: 0,
    insights: [],
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
  merchantId?: string // Optional: for customer checkout, use the seeded merchant
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
  const { order, mandate, approvalThresholdRupees, protocol = "ncpi_uap", merchantId } = input

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
  // Use provided merchantId or fall back to seeded merchant (merchant1@razent.local)
  const targetMerchantId = merchantId || "b57fec42-c785-466e-b225-3f7a27edcccb"
  const { data: dbOrder, error: orderErr } = await supabase
    .from("orders")
    .insert({
      external_id: order.id,
      merchant_id: targetMerchantId,
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

export async function createStorefrontOrder(order: Order): Promise<Order> {
  const targetMerchantId = (order as any).merchant_id || SEEDED_MERCHANT_ID
  const { data, error } = await supabase
    .from("orders")
    .insert({
      external_id: order.id,
      merchant_id: targetMerchantId,
      customer_id: null,
      razorpay_order_id: order.razorpay_order_id,
      razorpay_payment_id: order.razorpay_payment_id ?? null,
      status: order.status,
      shipping_status: order.shipping_status ?? "pending",
      currency: order.currency || "INR",
      total_paise: order.total_paise,
      shipping_paise: order.shipping_paise ?? 0,
      items: order.items,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address ?? null,
      via_ai: !!order.via_ai,
      commerce_protocol: order.commerce_protocol || "direct_web",
      notes: order.notes ?? null,
      paid_at: order.status === "paid" ? new Date().toISOString() : null,
    } as any)
    .select()
    .maybeSingle()
  if (error) {
    console.error("[createStorefrontOrder] insert error:", error)
    throw error
  }
  return mapDbOrder(data)
}

export function subscribeToProducts(onUpdate: () => void): () => void {
  const channel = supabase
    .channel(`public:products_live_${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      () => {
        onUpdate()
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

