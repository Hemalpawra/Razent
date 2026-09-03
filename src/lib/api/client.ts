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
      return applyProductFilter(data as Product[], args)
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
      .eq("id", id)
      .maybeSingle()
    if (!error) return (data as Product | null) ?? productStore.get(id)
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
    const { error } = await supabase!.from("products").upsert(product)
    if (!error) return product
  }
  return productStore.upsert(product)
}

export async function deleteProduct(id: string): Promise<{ id: string }> {
  if (isSupabaseEnabled()) {
    const { error } = await supabase!.from("products").delete().eq("id", id)
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
    if (!error && data) return data as Order[]
  }
  await delay(40)
  return orderStore.list()
}

export async function getOrder(id: string): Promise<Order | null> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (!error) return (data as Order | null) ?? orderStore.get(id)
  }
  await delay(30)
  return orderStore.get(id)
}

export type TrackOrderArgs = { orderId: string; mobile: string; email: string }

export async function trackOrder(args: TrackOrderArgs): Promise<Order | null> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("orders")
      .select("*")
      .eq("id", args.orderId.trim())
      .maybeSingle()
    if (!error && data) {
      const o = data as Order
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
    if (!error && data) return data as Conversation[]
  }
  await delay(40)
  return conversationStore.list()
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("conversations")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (!error) return (data as Conversation | null) ?? conversationStore.get(id)
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
    if (!error && data) return data as AuditSession[]
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
    // Best-effort: persist the session row with its events payload.
    await supabase!.from("audit_sessions").upsert(session as never)
  }
  return session
}

// --- Dashboard / Analytics -------------------------------------------------

export async function getDashboard(): Promise<DashboardData> {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase!
      .from("dashboard_view")
      .select("*")
      .maybeSingle()
    if (!error && data) return data as DashboardData
  }
  await delay(60)
  // Section 2 fix: derive from live in-memory stores so new orders show.
  const orders = await listOrders()
  const todayStr = new Date().toISOString().split("T")[0]
  const ordersToday = orders.filter((o) => o.created_at.startsWith(todayStr))
  const paidOrders = orders.filter((o) => o.status === "paid")
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
    const { data, error } = await supabase!.from("analytics_view").select("*").maybeSingle()
    if (!error && data) return data as AnalyticsData
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
  /** Resolved protocol actually used. */
  protocol: CommerceProtocol
}

export async function executeAgentCheckout(
  input: ExecuteAgentCheckoutInput,
): Promise<ExecuteAgentCheckoutResult> {
  const { order, mandate, approvalThresholdRupees, protocol = "ncpi_uap" } = input
  const executeCheckoutUrl = import.meta.env.VITE_EXECUTE_AGENT_CHECKOUT_URL?.trim()

  // If Edge Function URL is configured, delegate to it (keeps secrets server-side)
  if (executeCheckoutUrl && isSupabaseEnabled()) {
    try {
      const { data, error } = await supabase!.functions.invoke("execute-agent-checkout", {
        body: {
          order_id: order.id,
          protocol,
          mandate,
          approval_threshold_rupees: approvalThresholdRupees,
        },
      })
      if (error) throw error
      return data as ExecuteAgentCheckoutResult
    } catch (err) {
      console.warn("Edge Function execute-agent-checkout failed, falling back to client logic:", err)
      // fall through to client logic below
    }
  }

  // 1. AP2 mandate verification (if provided)
  if (mandate) {
    const verification = verifyAP2Mandate(mandate, order.total_paise)
    if (!verification.valid) {
      // Log failed mandate attempt
      const session = await logAuditEvent({
        order_id: order.id,
        event: {
          id: `audit-mandate-fail-${Date.now()}`,
          type: "mandate",
          timestamp: new Date().toISOString(),
          actor: "AI Assistant",
          source: "AI Agent",
          result: "Failed",
          reason: verification.reason ?? "mandate invalid",
          request_id: order.id,
          payload_summary: `protocol=${protocol} mandate=${mandate.mandate_id ?? "none"}`,
          status_code: 403,
        },
      })
      return {
        order,
        audit_session_id: session.session_id,
        settlement: "step_up",
        protocol: "x402",
        challenge: createX402Challenge(order, mandate.mandate_id),
      }
    }
  }

  // 2. Autonomous approval threshold check
  const approval = approveAuto(order.total_paise, approvalThresholdRupees)
  if (approval.requires_step_up) {
    // Above threshold → return x402 challenge, do not settle.
    const session = await logAuditEvent({
      order_id: order.id,
      event: {
        id: `audit-stepup-${Date.now()}`,
        type: "mandate",
        timestamp: new Date().toISOString(),
        actor: "AI Assistant",
        source: "AI Agent",
        result: "Warning",
        reason: `amount ${order.total_paise} paise > threshold ${approvalThresholdRupees * 100} paise`,
        request_id: order.id,
        payload_summary: `protocol=${approval.protocol} amount_paise=${order.total_paise}`,
        status_code: 402,
      },
    })
    return {
      order,
      audit_session_id: session.session_id,
      settlement: "step_up",
      protocol: approval.protocol,
      challenge: createX402Challenge(order, mandate?.mandate_id),
    }
  }

  // 3. UAP settlement (autonomous path) - either direct or via Edge Function
  let uapResult: ReturnType<typeof processUAPTransaction>
  const uapVerifierUrl = import.meta.env.VITE_UAP_VERIFIER_URL?.trim()
  if (uapVerifierUrl && mandate?.mandate_id) {
    // Call Edge Function for UAP verification + debit
    try {
      const uapPayload = {
        type: "uap.debit",
        mandate_id: mandate.mandate_id,
        customer_id: order.shipping_address.email, // simplified; real impl would use customer_id
        merchant_id: "current_merchant_id", // would come from JWT/context
        amount_paise: order.total_paise,
        order_id: order.id,
        npci_rrn: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
        npci_stan: Math.floor(Math.random() * 999999).toString().padStart(6, "0"),
        npci_timestamp: new Date().toISOString(),
      }

      const verifyResp = await fetch(uapVerifierUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(uapPayload),
      })

      if (!verifyResp.ok) {
        const errText = await verifyResp.text()
        throw new Error(`UAP verifier failed: ${errText}`)
      }

      const verifyJson = await verifyResp.json()
      if (!verifyJson.success) {
        throw new Error(verifyJson.error ?? "UAP verification failed")
      }

      // Construct equivalent audit events
      uapResult = {
        protocol: "ncpi_uap",
        settlement_reference: "razorpay_test",
        order_id: order.id,
        audit_events: [
          {
            id: `audit-uap-debit-${Date.now()}`,
            type: "uap",
            timestamp: new Date().toISOString(),
            actor: "customer",
            source: "NPCI UAP",
            result: "Success",
            reason: `debited via mandate ${mandate.mandate_id}`,
            request_id: order.id,
            payload_summary: `amount_paise=${order.total_paise} rrn=${verifyJson.rrn ?? verifyJson.npci_rrn}`,
            status_code: 200,
          },
        ],
      }
    } catch (err) {
      console.warn("UAP verifier Edge Function failed, falling back to client logic:", err)
      // fall through to client logic
      uapResult = processUAPTransaction(order, mandate?.mandate_id)
    }
  } else {
    uapResult = processUAPTransaction(order, mandate?.mandate_id)
  }

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
    const { error } = await supabase!.from("orders").upsert(settled as never)
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
