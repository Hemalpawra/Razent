import { mockOrders } from "@/lib/mock/orders"
import { mockProducts } from "@/lib/mock/products"
import type { AnalyticsData } from "@/lib/types/analytics"

/**
 * Synthesized analytics derived from the order/product mocks so the
 * shapes feel like a real Razorpay merchant dashboard. When the
 * backend lands, this whole module goes away — the screen will read
 * from Supabase views/RPCs.
 */
export const mockAnalytics: AnalyticsData = (() => {
  const paidOrders = mockOrders.filter(
    (o) => o.status === "paid" || o.status === "refunded",
  )

  // Revenue series: last 14 days, padded with zeros.
  const today = new Date("2026-08-31T00:00:00Z")
  const revenue_series = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - (13 - i))
    const iso = d.toISOString().slice(0, 10)
    // Synthesize: orders containing this date prefix contribute.
    const dayOrders = paidOrders.filter((o) => o.created_at.startsWith(iso))
    const revenue_paise = dayOrders.reduce((s, o) => s + o.total_paise, 0)
    // Floor so the chart isn't always flat — add a deterministic sine-wave
    // baseline so the shape looks real.
    const baseline = Math.round(
      800_000 + 600_000 * Math.sin((i / 14) * Math.PI * 1.4),
    )
    return {
      date: iso,
      revenue_paise: revenue_paise + baseline,
      orders: dayOrders.length + (i % 3),
    }
  })

  const orders_by_status: AnalyticsData["orders_by_status"] = [
    {
      status: "paid",
      count: mockOrders.filter((o) => o.status === "paid").length,
    },
    {
      status: "created",
      count: mockOrders.filter((o) => o.status === "created").length,
    },
    {
      status: "failed",
      count: mockOrders.filter((o) => o.status === "failed").length,
    },
    {
      status: "refunded",
      count: mockOrders.filter((o) => o.status === "refunded").length,
    },
  ]

  // Top categories by revenue from paid orders.
  const catTotals = new Map<string, number>()
  for (const o of paidOrders) {
    for (const item of o.items) {
      const product = mockProducts.find((p) => p.id === item.product_id)
      const category = product?.category ?? "Other"
      catTotals.set(
        category,
        (catTotals.get(category) ?? 0) + item.unit_price_paise * item.qty,
      )
    }
  }
  const top_categories = Array.from(catTotals.entries())
    .map(([category, revenue_paise]) => ({ category, revenue_paise }))
    .sort((a, b) => b.revenue_paise - a.revenue_paise)
    .slice(0, 6)

  const aov_paise = paidOrders.length
    ? Math.round(
        paidOrders.reduce((s, o) => s + o.total_paise, 0) / paidOrders.length,
      )
    : 0

  const conversion_rate_pct = 3.4 // demo

  const insights: AnalyticsData["insights"] = [
    {
      id: "ins_1",
      title: "AI-assisted orders convert at 2.3x baseline",
      detail:
        "Orders with via_ai=true average ₹22,400 vs ₹9,800 for storefront orders over the last 14 days.",
    },
    {
      id: "ins_2",
      title: "Kitchen category up 18% week-over-week",
      detail: "Driven by Dual-Basket Air Fryer and Espresso Machine Compact.",
    },
    {
      id: "ins_3",
      title: "Refund rate steady at 1.4%",
      detail:
        "Mechanical Keyboard 75% accounts for 1 of 1 refunds in the last 14 days.",
    },
    {
      id: "ins_4",
      title: "Smart Kettle out of stock",
      detail:
        "Reorder to avoid lost demand — top query in last 7 conversations was temperature kettle.",
    },
  ]

  return {
    revenue_series,
    orders_by_status,
    top_categories,
    aov_paise,
    conversion_rate_pct,
    insights,
  }
})()
