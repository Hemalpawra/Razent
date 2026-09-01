import { TrendingUp, TrendingDown } from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  LineChart,
  AreaChart,
  BarChart,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { mockAnalytics } from "@/lib/mock/analytics"
import { formatPrice } from "@/lib/types/product"

export default function AnalyticsScreen() {
  const a = mockAnalytics
  const colors = [
    "var(--primary)",
    "var(--secondary)",
    "oklch(0.623 0.214 259.815)",
    "oklch(0.546 0.245 262.881)",
    "oklch(0.424 0.199 265.638)",
    "oklch(0.205 0 0)",
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Business-level signals derived from orders and conversations. Per AI_RULES.md §1: revenue, orders, conversion, insights — designed for quick merchant understanding."
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">AOV</div>
            <div className="font-heading text-2xl font-medium tracking-tight">{formatPrice(a.aov_paise)}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Average order value (paid orders)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Conversion rate</div>
            <div className="font-heading text-2xl font-medium tracking-tight">{a.conversion_rate_pct}%</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Checkout-to-paid (demo)</div>
          </CardContent>
        </Card>
        <Card className="md:col-span-3 lg:col-span-3">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Revenue (last 14 days)</div>
            <div className="font-heading text-lg font-medium tracking-tight">{formatPrice(a.revenue_series.reduce((s, r) => s + r.revenue_paise, 0))}</div>
            <div className="mt-3 h-[160px]">
              <ChartContainer
                config={{ revenue: { label: "Revenue", theme: { light: "var(--primary)", dark: "var(--primary)" } } }}
              >
                <LineChart
                  data={a.revenue_series.map((r) => ({ date: r.date.slice(5), revenue_paise: r.revenue_paise }))}
                  margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                >
                  <LineChart.Line
                    dataKey="revenue_paise"
                    type="monotone"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideIndicator />}/>
                </LineChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle charts + table */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
            <CardDescription>Count of orders per status (demo data).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ChartContainer
                config={{
                  paid: { label: "Paid", theme: { light: "oklch(0.424 0.199 265.638)", dark: "oklch(0.424 0.199 265.638)" } },
                  created: { label: "Created", theme: { light: "oklch(0.623 0.214 259.815)", dark: "oklch(0.623 0.214 259.815)" } },
                  failed: { label: "Failed", theme: { light: "oklch(0.577 0.245 27.325)", dark: "oklch(0.577 0.245 27.325)" } },
                  refunded: { label: "Refunded", theme: { light: "oklch(0.967 0.001 286.375)", dark: "oklch(0.967 0.001 286.375)" } },
                }}
              >
                <BarChart
                  data={a.orders_by_status.map((s) => ({ status: s.status, count: s.count }))}
                  layout="vertical"
                  margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                >
                  <BarChart.Bar dataKey="count" radius={[2, 2, 2, 2]} isAnimationActive={false} />
                  <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by category</CardTitle>
            <CardDescription>Paid orders only (last 30 days, demo).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ChartContainer
                config={{
                  revenue: { label: "Revenue", theme: { light: "var(--primary)", dark: "var(--primary)" } },
                }}
              >
                <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                  <Pie
                    data={a.top_categories.map((c) => ({
                      name: c.category,
                      value: c.revenue_paise,
                      fill: colors[a.top_categories.indexOf(c) % colors.length],
                    }))}
                    dataKey="value"
                    labelLine={false}
                    innerRadius={40}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {a.top_categories.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideIndicator/>} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="mt-4 divide-y divide-border/50 text-xs">
              {a.top_categories.map((c, i) => (
                <div key={c.category} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: colors[i % colors.length] }}
                    />
                    <span className="text-muted-foreground">{c.category}</span>
                  </div>
                  <span className="font-medium tabular-nums">{formatPrice(c.revenue_paise)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h3 className="font-heading text-base font-medium">Business insights</h3>
          <span className="text-[10px] text-muted-foreground">Updated just now</span>
        </div>
        <div className="divide-y divide-border/50 px-5">
          {a.insights.map((insight) => (
            <a
              key={insight.id}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="group flex gap-3 py-4 transition-colors hover:bg-muted/30 -mx-5 px-5 rounded-md"
            >
              <div className="mt-0.5 shrink-0">
                <TrendingUpIcon className="size-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{insight.title}</p>
                <p className="text-xs text-muted-foreground">{insight.detail}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}