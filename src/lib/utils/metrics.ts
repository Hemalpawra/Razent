import type { Conversation } from "@/lib/types/conversation"
import type { Order } from "@/lib/types/order"
import type { AuditSession } from "@/lib/types/audit"
import { getOrderAgentSource } from "@/lib/utils/agentSource"

/**
 * Checks if a conversation is in an active state.
 */
export function isConversationActive(c: Conversation): boolean {
  const s = (c.status || "").toLowerCase()
  return s === "active" || s === "waiting_for_customer" || s === "waiting_for_payment"
}

/**
 * Checks if an order was created via AI (Agent or Assistant).
 */
export function isAiOrder(order: Order): boolean {
  if (order.via_ai || order.conversation_id) return true
  const src = getOrderAgentSource(order)
  return src.isAi
}

/**
 * 1) AI Agent metrics
 */
export function calculateAiAgentMetrics(conversations: Conversation[], orders: Order[]) {
  // Conversations = count(distinct conversation_id) in the selected period
  const distinctConvIds = new Set(conversations.map((c) => c.id))
  const conversationsCount = distinctConvIds.size

  // Products Shown = total product cards or product recommendations shown by the AI.
  // sum(product_cards_shown)
  const productsShown = conversations.reduce((sum, c) => {
    const recCount = Array.isArray(c.products_recommended) ? c.products_recommended.length : 0
    const compCount = Array.isArray(c.products_compared) ? c.products_compared.length : 0
    const selectedCount = c.selected_product ? 1 : 0
    const cardsShown = recCount + compCount + selectedCount
    return sum + cardsShown
  }, 0)

  // Orders Created = orders that came from the AI assistant.
  // count(orders where source = 'ai_agent' or source = 'ai_assistant')
  const aiOrders = orders.filter(isAiOrder)
  const ordersCreated = aiOrders.length

  // Conversion Rate = (Orders Created / Conversations) × 100
  const conversionRatePct =
    conversationsCount > 0
      ? Number(((ordersCreated / conversationsCount) * 100).toFixed(1))
      : 0

  // 6-step Conversation to Order Funnel
  // 1. Conversations Started
  // 2. Products Shown
  // 3. Add to Cart
  // 4. Checkout Started
  // 5. Orders Created
  // 6. Paid Orders
  const conversationsStarted = conversationsCount

  // Add to cart: conversations where products were selected / added to cart
  const addToCartCount = conversations.reduce((sum, c) => {
    if (c.selected_product || (c.amount_paise && c.amount_paise > 0) || c.order_id) {
      return sum + 1
    }
    return sum
  }, 0)

  // Checkout started: conversations with shipping collected, checkout ready, or orders created
  const checkoutStartedCount = conversations.reduce((sum, c) => {
    if (
      c.shipping_collected ||
      c.shipping_address ||
      c.status === "checkout_ready" ||
      c.status === "waiting_for_payment" ||
      c.order_id
    ) {
      return sum + 1
    }
    return sum
  }, 0)

  const paidAiOrders = aiOrders.filter((o) => o.status === "paid")
  const paidOrdersCount = paidAiOrders.length

  // Step Conversion % = (current_step / previous_step) × 100
  const funnel = {
    conversationsStarted,
    productsShown,
    addToCart: addToCartCount,
    checkoutStarted: checkoutStartedCount,
    ordersCreated,
    paidOrders: paidOrdersCount,
    rates: {
      productsShownRatePct:
        conversationsStarted > 0
          ? Number(((productsShown / conversationsStarted) * 100).toFixed(1))
          : 0,
      addToCartRatePct:
        productsShown > 0
          ? Number(((addToCartCount / productsShown) * 100).toFixed(1))
          : 0,
      checkoutRatePct:
        addToCartCount > 0
          ? Number(((checkoutStartedCount / addToCartCount) * 100).toFixed(1))
          : 0,
      orderRatePct:
        checkoutStartedCount > 0
          ? Number(((ordersCreated / checkoutStartedCount) * 100).toFixed(1))
          : 0,
      paymentSuccessRatePct:
        ordersCreated > 0
          ? Number(((paidOrdersCount / ordersCreated) * 100).toFixed(1))
          : 0,
    },
  }

  return {
    conversations: conversationsCount,
    productsShown,
    ordersCreated,
    conversionRatePct,
    funnel,
  }
}

