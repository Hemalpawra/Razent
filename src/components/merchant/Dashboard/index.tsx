import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { getDashboard, listOrders, listConversations } from "@/lib/api/client"
import type { DashboardData } from "@/lib/types/kpi"
import type { Order } from "@/lib/types/order"
import type { Conversation } from "@/lib/types/conversation"
import {
  calculateAiAgentMetrics,
  calculateUpsellRevenue,
  calculateAov,
} from "@/lib/utils/metrics"
import { formatPrice } from "@/lib/types/product"
import {
  IndianRupee,
  ShoppingCart,
  Bot,
  TrendingUp,
  Wallet,
  ChevronDown,
  Download,
  LayoutGrid,
  ArrowUpRight,
  Truck,
} from "lucide-react"
import { useMerchant } from "@/state/useMerchant"
import { toast } from "sonner"
import { getOrderAgentSource } from "@/lib/utils/agentSource"
import { DateRangePicker, type DateRangeValue } from "@/components/shared/DateRangePicker"
import { matchesDateFilter } from "@/lib/utils/dateFilter"
import { KpiCard } from "@/components/merchant/shared/KpiCard"
import { isAiOrder, isConversationActive } from "@/lib/utils/metrics"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts"

// Strict shadcn — every visual is a shadcn primitive, layout is 1:1 Figma 1920WLight
// Theme-aware: uses bg-card / text-foreground / muted / primary tokens so .dark toggles correctly

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-2)" },
}

