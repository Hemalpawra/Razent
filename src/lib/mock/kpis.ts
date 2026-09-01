import { mockOrders } from "@/lib/mock/orders"
import { mockProducts } from "@/lib/mock/products"
import type { DashboardData } from "@/lib/types/kpi"

/**
 * Dashboard aggregate. Derived from mocks today; will become a Supabase
 * RPC tomorrow (e.g. `get_dashboard_metrics()` server function).
 */
export const mockDashboard: DashboardData = (() => {
  const today = "2026-08-31"
  const ordersToday = mockOrders.filter((o) =>
    o.created_at.startsWith(today),
  )

  const pending = mockOrders.filter(
    (o) => o.status === "created" || o.shipping_status === "pending",
  ).length

  const lowStock = mockProducts.filter(
    (p) => p.status === "active" && p.stock <= 10,
  ).length

  const revenueMonth = mockOrders
    .filter((o) => o.status === "paid" || o.status === "refunded")
    .filter((o) => o.created_at.startsWith("2026-08"))
    .reduce((sum, o) => sum + o.total_paise, 0)

  // "needs attention" — synthesized so the dashboard has signal.
  const needs_attention: DashboardData["needs_attention"] = [
    {
      id: "need_1",
      title: `${lowStock} product${lowStock === 1 ? "" : "s"} low on stock`,
      description:
        "Smart Temperature Kettle is out of stock; Standing Desk and Mesh Wi-Fi have < 10 units.",
      severity: "warning",
    },
    {
      id: "need_2",
      title: `${pending} order${pending === 1 ? "" : "s"} awaiting payment`,
      description: "Customers opened checkout but didn't complete Razorpay payment.",
      severity: "critical",
    },
    {
      id: "need_3",
      title: "1 refund processed in last 7 days",
      description: "Mechanical Keyboard 75% — investigate product page for clarity.",
      severity: "info",
    },
    {
      id: "need_4",
      title: "AI Agent screen coming soon",
      description: "Active conversations and AI insights will live here once the screen ships.",
      severity: "info",
    },
  ]

  return {
    active_conversations: 7,
    orders_today: ordersToday.length,
    revenue_month_paise: revenueMonth,
    ai_status: "online",
    low_stock_products: lowStock,
    pending_orders: pending,
    recent_orders: mockOrders
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5)
      .map((o) => o.id),
    needs_attention,
  }
})()