/**
 * 2) Upsell Revenue
 * Option A — line item tag: sum(price of line items where is_upsell = true)
 * Option B — order difference: order_total - base_order_total
 */
export function calculateUpsellRevenue(orders: Order[], conversations: Conversation[] = []): number {
  let upsellPaise = 0

  orders.forEach((o) => {
    // Option A: line item tag
    let orderUpsellPaise = 0
    let hasTaggedUpsell = false

    if (Array.isArray(o.items)) {
      o.items.forEach((item: any) => {
        if (item.is_upsell === true || item.is_cross_sell === true) {
          hasTaggedUpsell = true
          orderUpsellPaise += (Number(item.unit_price_paise) || 0) * (Number(item.qty) || 1)
        }
      })
    }

    if (hasTaggedUpsell) {
      upsellPaise += orderUpsellPaise
      return
    }

    // Option B: order difference
    const baseTotal = (o as any).base_order_total_paise || (o as any).base_order_total
    if (baseTotal !== undefined && o.total_paise > Number(baseTotal)) {
      upsellPaise += o.total_paise - Number(baseTotal)
      return
    }

    // Option C: multi-item AI orders where items beyond the first are cross-sells
    if (isAiOrder(o) && Array.isArray(o.items) && o.items.length > 1) {
      const crossSellItemsTotal = o.items.slice(1).reduce((sum, it: any) => {
        return sum + (Number(it.unit_price_paise) || 0) * (Number(it.qty) || 1)
      }, 0)
      upsellPaise += crossSellItemsTotal
    }
  })

  // Also account for conversations with upsell products accepted
  if (conversations.length > 0) {
    conversations.forEach((c) => {
      if (c.upsell && c.upsell.price_paise && (c.order_id || c.amount_paise)) {
        if (!orders.some((o) => o.id === c.order_id && Array.isArray(o.items) && o.items.length > 1)) {
          upsellPaise += Number(c.upsell.price_paise)
        }
      }
    })
  }

  return upsellPaise
}

/**
 * 3) Avg. Order Value (AOV)
 * Revenue Generated / Orders Created (uses paid orders for cleanest number)
 */
export function calculateAov(revenuePaise: number, ordersCount: number): number {
  if (ordersCount <= 0) return 0
  return Math.round(revenuePaise / ordersCount)
}

/**
 * 4) AI Performance Score
 * AI Performance Score = 40% AI Conversion Rate + 30% Upsell Rate + 20% Payment Success Rate + 10% Helpfulness Score
 */
export function calculateAiPerformanceScore(params: {
  conversionRatePct: number
  upsellRatePct: number
  paymentSuccessRatePct: number
  helpfulnessScorePct?: number
}): number {
  const {
    conversionRatePct,
    upsellRatePct,
    paymentSuccessRatePct,
    helpfulnessScorePct = 85,
  } = params

  const score =
    conversionRatePct * 0.4 +
    upsellRatePct * 0.3 +
    paymentSuccessRatePct * 0.2 +
    helpfulnessScorePct * 0.1

  return Number(Math.min(100, Math.max(0, score)).toFixed(1))
}

/**
 * 5) AI Agent dashboard numbers (calculated dynamically for the provided period)
 */
export function calculateAiAgentDashboardNumbers(conversations: Conversation[], orders: Order[]) {
  // Active Conversations = count(conversations where status = 'active')
  const activeConversations = conversations.filter(isConversationActive).length

  // AI Orders in the provided filtered period
  const aiOrders = orders.filter(isAiOrder)
  const paidAiOrders = aiOrders.filter((o) => o.status === "paid")

  // Orders Created in this period
  const ordersCreatedToday = aiOrders.length

  // Revenue Generated in this period from AI orders
  const revenueGeneratedTodayPaise = paidAiOrders.reduce(
    (sum, o) => sum + (Number(o.total_paise) || 0),
    0
  )

  // Conversion Rate = Orders Created / Conversations Started × 100
  const conversionRatePct =
    conversations.length > 0
      ? Number(((aiOrders.length / conversations.length) * 100).toFixed(1))
      : 0

  // Customers Helped = distinct customers with AI conversations in this period
  const helpfulCustomerKeys = new Set<string>()
  conversations.forEach((c) => {
    const hasProducts =
      (c.products_recommended && c.products_recommended.length > 0) ||
      (c.products_compared && c.products_compared.length > 0) ||
      Boolean(c.selected_product)
    const ledToOrder = Boolean(c.order_id) || Boolean(c.amount_paise && c.amount_paise > 0)
    const isHelpful = hasProducts || ledToOrder

    if (isHelpful) {
      const key = (c as any).customer_id || c.customer_name || c.id
      helpfulCustomerKeys.add(key)
    }
  })

  const customersHelped =
    helpfulCustomerKeys.size > 0 ? helpfulCustomerKeys.size : conversations.length

  return {
    activeConversations,
    ordersCreatedToday,
    revenueGeneratedTodayPaise,
    conversionRatePct,
    customersHelped,
  }
}

