import { IndianRupee, ShoppingCart, Bot, TrendingUp, Wallet, ChevronDown, Download, Lightbulb, Box, MessageCircle, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts"
import { mockAnalytics } from "@/lib/mock/analytics"
import { mockOrders } from "@/lib/mock/orders"
import { mockProducts } from "@/lib/mock/products"
import { formatPrice } from "@/lib/types/product"

// Strict shadcn: Card, Button, Badge, ChartContainer (Area/Bar/Pie), Table, Skeleton. Theme tokens only (chart-* vars).

type AnalyticsProps = { loading?: boolean }

const barColors: Record<string, string> = {
  paid: "var(--chart-2)",
  created: "var(--chart-3)",
  failed: "var(--destructive)",
  refunded: "var(--muted-foreground)",
}

const pieColors = ["var(--chart-2)", "var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"]

// Source grouping — derived from mockOrders via_ai/conversation_id.
// Fallback to ~45/30/25 split if needed so donut always renders.
function getSourceGroups() {
  const total = mockOrders.length
  const viaAi = mockOrders.filter((o) => o.via_ai).length
  const customer = total - viaAi
  // split via_ai into AI Assistant vs AI Agent
  const aiAssistant = Math.round(viaAi * 0.64) // ~45% of total when viaAi ~70%
  const aiAgent = viaAi - aiAssistant

  // If mock distribution is skewed, clamp to spec ratios while keeping real total
  // Ensure each slice >0 for demo
  const safeAssistant = aiAssistant || Math.round(total * 0.45)
  const safeCustomer = customer || Math.round(total * 0.30)
  const safeAgent = aiAgent || Math.round(total * 0.25)
  // normalize to total
  const sum = safeAssistant + safeCustomer + safeAgent
  const norm = (n: number) => Math.round((n / sum) * total) || 1

  const ordersBySource = [
    { name: "AI Assistant", value: norm(safeAssistant), fill: "var(--chart-2)" },
    { name: "Customer", value: norm(safeCustomer), fill: "var(--chart-1)" },
    { name: "AI Agent", value: norm(safeAgent), fill: "var(--chart-3)" },
  ]

  const revenueBySource = (() => {
    const viaAiRevenue = mockOrders.filter((o) => o.via_ai).reduce((s, o) => s + o.total_paise, 0)
    const customerRevenue = mockOrders.filter((o) => !o.via_ai).reduce((s, o) => s + o.total_paise, 0)
    const assistantRev = Math.round(viaAiRevenue * 0.64)
    const agentRev = viaAiRevenue - assistantRev
    const totalRev = viaAiRevenue + customerRevenue || 1
    // avoid zero slices
    const rAssistant = assistantRev || Math.round(totalRev * 0.48)
    const rCustomer = customerRevenue || Math.round(totalRev * 0.32)
    const rAgent = agentRev || Math.round(totalRev * 0.20)
    return [
      { name: "AI Assistant", value: rAssistant / 100, revenue_paise: rAssistant, fill: "var(--chart-2)" },
      { name: "Customer", value: rCustomer / 100, revenue_paise: rCustomer, fill: "var(--chart-1)" },
      { name: "AI Agent", value: rAgent / 100, revenue_paise: rAgent, fill: "var(--chart-3)" },
    ]
  })()

  return { ordersBySource, revenueBySource }
}

const funnelStages = [
  { label: "Conversations Started", count: 432 },
  { label: "Products Shown", count: 356 },
  { label: "Add to Cart", count: 124 },
  { label: "Checkout Initiated", count: 89 },
  { label: "Orders Created", count: 56 },
  { label: "Order Completed", count: 48 },
]

export default function AnalyticsScreen({ loading = false }: AnalyticsProps) {
  const a = mockAnalytics
  const totalRevenuePaise = a.revenue_series.reduce((s, r) => s + r.revenue_paise, 0)
  const totalOrders = a.orders_by_status.reduce((s, o) => s + o.count, 0)

  const revenueData = a.revenue_series.map((r) => ({
    label: new Date(r.date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    revenue: r.revenue_paise / 100,
  }))

  const { ordersBySource, revenueBySource } = getSourceGroups()
  const totalSourceOrders = ordersBySource.reduce((s, d) => s + d.value, 0)
  const totalSourceRevenue = revenueBySource.reduce((s, d) => s + d.revenue_paise, 0)

  // Top Performing Products — derive from mockOrders + mockProducts, top 5 by orders/revenue
  const productStats = (() => {
    const map = new Map<string, { orders: number; revenue: number }>()
    for (const o of mockOrders) {
      for (const item of o.items) {
        const cur = map.get(item.product_id) ?? { orders: 0, revenue: 0 }
        cur.orders += 1
        cur.revenue += item.unit_price_paise * item.qty
        map.set(item.product_id, cur)
      }
    }
    return mockProducts
      .map((p) => {
        const s = map.get(p.id) ?? { orders: 0, revenue: 0 }
        // fake upsell + conversion for demo; deterministic from id
        const upsell = Math.round(s.revenue * 0.18)
        const conv = s.orders ? Math.min(24, Math.round(4 + (s.orders * 3.7) % 18) * 10) / 10 : 2.4
        return { product: p, orders: s.orders, revenue: s.revenue, upsell, conv }
      })
      .sort((x, y) => y.revenue - x.revenue || y.orders - x.orders)
      .slice(0, 5)
  })()

  // AI Conversation Over Time — 14 days bar, deterministic
  const conversationDaily = a.revenue_series.map((r, i) => ({
    label: new Date(r.date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    conversations: 18 + ((i * 7 + r.orders * 3) % 28),
  }))

  const revenueConfig = { revenue: { label: "Revenue", color: "var(--primary)" } }
  const sourceOrdersConfig = {
    assistant: { label: "AI Assistant", color: "var(--chart-2)" },
    customer: { label: "Customer", color: "var(--chart-1)" },
    agent: { label: "AI Agent", color: "var(--chart-3)" },
  }
  const conversationConfig = { conversations: { label: "Conversations", color: "var(--primary)" } }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="rounded-xl bg-card p-5">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="mt-3 h-4 w-24" />
              <Skeleton className="mt-2 h-6 w-20" />
            </Card>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.85fr_1fr]">
          <Card className="rounded-xl bg-card lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[264px] w-full rounded-lg" />
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-card">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[220px] w-full rounded-full" />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.85fr_1fr]">
          <Card className="rounded-xl bg-card">
            <CardContent className="p-6">
              <Skeleton className="h-[220px] w-full rounded-full" />
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-card lg:col-span-2">
            <CardContent className="p-6">
              <Skeleton className="h-[260px] w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">Analytics</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Track performance and insights from AI commerce operations.</p>
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
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">MS</div>
            <div className="leading-none">
              <div className="text-xs font-bold text-foreground">Merchant Store</div>
              <div className="text-[11px] text-muted-foreground">Super Admin</div>
            </div>
            <span className="text-xs text-muted-foreground">⌄</span>
          </div>
        </div>
      </div>

      {/* KPI strip — 5 cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={<IndianRupee className="size-4" />} label="Revenue Generated" value={formatPrice(totalRevenuePaise)} delta="↑ 18.6% vs May 13 - May 19" />
        <KpiCard icon={<ShoppingCart className="size-4" />} label="Orders Created" value={String(totalOrders || 256)} delta="↑ 16.2% vs May 13 - May 19" />
        <KpiCard icon={<Bot className="size-4" />} label="AI Conversion Rate" value={`${a.conversion_rate_pct}%`} delta="↑ 5.3% vs May 13 - May 19" />
        <KpiCard
          icon={<TrendingUp className="size-4" />}
          label="Upsell Revenue"
          value={formatPrice(a.top_categories[0]?.revenue_paise ?? 12456000)}
          delta="↑ 22.8% vs May 13 - May 19"
        />
        <KpiCard icon={<Wallet className="size-4" />} label="Avg. Order Value" value={formatPrice(a.aov_paise || 341900)} delta="↑ 2.7% vs May 13 - May 19" />
      </div>

      {/* Row 2: Revenue Over Time (col-span-2) + Orders by Source donut */}
      <div className="grid gap-3 lg:grid-cols-[1.85fr_1fr]">
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
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} dy={8} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}K`} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={52} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatPrice(Math.round(Number(value) * 100))} />} />
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

        <DonutCard title="Orders by Source" description="Distribution by order origin" data={ordersBySource} totalLabel={`${totalSourceOrders} orders`} centerValue={String(totalSourceOrders)} />
      </div>

      {/* Row 3: Revenue by Source donut + Funnel (col-span-2) */}
      <div className="grid gap-3 lg:grid-cols-[1.85fr_1fr]">
        <DonutCard
          title="Revenue by Source"
          description="Revenue share by origin"
          data={revenueBySource.map((d) => ({ name: d.name, value: d.value, fill: d.fill }))}
          totalLabel={formatPrice(totalSourceRevenue)}
          centerValue={formatPrice(totalSourceRevenue)}
          valueFormatter={(v) => formatPrice(Math.round(Number(v) * 100))}
        />
        <FunnelCard />
      </div>

      {/* Row 4: Top Products (col-span-2) + Conversation bar */}
      <div className="grid gap-3 lg:grid-cols-[1.85fr_1fr]">
        <Card className="rounded-xl bg-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Top Performing Products</CardTitle>
            <CardDescription className="text-xs">By orders and revenue — last 14 days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {productStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <p className="text-sm text-muted-foreground">No product data yet.</p>
                <Button size="sm" variant="outline">
                  <Bot className="size-4" /> Go to AI Agent
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold text-foreground">Product</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-foreground">Orders</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-foreground">Revenue</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-foreground">Upsell Revenue</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-foreground">Conversion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productStats.map((row) => (
                    <TableRow key={row.product.id} className="hover:bg-muted/30">
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Box className="size-3.5" />
                          </span>
                          <span className="text-sm font-medium text-foreground">{row.product.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-right text-sm tabular-nums text-foreground">{row.orders}</TableCell>
                      <TableCell className="px-3 text-right text-sm font-medium tabular-nums text-foreground">{formatPrice(row.revenue)}</TableCell>
                      <TableCell className="px-3 text-right text-sm tabular-nums text-muted-foreground">{formatPrice(row.upsell)}</TableCell>
                      <TableCell className="px-3 text-right">
                        <Badge variant="secondary" className="rounded-full text-[11px] tabular-nums">
                          {row.conv.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">AI Conversation Over Time</CardTitle>
            <CardDescription className="text-xs">Daily conversations — last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={conversationConfig} className="h-[240px] w-full">
              <BarChart data={conversationDaily} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} dy={8} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={32} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="conversations" fill="var(--color-conversations)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 5: AI Overview + Insights */}
      <div className="grid gap-3 lg:grid-cols-[1.85fr_1fr]">
        <Card className="rounded-xl bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">AI Conversation Overview</CardTitle>
            <CardDescription className="text-xs">Key conversation metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <StatTile icon={<MessageCircle className="size-3.5" />} label="Total Conversations" value="342" sub="Last 14 days" />
              <StatTile icon={<Bot className="size-3.5" />} label="Active Conversations" value="28" sub="Currently ongoing" />
              <StatTile icon={<TrendingUp className="size-3.5" />} label="Conversation to Orders" value="12.4%" sub="Conversion rate" />
              <StatTile icon={<Clock className="size-3.5" />} label="Avg Response Time" value="1.2s" sub="AI reply speed" />
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
            {a.insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <p className="text-sm text-muted-foreground">No insights yet.</p>
                <Button size="sm" variant="outline">
                  <Bot className="size-4" /> Go to AI Agent
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {a.insights.map((insight) => (
                  <div key={insight.id} className="flex gap-3 px-5 py-4 transition-colors hover:bg-muted/30">
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta: string }) {
  const [up, rest] = delta.split(" vs ")
  return (
    <Card className="rounded-xl bg-card p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">{icon}</div>
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

function DonutCard({
  title,
  description,
  data,
  centerValue,
  totalLabel,
  valueFormatter,
}: {
  title: string
  description: string
  data: { name: string; value: number; fill: string }[]
  centerValue: string
  totalLabel: string
  valueFormatter?: (v: number) => string
}) {
  const config: Record<string, { label: string; color: string }> = {}
  for (const d of data) config[d.name] = { label: d.name, color: d.fill }

  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ChartContainer config={config} className="mx-auto h-[220px] w-full">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {data.map((entry) => (
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
                          {valueFormatter ? valueFormatter(Number(value)) : String(value)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold leading-none text-foreground">{centerValue}</span>
            <span className="text-[11px] text-muted-foreground">{totalLabel}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {data.map((d) => (
            <span key={d.name} className="inline-flex items-center gap-1.5 text-xs">
              <span className="size-2 rounded-full" style={{ background: d.fill }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-medium tabular-nums text-foreground">{d.value}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function FunnelCard() {
  const max = funnelStages[0].count
  return (
    <Card className="rounded-xl bg-card lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">Conversation to Order Funnel</CardTitle>
        <CardDescription className="text-xs">Step-by-step conversion — last 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnelStages.map((stage, idx) => {
            const prev = idx === 0 ? stage.count : funnelStages[idx - 1].count
            const conv = idx === 0 ? 100 : (stage.count / prev) * 100
            const widthPct = (stage.count / max) * 100
            return (
              <Tooltip key={stage.label}>
                <TooltipTrigger asChild>
                  <div className="space-y-1 cursor-default">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{stage.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums text-foreground">{stage.count}</span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                          {conv.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-primary/20">
                      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {stage.label}: {stage.count} · {conv.toFixed(1)}% conv · {widthPct.toFixed(1)}% of start
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold leading-none text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}
