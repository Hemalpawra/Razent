export type RevenuePoint = { date: string revenue_paise: number orders: number }
export type StatusCount = {
  status: "created" | "paid" | "failed" | "refunded"
  count: number
}
export type CategoryShare = { category: string revenue_paise: number }
export type AnalyticsData = {
  revenue_series: RevenuePoint[]
  orders_by_status: StatusCount[]
  top_categories: CategoryShare[]
  aov_paise: number
  conversion_rate_pct: number
  insights: { id: string title: string detail: string }[]
}