/**
 * 6) Audit Trail metrics
 */
export function calculateAuditTrailMetrics(sessions: AuditSession[]) {
  // Total Sessions = unique audit sessions: count(distinct session_id)
  const uniqueSessionIds = new Set(sessions.map((s) => s.session_id))
  const totalSessions = uniqueSessionIds.size

  // Total Events = every audit row: count(*)
  let totalEvents = 0
  let successEvents = 0
  let failedEvents = 0
  let criticalAlerts = 0

  sessions.forEach((s) => {
    if (Array.isArray(s.events) && s.events.length > 0) {
      totalEvents += s.events.length
      s.events.forEach((e) => {
        const res = (e.result || "").toLowerCase()
        if (res === "success") {
          successEvents++
        } else if (res === "failed") {
          failedEvents++
        } else if (res === "critical") {
          criticalAlerts++
        }
      })
    } else {
      const count = Number(s.event_count) || 1
      totalEvents += count
      const status = (s.status || "").toLowerCase()
      const severity = (s.severity || "").toLowerCase()

      if (status === "success") {
        successEvents += count
      } else if (status === "failed") {
        failedEvents += count
      } else if (status === "critical" || severity === "critical") {
        criticalAlerts += count
      }
    }
  })

  return {
    totalSessions,
    totalEvents,
    successEvents,
    failedEvents,
    criticalAlerts,
  }
}

/**
 * 7) Analytics dashboard metrics
 */
export function calculateAnalyticsDashboardMetrics(orders: Order[], conversations: Conversation[]) {
  const paidOrders = orders.filter((o) => o.status === "paid")

  // Revenue Generated = total paid order value: sum(paid_orders.total_amount_paise) / 100
  const revenueGeneratedPaise = paidOrders.reduce(
    (sum, o) => sum + (Number(o.total_paise) || 0),
    0,
  )
  const revenueGeneratedRupees = revenueGeneratedPaise / 100

  // AI Conversion Rate = AI orders / AI conversations × 100
  const aiOrders = orders.filter(isAiOrder)
  const aiConversionRatePct =
    conversations.length > 0
      ? Number(((aiOrders.length / conversations.length) * 100).toFixed(1))
      : 0

  // AI Upsell / Orders:
  // Upsell Revenue = money from upsell items
  const upsellRevenuePaise = calculateUpsellRevenue(orders, conversations)

  // Upsell Orders Rate = upsell_orders / total_orders × 100
  const upsellOrdersCount = orders.filter((o) => {
    if (Array.isArray(o.items) && o.items.some((it: any) => it.is_upsell === true)) {
      return true
    }
    const baseTotal = (o as any).base_order_total_paise || (o as any).base_order_total
    return baseTotal !== undefined && o.total_paise > Number(baseTotal)
  }).length

  const upsellOrderRatePct =
    orders.length > 0
      ? Number(((upsellOrdersCount / orders.length) * 100).toFixed(1))
      : 0

  // Avg. Order Value = Revenue Generated / Paid Orders
  const aovPaise = calculateAov(revenueGeneratedPaise, paidOrders.length)

  return {
    revenueGeneratedPaise,
    revenueGeneratedRupees,
    aiConversionRatePct,
    upsellRevenuePaise,
    upsellOrdersCount,
    upsellOrderRatePct,
    aovPaise,
  }
}
