import {
  IndianRupee,
  ShoppingCart,
  Bot,
  TrendingUp,
  Wallet,
  ChevronDown,
  Download,
  Lightbulb,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts"
import { mockAnalytics } from "@/lib/mock/analytics"
import { formatPrice } from "@/lib/types/product"

// Figma 1920WLight-4 — Analytics layout
// Header: Analytics + "Track performance..." + date range + Export + avatar
// KPIs: 5 cards — Revenue Generated, Orders Created, AI Conversion, Upsell Revenue, Avg Order Value
// Charts: Revenue Over Time (AreaChart), Orders by status (BarChart vertical), Category breakdown (Pie donut)
// Strict shadcn: only Card, Button, Badge, ChartContainer (+ recharts primitives), theme tokens, rounded-xl

const barColors: Record<string, string> = {
  paid: "var(--chart-2)",
  created: "var(--chart-3)",
  failed: "var(--destructive)",
  refunded: "var(--muted-foreground)",
}

const pieColors = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
]

export default function AnalyticsScreen() {
  const a = mockAnalytics
  const totalRevenuePaise = a.revenue_series.reduce((s, r) => s + r.revenue_paise, 0)
  const totalOrders = a.orders_by_status.reduce((s, o) => s + o.count, 0)

  const revenueData = a.revenue_series.map((r) => ({
    label: new Date(r.date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    date: r.date.slice(5),
    revenue: r.revenue_paise / 100,
    revenue_paise: r.revenue_paise,
  }))

  const ordersData = a.orders_by_status.map((o) => ({
    status: o.status,
    count: o.count,
    fill: barColors[o.status] ?? "var(--chart-2)",
  }))

  const categoryData = a.top_categories.map((c, i) => ({
    name: c.category,
    value: c.revenue_paise / 100,
    revenue_paise: c.revenue_paise,
    fill: pieColors[i % pieColors.length],
  }))

  const revenueConfig = {
    revenue: { label: "Revenue", color: "var(--primary)" },
  }
  const ordersConfig = {
    paid: { label: "Paid", color: "var(--chart-2)" },
    created: { label: "Created", color: "var(--chart-3)" },
    failed: { label: "Failed", color: "var(--destructive)" },
    refunded: { label: "Refunded", color: "var(--muted-foreground)" },
    count: { label: "Orders", color: "var(--primary)" },
  }
  const categoryConfig = {
    revenue: { label: "Revenue", color: "var(--primary)" },
  }

  return (
    <div className="space-y-4 bg-muted/30 -m-6 p-6">
      {/* Header — Figma Header: Analytics title + subtitle left, date range + Export + avatar right */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Track performance and insights from AI commerce operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-xl bg-card">
            May 20, 2025 - May 27, 2025
            <ChevronDown className="size-4 opacity-60" />
          </Button>
          <Button variant="outline" className="h-9 rounded-xl bg-card">
            <Download className="size-4" />
            Export
          </Button>
          <div className="hidden items-center gap-3 pl-2 lg:flex">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              MS
            </div>
            <div className="leading-none">
              <div className="text-xs font-bold text-foreground">Merchant Store</div>
              <div className="text-[11px] text-muted-foreground">Super Admin</div>
            </div>
            <span className="text-xs text-muted-foreground">⌄</span>
          </div>
        </div>
      </div>

      {/* KPI strip — 5 cards — Figma Container12 / Background1..9 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<IndianRupee className="size-4" />}
          label="Revenue Generated"
          value={formatPrice(totalRevenuePaise)}
          delta="↑ 18.6% vs May 13 - May 19"
        />
        <KpiCard
          icon={<ShoppingCart className="size-4" />}
          label="Orders Created"
          value={String(totalOrders || 256)}
          delta="↑ 16.2% vs May 13 - May 19"
        />
        <KpiCard
          icon={<Bot className="size-4" />}
          label="AI Conversion Rate"
          value={`${a.conversion_rate_pct}%`}
          delta="↑ 5.3% vs May 13 - May 19"
        />
        <KpiCard
          icon={<TrendingUp className="size-4" />}
          label="Upsell Revenue"
          value={formatPrice(a.top_categories[0]?.revenue_paise ?? 12456000)}
          delta="↑ 22.8% vs May 13 - May 19"
        />
        <KpiCard
          icon={<Wallet className="size-4" />}
          label="Avg. Order Value"
          value={formatPrice(a.aov_paise || 341900)}
          delta="↑ 2.7% vs May 13 - May 19"
        />
      </div>

      {/* Charts row 1: Revenue trend AreaChart (2 cols) + Orders by status BarChart (1 col) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl bg-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base text-foreground">Revenue Over Time</CardTitle>
              <CardDescription className="text-xs">Daily revenue from paid orders (last 14 days)</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-8 rounded-xl bg-card">
              7 Day
              <ChevronDown className="size-4 opacity-60" />
            </Button>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-[264px] w-full">
              <AreaChart data={revenueData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  dy={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}K`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  width={52}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        formatPrice(Math.round(Number(value) * 100))
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  fill="var(--color-revenue)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-revenue)", strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base text-foreground">Orders by status</CardTitle>
              <CardDescription className="text-xs">Count per status (demo)</CardDescription>
            </div>
            <Badge variant="secondary" className="rounded-full text-[11px]">
              {totalOrders} total
            </Badge>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ordersConfig} className="h-[220px] w-full">
              <BarChart data={ordersData} layout="vertical" margin={{ left: 12, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  width={72}
                  tickFormatter={(v) => String(v).charAt(0).toUpperCase() + String(v).slice(1)}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" radius={[8, 8, 8, 8]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ordersData.map((o) => (
                <Badge
                  key={o.status}
                  variant="outline"
                  className="rounded-full border-border/60 text-[11px] capitalize"
                >
                  <span className="mr-1.5 size-2 rounded-full" style={{ background: o.fill }} />
                  {o.status}: {o.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Category breakdown Pie + Business insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Revenue by category</CardTitle>
            <CardDescription className="text-xs">Paid orders only — breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryConfig} className="mx-auto h-[220px] w-full">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <div className="flex w-full justify-between gap-6">
                          <span className="text-muted-foreground">{String(name)}</span>
                          <span className="font-medium tabular-nums text-foreground">
                            {formatPrice(Math.round(Number(value) * 100))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
            <div className="divide-y divide-border/50">
              {a.top_categories.map((c, i) => (
                <div key={c.category} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                    <span className="text-muted-foreground">{c.category}</span>
                  </div>
                  <span className="font-medium tabular-nums text-foreground">{formatPrice(c.revenue_paise)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 pb-4">
            <CardTitle className="text-base text-foreground">Business insights</CardTitle>
            <Badge variant="secondary" className="rounded-full text-[11px]">
              Updated just now
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {a.insights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Lightbulb className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5 text-foreground">{insight.title}</p>
                    <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{insight.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode
  label: string
  value: string
  delta: string
}) {
  const [up, rest] = delta.split(" vs ")
  return (
    <Card className="rounded-xl bg-card p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <CardDescription className="text-[13px] font-medium text-muted-foreground">{label}</CardDescription>
          <div className="mt-1 text-xl font-semibold leading-6 tracking-tight text-foreground">{value}</div>
          <div className="mt-1 text-[10px] leading-3">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{up} </span>
            <span className="text-muted-foreground">vs {rest}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
