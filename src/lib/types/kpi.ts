export type KPI = {
  id: string
  label: string
  value: number | string
  delta?: number
  /** Higher is better unless inverted. */
  trend?: "up" | "down" | "flat"
  hint?: string
}

export type DashboardData = {
  active_conversations: number
  orders_today: number
  revenue_month_paise: number
  ai_status: "online" | "degraded" | "offline"
  low_stock_products: number
  pending_orders: number
  recent_orders: string[] // order ids
  /** Things that need the merchant's attention. */
  needs_attention: {
    id: string
    title: string
    description: string
    severity: "info" | "warning" | "critical"
    href?: string
  }[]
  // Optional delta fields for KPI comparison
  revenue_vs_prev_pct?: number
  orders_vs_prev_pct?: number
  conversion_vs_prev_pct?: number
  upsell_vs_prev_pct?: number
  aov_vs_prev_pct?: number
  conversion_rate_pct?: number
  upsell_revenue_paise?: number
  aov_paise?: number
  revenue_daily_paise?: { date: string; revenue_paise: number }[]
}