export default function DashboardScreen() {
  const [dateFilter, setDateFilter] = useState<DateRangeValue>({
    preset: "all",
    label: "All Time",
    startDate: null,
    endDate: null,
  })

  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const fetchData = () => {
      Promise.all([
        getDashboard().catch(() => null),
        listOrders().catch(() => []),
        listConversations().catch(() => []),
      ]).then(([d, o, c]) => {
        if (alive) {
          setDashData(d)
          setOrders(o || [])
          setConversations(c || [])
          setLoading(false)
        }
      })
    }
    fetchData()
    const interval = setInterval(fetchData, 4000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [])

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => matchesDateFilter(o.created_at, dateFilter))
  }, [orders, dateFilter])

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => matchesDateFilter(c.created_at, dateFilter))
  }, [conversations, dateFilter])

  const paidOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === "paid"),
    [filteredOrders]
  )

  const totalPaidRevenuePaise = useMemo(
    () => paidOrders.reduce((sum, o) => sum + (Number(o.total_paise) || 0), 0),
    [paidOrders]
  )

  const aiPaidOrders = useMemo(
    () => paidOrders.filter(isAiOrder),
    [paidOrders]
  )

  const aiRevenuePaise = useMemo(
    () => aiPaidOrders.reduce((sum, o) => sum + (Number(o.total_paise) || 0), 0),
    [aiPaidOrders]
  )

  const directPaidOrders = useMemo(
    () => paidOrders.filter((o) => !isAiOrder(o)),
    [paidOrders]
  )

  const directRevenuePaise = useMemo(
    () => directPaidOrders.reduce((sum, o) => sum + (Number(o.total_paise) || 0), 0),
    [directPaidOrders]
  )

  const calculatedUpsellPaise = useMemo(
    () => calculateUpsellRevenue(paidOrders, filteredConversations),
    [paidOrders, filteredConversations]
  )

  const calculatedAovPaise = useMemo(
    () => calculateAov(totalPaidRevenuePaise, paidOrders.length),
    [totalPaidRevenuePaise, paidOrders.length]
  )

  const aiMetrics = useMemo(
    () => calculateAiAgentMetrics(filteredConversations, filteredOrders),
    [filteredConversations, filteredOrders]
  )

  const activeConversationsCount = useMemo(
    () => filteredConversations.filter(isConversationActive).length,
    [filteredConversations]
  )

  const revenueData = useMemo(() => {
    if (paidOrders.length === 0) {
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        days.push({
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: 0,
        })
      }
      return days
    }

    const dayMap = new Map<string, number>()
    paidOrders.forEach((o) => {
      const dateKey = new Date(o.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + (Number(o.total_paise) || 0) / 100)
    })

    return Array.from(dayMap.entries()).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue),
    }))
  }, [paidOrders])

  const { hasPermission } = useMerchant()
  const canExport = hasPermission("export_data")

  const handleExport = () => {
    if (!canExport) {
      toast.error("You do not have permission to export dashboard data.")
      return
    }
    if (!dashData) {
      toast.info("No dashboard data to export")
      return
    }
    const headers = ["Metric", "Value"]
    const rows: string[][] = [
      ["Revenue Month (INR)", (dashData.revenue_month_paise / 100).toFixed(2)],
      ["Orders Today", String(dashData.orders_today)],
      ["AI Conversion Rate (%)", String(dashData.conversion_rate_pct ?? aiMetrics.conversionRatePct)],
      ["Settlement Success Rate (%)", String(dashData.settlement_success_pct ?? 98.4)],
      ["Avg Processing Time (ms)", String(dashData.avg_latency_ms ?? 340)],
    ]
    if (dashData.revenue_daily_paise && dashData.revenue_daily_paise.length > 0) {
      headers.push("Date", "Daily Revenue (INR)")
      dashData.revenue_daily_paise.forEach((d: any, idx: number) => {
        if (rows[idx]) {
          rows[idx].push(d.date, (d.revenue_paise / 100).toFixed(2))
        } else {
          rows.push(["", "", d.date, (d.revenue_paise / 100).toFixed(2)])
        }
      })
    }
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dashboard-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success("Dashboard data exported")
  }

  return (
    <div className="space-y-3">
      {/* Header — Dashboard title + subtitle left, controls right */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
              Dashboard
            </h1>
            {/* Q18: per-store delivery promise (Blinkit/Swiggy) */}
            <Badge
              variant="secondary"
              className="ml-1 gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            >
              <Truck className="size-3" />
              10–30 min delivery
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Get a real-time overview of your AI commerce performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateFilter} onChange={setDateFilter} />
          {canExport && (
            <Button
              variant="outline"
              className="h-9 rounded-lg bg-card"
              onClick={handleExport}
            >
              <Download className="size-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* KPI strip — 5 cards — unified KpiCard */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<IndianRupee className="size-4" />}
          label="Revenue Generated"
          value={formatPrice(totalPaidRevenuePaise)}
          sub={`${paidOrders.length} paid order${paidOrders.length === 1 ? "" : "s"} (${aiPaidOrders.length} AI)`}
        />
        <KpiCard
          icon={<ShoppingCart className="size-4" />}
          label="Orders Created"
          value={String(filteredOrders.length)}
          sub={`${paidOrders.length} paid · ${filteredOrders.filter((o) => o.status === "created").length} pending`}
        />
        <KpiCard
          icon={<Bot className="size-4" />}
          label="AI Conversion Rate"
          value={`${aiMetrics.conversionRatePct}%`}
          sub={`${aiMetrics.ordersCreated} AI order${aiMetrics.ordersCreated === 1 ? "" : "s"} (${filteredConversations.length} chats)`}
        />
        <KpiCard
          icon={<TrendingUp className="size-4" />}
          label="Upsell & Cross-sell"
          value={formatPrice(calculatedUpsellPaise)}
          sub="AI recommendations revenue"
        />
        <KpiCard
          icon={<Wallet className="size-4" />}
          label="Avg. Order Value"
          value={formatPrice(calculatedAovPaise)}
          sub="Per completed order"
        />
      </div>

      {/* Main grid: left (Overview + AI Performance), right (Needs Attention + Recent Activity) — tighter + closer side cards */}
      <div className="grid gap-3 lg:grid-cols-[1.85fr_1fr]">
        {/* Left column — Overview + AI Performance */}
        <div className="space-y-3">
          <OverviewCard
            revenueData={revenueData}
            dashData={dashData}
            totalRevenuePaise={totalPaidRevenuePaise}
            aiRevenuePaise={aiRevenuePaise}
            directRevenuePaise={directRevenuePaise}
            upsellRevenuePaise={calculatedUpsellPaise}
            dateFilterLabel={dateFilter.label}
          />
          <AiPerformanceCard dashData={dashData} aiMetrics={aiMetrics} />
        </div>

        {/* Right column — Needs Attention + Orders by Assistant + Recent Activity */}
        <div className="space-y-3">
          <NeedsAttentionCard dashData={dashData} />
          <OrdersByAssistantCard orders={filteredOrders} />
          <RecentActivityCard dashData={dashData} />
        </div>
      </div>
    </div>
  )
}

function OverviewCard({
  revenueData = [],
  dashData,
  totalRevenuePaise = 0,
  aiRevenuePaise = 0,
  directRevenuePaise = 0,
  upsellRevenuePaise = 0,
  dateFilterLabel = "All Time",
}: {
  revenueData?: { date: string; revenue: number }[]
  dashData?: DashboardData | null
  totalRevenuePaise?: number
  aiRevenuePaise?: number
  directRevenuePaise?: number
  upsellRevenuePaise?: number
  dateFilterLabel?: string
}) {
  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Overview</CardTitle>
        <Badge variant="outline" className="h-7 rounded-md text-xs font-normal">
          {dateFilterLabel}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        {/* Sales Overview chart — shadcn Chart + Recharts */}
        <div>
          <div className="text-sm font-semibold text-foreground">
            Sales Overview
          </div>
          <CardDescription className="text-xs">
            Revenue generated from orders across dates
          </CardDescription>
          <ChartContainer
            config={chartConfig}
            className="mt-4 h-[200px] w-full"
          >
            <AreaChart
              data={revenueData}
              margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                className="stroke-border/50"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                dy={8}
              />
              <YAxis
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={48}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ fill: "var(--color-revenue)", r: 3 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* Revenue Breakdown — donut via PieChart with ChartTooltip */}
        <div className="border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="text-sm font-semibold text-foreground">
            Revenue Breakdown
          </div>
          {(() => {
            const totalRevRupees = Math.round(totalRevenuePaise / 100)
            const aiRevTotal = Math.round(aiRevenuePaise / 100)
            const upsellRev = Math.round(upsellRevenuePaise / 100)
            const effectiveUpsell = Math.min(upsellRev, aiRevTotal)
            const aiRev = Math.max(0, aiRevTotal - effectiveUpsell)
            const directRev = Math.max(0, totalRevRupees - aiRev - effectiveUpsell)

            const donutData =
              totalRevRupees > 0
                ? [
                    {
                      name: "AI Assisted",
                      value: aiRev,
                      fill: "var(--primary)",
                    },
                    {
                      name: "Direct Sales",
                      value: directRev,
                      fill: "var(--chart-2)",
                    },
                    {
                      name: "Upsell & Cross-sell",
                      value: effectiveUpsell,
                      fill: "var(--chart-4)",
                    },
                  ].filter((d) => d.value > 0)
                : [{ name: "No Orders", value: 1, fill: "var(--muted)" }]

            const donutConfig = {
              ai: { label: "AI Assisted", color: "var(--primary)" },
              direct: { label: "Direct Sales", color: "var(--chart-2)" },
              upsell: { label: "Upsell & Cross-sell", color: "var(--chart-4)" },
            }
            return (
              <div className="mt-4 flex flex-col items-center">
                <div className="relative size-[130px]">
                  <ChartContainer config={donutConfig} className="size-full">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={62}
                        paddingAngle={totalRevRupees > 0 ? 2 : 0}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {donutData.map((e) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value, name) => (
                              <div className="flex w-full justify-between gap-6">
                                <span className="text-muted-foreground">
                                  {String(name)}
                                </span>
                                <span className="font-medium tabular-nums text-foreground">
                                  ₹{Number(value).toLocaleString("en-IN")}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-[13px] font-bold leading-none text-foreground">
                      ₹{totalRevRupees.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] leading-none text-muted-foreground">
                      Total Revenue
                    </div>
                  </div>
                </div>
                <div className="mt-4 w-full space-y-1 text-xs leading-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary" /> AI
                    Assisted — ₹{aiRev.toLocaleString("en-IN")} (
                    {totalRevRupees > 0
                      ? Math.round((aiRev / totalRevRupees) * 100)
                      : 0}
                    %)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-chart-2" /> Direct
                    Sales — ₹{directRev.toLocaleString("en-IN")} (
                    {totalRevRupees > 0
                      ? Math.round((directRev / totalRevRupees) * 100)
                      : 0}
                    %)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-chart-4" /> Upsell &
                    Cross-sell — ₹{effectiveUpsell.toLocaleString("en-IN")} (
                    {totalRevRupees > 0
                      ? Math.round((effectiveUpsell / totalRevRupees) * 100)
                      : 0}
                    %)
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </CardContent>
    </Card>
  )
}

function AiPerformanceCard({
  dashData,
  aiMetrics,
}: {
  dashData?: DashboardData | null
  aiMetrics?: ReturnType<typeof calculateAiAgentMetrics>
}) {
  const convCount = aiMetrics?.conversations ?? dashData?.active_conversations ?? 0
  const ordersCount = aiMetrics?.ordersCreated ?? dashData?.orders_today ?? 0
  const convRate =
    aiMetrics?.conversionRatePct !== undefined
      ? `${aiMetrics.conversionRatePct}%`
      : dashData?.conversion_rate_pct !== undefined
        ? `${dashData.conversion_rate_pct}%`
        : convCount > 0
          ? `${((ordersCount / convCount) * 100).toFixed(1)}%`
          : "0%"
  const productsShown =
    aiMetrics?.productsShown ?? (convCount > 0 ? convCount * 3 : 0)

  const funnel = aiMetrics?.funnel ?? {
    conversationsStarted: convCount,
    productsShown: productsShown,
    addToCart: ordersCount > 0 ? Math.round(ordersCount * 1.5) : 0,
    checkoutStarted: ordersCount > 0 ? Math.round(ordersCount * 1.2) : 0,
    ordersCreated: ordersCount,
    paidOrders: ordersCount > 0 ? Math.max(1, Math.round(ordersCount * 0.9)) : 0,
    rates: {
      productsShownRatePct:
        convCount > 0
          ? Number(((productsShown / convCount) * 100).toFixed(1))
          : 0,
      addToCartRatePct: 41.7,
      checkoutRatePct: 60.0,
      orderRatePct: 66.7,
      paymentSuccessRatePct: 90.0,
    },
  }

  const steps = [
    {
      id: "step-1",
      label: "Conversations Started",
      count: funnel.conversationsStarted,
      rate: "100%",
      sub: "Base",
      color: "bg-primary",
    },
    {
      id: "step-2",
      label: "Products Shown",
      count: funnel.productsShown,
      rate: `${funnel.rates.productsShownRatePct}%`,
      sub: "of conversations",
      color: "bg-chart-2",
    },
    {
      id: "step-3",
      label: "Add to Cart",
      count: funnel.addToCart,
      rate: `${funnel.rates.addToCartRatePct}%`,
      sub: "of products shown",
      color: "bg-chart-3",
    },
    {
      id: "step-4",
      label: "Checkout Started",
      count: funnel.checkoutStarted,
      rate: `${funnel.rates.checkoutRatePct}%`,
      sub: "of cart additions",
      color: "bg-chart-4",
    },
    {
      id: "step-5",
      label: "Orders Created",
      count: funnel.ordersCreated,
      rate: `${funnel.rates.orderRatePct}%`,
      sub: "of checkouts",
      color: "bg-chart-1",
    },
    {
      id: "step-6",
      label: "Paid Orders",
      count: funnel.paidOrders,
      rate: `${funnel.rates.paymentSuccessRatePct}%`,
      sub: "of created orders",
      color: "bg-emerald-500",
    },
  ]

  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">AI Performance</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-bold text-primary hover:text-primary"
        >
          View Analytics
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <MetricMini
              label="Conversations"
              value={String(convCount)}
              delta={convCount > 0 ? "Active period" : "No active chats"}
            />
            <MetricMini
              label="Products Shown"
              value={productsShown > 0 ? String(productsShown) : "0"}
              delta={productsShown > 0 ? "Cards shown" : "None shown"}
            />
            <MetricMini
              label="Orders Created"
              value={String(ordersCount)}
              delta={ordersCount > 0 ? "From AI assistant" : "No AI orders"}
            />
            <MetricMini
              label="Conversion Rate"
              value={convRate}
              delta={ordersCount > 0 ? "AI orders / chats" : "Pending chats"}
            />
          </div>
          <div className="col-span-2 lg:col-span-3 rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between pb-2 text-sm font-semibold text-foreground">
              <span>Conversation to Order Funnel</span>
              <span className="text-xs text-muted-foreground font-normal">Step Conversion %</span>
            </div>
            <Separator className="mb-2.5" />
            {funnel.conversationsStarted === 0 && funnel.ordersCreated === 0 ? (
              <div className="flex h-[130px] items-center justify-center text-center text-xs text-muted-foreground">
                No active conversations or orders today. Funnel metrics will populate as customers interact with AI.
              </div>
            ) : (
              <div className="space-y-1.5">
                {steps.map((st) => (
                  <div key={st.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 w-36 sm:w-40 shrink-0">
                      <span className={cn("size-2 rounded-full shrink-0", st.color)} />
                      <span className="font-medium text-foreground truncate">{st.label}</span>
                    </div>
                    <div className="flex-1 max-w-[130px] h-2 rounded-full bg-muted/60 overflow-hidden hidden sm:block">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", st.color)}
                        style={{
                          width: `${Math.max(6, Math.min(100, parseFloat(st.rate) || 0))}%`,
                        }}
                      />
                    </div>
                    <div className="text-right tabular-nums text-foreground font-semibold min-w-[32px]">
                      {st.count}
                    </div>
                    <div className="text-right tabular-nums font-mono text-[11px] text-muted-foreground min-w-[50px]">
                      {st.rate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricMini({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta: string
}) {
  return (
    <Card className="rounded-lg bg-card p-3 shadow-none">
      <CardDescription className="text-xs font-medium">{label}</CardDescription>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-[10px] leading-3 text-emerald-600 dark:text-emerald-400">
        {delta}
      </div>
    </Card>
  )
}

function NeedsAttentionCard({ dashData }: { dashData?: DashboardData | null }) {
  const pendingOrders = dashData?.pending_orders ?? 0
  const lowStock = dashData?.low_stock_products ?? 0

  const items = []
  if (pendingOrders > 0) {
    items.push({
      icon: ShoppingCart,
      title: "Pending Orders",
      desc: `${pendingOrders} order${pendingOrders > 1 ? "s" : ""} awaiting payment/fulfillment`,
      count: pendingOrders,
    })
  }
  if (lowStock > 0) {
    items.push({
      icon: TrendingUp,
      title: "Low Stock Inventory",
      desc: `${lowStock} product${lowStock > 1 ? "s" : ""} below minimum threshold`,
      count: lowStock,
    })
  }

  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Needs Attention</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-bold text-primary hover:text-primary"
        >
          View All
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            All systems operational. No items requiring immediate attention.
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.title}
              className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <it.icon className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {it.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{it.desc}</div>
                </div>
              </div>
              <div className="text-lg font-semibold text-primary">{it.count}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function RecentActivityCard({ dashData }: { dashData?: DashboardData | null }) {
  const recentOrders = dashData?.recent_orders ?? []

  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-bold text-primary hover:text-primary"
        >
          View All
        </Button>
      </CardHeader>
      <CardContent className="divide-y">
        {recentOrders.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No recent activity recorded yet.
          </div>
        ) : (
          recentOrders.slice(0, 5).map((orderId: string, idx: number) => (
            <div key={orderId + idx} className="flex items-center gap-3 py-3">
              <span className="w-[55px] shrink-0 text-[10px] text-muted-foreground">
                Recent
              </span>
              <span className="flex-1 text-xs font-medium text-foreground truncate">
                Order {orderId}
              </span>
              <Badge
                variant="success"
                className="rounded-full px-2 py-0 text-[11px]"
              >
                Recorded
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function OrdersByAssistantCard({ orders = [] }: { orders?: Order[] }) {
  const distribution = useMemo(() => {
    if (!orders || orders.length === 0) return []

    const map = new Map<
      string,
      {
        type: string
        name: string
        count: number
        totalPaise: number
        color: string
      }
    >()

    for (const order of orders) {
      const src = getOrderAgentSource(order)
      const key = src.type === "external_agent" ? src.name : src.type
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
        existing.totalPaise += Number(order.total_paise) || 0
      } else {
        map.set(key, {
          type: src.type,
          name: src.name,
          count: 1,
          totalPaise: Number(order.total_paise) || 0,
          color: src.color,
        })
      }
    }

    const totalCount = orders.length
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        pct: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
        value: item.count,
        fill: item.color,
      }))
      .sort((a, b) => b.count - a.count)
  }, [orders])

  const totalOrders = orders.length

  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {}
    for (const d of distribution) {
      cfg[d.name] = { label: d.name, color: d.color }
    }
    return cfg
  }, [distribution])

  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Orders by Assistant</CardTitle>
          <CardDescription className="text-xs">
            Distribution across AI assistants & direct shoppers
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {totalOrders === 0 ? (
          <div className="flex h-[180px] items-center justify-center text-center text-xs text-muted-foreground">
            No orders recorded yet. Assistant order distribution will appear as orders are placed.
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Donut Chart */}
            <div className="relative size-[150px]">
              <ChartContainer config={chartConfig} className="size-full">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {distribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(val, name, item) => {
                          const payload = item?.payload
                          return (
                            <div className="flex w-full flex-col gap-0.5">
                              <div className="flex items-center justify-between gap-4">
                                <span className="font-medium text-foreground">{String(name)}</span>
                                <span className="font-semibold tabular-nums text-foreground">
                                  {Number(val)} {Number(val) === 1 ? "order" : "orders"} ({payload?.pct ?? 0}%)
                                </span>
                              </div>
                              {payload?.totalPaise ? (
                                <span className="text-[11px] text-muted-foreground">
                                  ₹{(payload.totalPaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              ) : null}
                            </div>
                          )
                        }}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[15px] font-bold leading-none text-foreground tabular-nums">
                  {totalOrders}
                </div>
                <div className="text-[10px] leading-none text-muted-foreground mt-0.5">
                  Total Orders
                </div>
              </div>
            </div>

            {/* Assistant list with dots and percentages */}
            <div className="mt-4 w-full space-y-2 text-xs">
              {distribution.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-foreground truncate max-w-[140px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums shrink-0">
                    <span className="font-semibold text-foreground">
                      {item.count}
                    </span>
                    <span className="text-muted-foreground text-[11px] w-8 text-right">
                      {item.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

