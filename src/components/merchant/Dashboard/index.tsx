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
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts"

// Strict shadcn — every visual is a shadcn primitive, layout is 1:1 Figma 1920WLight
// Theme-aware: uses bg-card / text-foreground / muted / primary tokens so .dark toggles correctly

const revenueData = [
  { date: "21 May", revenue: 40000 },
  { date: "22 May", revenue: 75000 },
  { date: "23 May", revenue: 62000 },
  { date: "24 May", revenue: 88000 },
  { date: "25 May", revenue: 52000 },
  { date: "26 May", revenue: 110000 },
  { date: "27 May", revenue: 124560 },
]

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-2)" },
}

export default function DashboardScreen() {
  return (
    <div className="space-y-4 bg-muted/30 -m-6 p-6">
      {/* Header — Figma Header: Dashboard title + subtitle left, controls right */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Get a real-time overview of your AI commerce performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg bg-card">
            May 20, 2025 - May 27, 2025
            <ChevronDown className="size-4 opacity-60" />
          </Button>
          <Button variant="outline" className="h-9 rounded-lg bg-card">
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

      {/* KPI strip — 5 cards — Figma Container12 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={<IndianRupee className="size-4" />} label="Revenue Generated" value="₹1,000.00" delta="↑ 18.6% vs May 13 - May 19" />
        <KpiCard icon={<ShoppingCart className="size-4" />} label="Orders Created" value="256" delta="↑ 16.2% vs May 13 - May 19" />
        <KpiCard icon={<Bot className="size-4" />} label="AI Conversion Rate" value="24.5%" delta="↑ 5.3% vs May 13 - May 19" />
        <KpiCard icon={<TrendingUp className="size-4" />} label="Upsell Revenue" value="₹1,24,560" delta="↑ 22.8% vs May 13 - May 19" />
        <KpiCard icon={<Wallet className="size-4" />} label="Avg. Order Value" value="₹3,419" delta="↑ 2.7% vs May 13 - May 19" />
      </div>

      {/* Main grid: left 2 cols (Overview + AI Performance), right 1 col (Needs Attention + Recent Activity) — Figma Container31 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column — 2/3 — Figma Container32 */}
        <div className="space-y-4 lg:col-span-2">
          <OverviewCard />
          <AiPerformanceCard />
        </div>

        {/* Right column — 1/3 — Figma Container87 */}
        <div className="space-y-4">
          <NeedsAttentionCard />
          <RecentActivityCard />
        </div>
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
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary sm:flex">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <CardDescription className="text-[13px] font-medium text-muted-foreground">{label}</CardDescription>
          <div className="mt-1 text-xl font-semibold leading-6 text-foreground">{value}</div>
          <div className="mt-1 text-[10px] leading-3">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{up} </span>
            <span className="text-muted-foreground">vs {rest}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function OverviewCard() {
  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Overview</CardTitle>
        <Button variant="outline" size="sm" className="h-8 rounded-lg bg-card">
          7 Day
          <ChevronDown className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Sales Overview chart — shadcn Chart + Recharts */}
        <div>
          <div className="text-sm font-semibold text-foreground">Sales Overview</div>
          <CardDescription className="text-xs">Revenue generated from AI assisted orders</CardDescription>
          <ChartContainer config={chartConfig} className="mt-4 h-[220px] w-full">
            <AreaChart data={revenueData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} dy={8} />
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
          <div className="text-sm font-semibold text-foreground">Revenue Breakdown</div>
          {(() => {
            const donutData = [
              { name: "AI Conversations", value: 82750, fill: "var(--primary)" },
              { name: "Direct Sales", value: 31200, fill: "var(--chart-2)" },
              { name: "Upsell & Cross-sell", value: 10610, fill: "var(--chart-4)" },
            ]
            const donutConfig = {
              ai: { label: "AI Conversations", color: "var(--primary)" },
              direct: { label: "Direct Sales", color: "var(--chart-2)" },
              upsell: { label: "Upsell & Cross-sell", color: "var(--chart-4)" },
            }
            return (
              <div className="mt-4 flex flex-col items-center">
                <div className="relative size-[130px]">
                  <ChartContainer config={donutConfig} className="size-full">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none" isAnimationActive={false}>
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
                                <span className="text-muted-foreground">{String(name)}</span>
                                <span className="font-medium tabular-nums text-foreground">₹{Number(value).toLocaleString("en-IN")}</span>
                              </div>
                            )}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-[13px] font-bold leading-none text-foreground">₹1,24,560</div>
                    <div className="text-[10px] leading-none text-muted-foreground">Total Revenue</div>
                  </div>
                </div>
                <div className="mt-4 w-full space-y-1 text-xs leading-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary" /> AI Conversations — ₹82,750 (66%)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-chart-2" /> Direct Sales — ₹31,200 (25%)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-chart-4" /> Upsell & Cross-sell — ₹10,610 (9%)
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

function AiPerformanceCard() {
  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">AI Performance</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold text-primary hover:text-primary">
          View Analytics
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <MetricMini label="Conversations" value="156" delta="↑ 12% vs yesterday" />
            <MetricMini label="Products Shown" value="432" delta="↑ 18% vs yesterday" />
            <MetricMini label="Orders Created" value="18" delta="↑ 20% vs yesterday" />
            <MetricMini label="Conversion Rate" value="24.5%" delta="↑ 6.2% vs yesterday" />
          </div>
          <div className="col-span-2 lg:col-span-3 rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between pb-2 text-sm font-semibold text-foreground">
              <span>Conversation to Order Funnel</span>
              <span>Conversion</span>
            </div>
            <Separator className="mb-3" />
            <div className="grid grid-cols-7 gap-2">
              <div className="col-span-2 flex flex-col justify-between text-[10px] font-medium text-muted-foreground">
                <div className="flex justify-between">
                  <span>Conversations Started</span>
                  <span className="font-semibold text-foreground">156</span>
                </div>
                <div className="flex justify-between">
                  <span>Products Shown</span>
                  <span className="font-semibold text-foreground">432</span>
                </div>
                <div className="flex justify-between">
                  <span>Add to Cart</span>
                  <span className="font-semibold text-foreground">36</span>
                </div>
                <div className="flex justify-between">
                  <span>Orders Created</span>
                  <span className="font-semibold text-foreground">18</span>
                </div>
              </div>
              <div className="col-span-3 flex items-center justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <svg viewBox="0 0 177 139" className="h-[110px] w-[140px] cursor-default">
                      <path d="M0 0 L177 0 L140 40 L37 40 Z" fill="var(--primary)" />
                      <path d="M37 40 L140 40 L120 80 L57 80 Z" fill="var(--chart-2)" />
                      <path d="M57 80 L120 80 L105 110 L72 110 Z" fill="var(--chart-1)" />
                      <path d="M72 110 L105 110 L95 139 L82 139 Z" fill="var(--chart-3)" />
                    </svg>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <div className="space-y-1">
                      <div>Conversations Started: 156 (100%)</div>
                      <div>Products Shown: 432 · 31.2% of convo</div>
                      <div>Add to Cart: 36 · 8.3%</div>
                      <div>Orders Created: 18 · 4.2%</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="col-span-2 flex flex-col justify-between border-l pl-3 text-right text-[10px] font-medium text-muted-foreground">
                <span>100%</span>
                <span>31.2%</span>
                <span>8.3%</span>
                <span>4.2%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricMini({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <Card className="rounded-lg bg-card p-3 shadow-none">
      <CardDescription className="text-xs font-medium">{label}</CardDescription>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-[10px] leading-3 text-emerald-600 dark:text-emerald-400">{delta}</div>
    </Card>
  )
}

function NeedsAttentionCard() {
  const items = [
    { icon: LayoutGrid, title: "Waiting for Payment", desc: "Orders pending payment", count: 7 },
    { icon: ShoppingCart, title: "Missing Shipping Details", desc: "Customer details incomplete", count: 4 },
    { icon: TrendingUp, title: "Out of Stock Products", desc: "Products out of stock", count: 3 },
    { icon: ArrowUpRight, title: "Abandoned High Value Chats", desc: "Potential revenue at risk", count: 5 },
    { icon: Bot, title: "Human Support Needed", desc: "Customer requested support", count: 2 },
  ] as const

  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Needs Attention</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold text-primary hover:text-primary">
          View All
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((it) => (
          <div key={it.title} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <it.icon className="size-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{it.title}</div>
                <div className="text-xs text-muted-foreground">{it.desc}</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-primary">{it.count}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function RecentActivityCard() {
  const activities = [
    { time: "10:32 AM", label: "Order Created", status: "Success" as const },
    { time: "10:28 AM", label: "Payment Successful", status: "Success" as const },
    { time: "10:24 AM", label: "Products Compared", status: "Success" as const },
    { time: "10:20 AM", label: "Upsell Shown", status: "Success" as const },
    { time: "10:16 AM", label: "Payment Failed", status: "Failed" as const },
  ]

  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-bold text-primary hover:text-primary">
          View All
        </Button>
      </CardHeader>
      <CardContent className="divide-y">
        {activities.map((a) => (
          <div key={a.time + a.label} className="flex items-center gap-3 py-3">
            <span className="w-[55px] shrink-0 text-[10px] text-muted-foreground">{a.time}</span>
            <span className="flex-1 text-xs font-medium text-foreground">{a.label}</span>
            <Badge variant={a.status === "Success" ? "success" : "destructive"} className="rounded-full px-2 py-0 text-[11px]">
              {a.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
