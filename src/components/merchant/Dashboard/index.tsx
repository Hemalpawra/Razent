import { Link2Icon, SparklesIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { mockDashboard } from "@/lib/mock/kpis"
import { formatPrice } from "@/lib/types/product"
import { mockOrders } from "@/lib/mock/orders"

export default function DashboardScreen() {
  const d = mockDashboard

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Merchant-level signals. Per AI_RULES.md §1: AI status, orders, revenue, needs attention."
      />

      {/* AI Status banner */}
      <div
        className={
          "rounded-xl border px-5 py-4 text-sm flex items-center justify-between gap-4 " +
          (d.ai_status === "online"
            ? "border-green-500/20 bg-green-50/40 text-green-700 dark:border-green-500/30 dark:bg-green-950/20 dark:text-green-300"
            : d.ai_status === "degraded"
              ? "border-amber-500/20 bg-amber-50/40 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300"
              : "border-red-500/20 bg-red-50/40 text-red-700 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-300")
        }
      >
        <div className="flex items-center gap-3">
          <span
            className={
              "inline-flex size-2.5 rounded-full " +
              (d.ai_status === "online"
                ? "bg-green-500"
                : d.ai_status === "degraded"
                  ? "bg-amber-400"
                  : "bg-red-500")
            }
          />
          <span className="font-heading font-medium">AI Agent</span>
          <span className="text-xs text-muted-foreground">
            {d.ai_status === "online" ? "Running" : d.ai_status === "degraded" ? "Limited" : "Offline"} ·{" "}
            {d.active_conversations} active conversation{d.active_conversations === 1 ? "" : "s"}
          </span>
        </div>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            // Placeholder — AI Agent screen coming next per plan.
          }}
          className="text-xs underline underline-offset-2 hover:text-primary"
        >
          View AI Agent
        </a>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Orders today</CardTitle>
            <CardDescription>{d.orders_today}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-[10px] text-muted-foreground">From checkout completions.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue (month)</CardTitle>
            <CardDescription>{formatPrice(d.revenue_month_paise)}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-[10px] text-muted-foreground">Paid orders in last 30 days.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active conversations</CardTitle>
            <CardDescription>{d.active_conversations}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground">Customers talking to the AI agent.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI status</CardTitle>
            <CardDescription className="capitalize">{d.ai_status}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground">Agent is operational.</div>
          </CardContent>
        </Card>
      </div>

      {/* Needs attention */}
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <h3 className="font-heading text-base font-medium">Needs attention</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {d.needs_attention.map((item) => (
            <div
              key={item.id}
              className={
                "rounded-lg border px-4 py-3 text-sm shadow-xs transition-colors hover:bg-muted/30 " +
                (item.severity === "critical"
                  ? "border-red-300/30 bg-red-50/30 dark:bg-red-950/10 dark:border-red-800/40"
                  : item.severity === "warning"
                    ? "border-amber-300/30 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-800/40"
                    : "border-border/60 bg-background/60")
              }
            >
              <div className="flex items-start gap-2">
                <span
                  className={
                    "mt-0.5 inline-block size-1.5 shrink-0 rounded-full " +
                    (item.severity === "critical"
                      ? "bg-red-500"
                      : item.severity === "warning"
                        ? "bg-amber-400"
                        : "bg-muted-foreground/60")
                  }
                />
                <div>
                  <div className="font-heading text-xs font-medium">{item.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{item.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h3 className="font-heading text-base font-medium">Recent orders</h3>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              // Placeholder: open Orders screen
            }}
            className="text-xs text-primary hover:underline"
          >
            View all
          </a>
        </div>
        <div className="divide-y divide-border/50 px-5">
          {d.recent_orders.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No orders yet today.</div>
          ) : (
            d.recent_orders.map((oid) => {
              const order = mockOrders.find((o) => o.id === oid)
              if (!order) return null
              return (
                <a
                  key={order.id}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                  }}
                  className="group flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/30 -mx-5 px-5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{order.id}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatPrice(order.total_paise)}</p>
                  </div>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap " +
                      (order.status === "paid"
                        ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
                        : order.status === "created"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                          : order.status === "failed"
                            ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                            : "bg-muted text-muted-foreground")
                    }
                  >
                    {order.status}
                  </span>
                </a>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}