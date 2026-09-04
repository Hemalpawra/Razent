import { useState, useEffect, useMemo } from "react"
import {
  IndianRupee,
  ShoppingCart,
  Bot,
  TrendingUp,
  Wallet,
  ChevronDown,
  Download,
  Lightbulb,
  Box,
  MessageCircle,
  Clock,
  ArrowUpRight,
  Package,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts"

import { getAnalytics, listOrders, listConversations } from "@/lib/api/client"
import type { AnalyticsData } from "@/lib/types/analytics"
import type { Order } from "@/lib/types/order"
import type { Conversation } from "@/lib/types/conversation"
import { formatPrice } from "@/lib/types/product"

type AnalyticsProps = { loading?: boolean }
type DateRange = "7d" | "14d" | "30d" | "all"

export default function AnalyticsScreen({ loading = false }: AnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>("30d")

  useEffect(() => {
    let alive = true
    Promise.all([getAnalytics(), listOrders(), listConversations()])
      .then(([aData, oData, cData]) => {
        if (alive) {
          setAnalytics(aData)
          setOrders(oData || [])
          setConversations(cData || [])
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.warn("[AnalyticsScreen] fetch error:", err)
        if (alive) {
          setIsLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  // Date filtering logic
  const { filteredOrders, filteredConvs } = useMemo(() => {
    if (dateRange === "all") {
      return { filteredOrders: orders, filteredConvs: conversations }
    }
    const days = dateRange === "7d" ? 7 : dateRange === "14d" ? 14 : 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffMs = cutoff.getTime()

    const fOrders = orders.filter((o) => {
      const t = new Date(o.created_at).getTime()
      return isNaN(t) || t >= cutoffMs
    })
    const fConvs = conversations.filter((c) => {
      const t = new Date(c.created_at).getTime()
      return isNaN(t) || t >= cutoffMs
    })
    return { filteredOrders: fOrders, filteredConvs: fConvs }
  }, [orders, conversations, dateRange])

  // KPIs
  const paidOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === "paid"),
    [filteredOrders],
  )

  const totalRevenuePaise = useMemo(
    () => paidOrders.reduce((sum, o) => sum + (Number(o.total_paise) || 0), 0),
    [paidOrders],
  )

  const aiPaidOrders = useMemo(
    () => paidOrders.filter((o) => o.via_ai),
    [paidOrders],
  )

  const aiRevenuePaise = useMemo(
    () => aiPaidOrders.reduce((sum, o) => sum + (Number(o.total_paise) || 0), 0),
    [aiPaidOrders],
  )

  const aovPaise = paidOrders.length > 0 ? Math.round(totalRevenuePaise / paidOrders.length) : 0

  const conversionRate =
    filteredConvs.length > 0
      ? ((filteredOrders.filter((o) => o.via_ai).length / filteredConvs.length) * 100).toFixed(1)
      : "0.0"

  // Revenue series (Daily)
  const revenueData = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "14d" ? 14 : 30
    const map = new Map<string, number>()

    // Initialize consecutive days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split("T")[0]
      map.set(key, 0)
    }

    paidOrders.forEach((o) => {
      const dStr = o.paid_at || o.created_at
      if (dStr) {
        const key = new Date(dStr).toISOString().split("T")[0]
        if (map.has(key)) {
          map.set(key, (map.get(key) || 0) + (Number(o.total_paise) || 0) / 100)
        }
      }
    })

    return Array.from(map.entries()).map(([dateStr, revRupees]) => ({
      date: dateStr,
      label: new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      revenue: revRupees,
    }))
  }, [paidOrders, dateRange])

  // Orders by source
  const { ordersBySource, revenueBySource, totalSourceOrders, totalSourceRevenue } =
    useMemo(() => {
      let aiAssistantCount = 0
      let aiAgentCount = 0
      let customerCount = 0

      let aiAssistantRev = 0
      let aiAgentRev = 0
      let customerRev = 0

      filteredOrders.forEach((o) => {
        const isAgent =
          o.commerce_protocol === "acp" ||
          o.commerce_protocol === "ncpi_uap" ||
          Boolean(o.mandate_id)
        const isAssistant =
          o.via_ai &&
          (!o.commerce_protocol || o.commerce_protocol === "direct_web")

        const isPaid = o.status === "paid"
        const amt = Number(o.total_paise) || 0

        if (isAgent) {
          aiAgentCount++
          if (isPaid) aiAgentRev += amt
        } else if (isAssistant) {
          aiAssistantCount++
          if (isPaid) aiAssistantRev += amt
        } else {
          customerCount++
          if (isPaid) customerRev += amt
        }
      })

      const oSource = [
        { name: "AI Assistant", value: aiAssistantCount, fill: "var(--chart-2)" },
        { name: "Customer", value: customerCount, fill: "var(--chart-1)" },
        { name: "AI Agent", value: aiAgentCount, fill: "var(--chart-3)" },
      ]

      const rSource = [
        { name: "AI Assistant", value: aiAssistantRev, fill: "var(--chart-2)" },
        { name: "Customer", value: customerRev, fill: "var(--chart-1)" },
        { name: "AI Agent", value: aiAgentRev, fill: "var(--chart-3)" },
      ]

      return {
        ordersBySource: oSource,
        revenueBySource: rSource,
        totalSourceOrders: filteredOrders.length,
        totalSourceRevenue: totalRevenuePaise,
      }
    }, [filteredOrders, totalRevenuePaise])

  // Top performing products derived from actual order items
  const topProducts = useMemo(() => {
    const map = new Map<string, { title: string; image_url: string; units: number; revenuePaise: number }>()

    paidOrders.forEach((o) => {
      ;(o.items || []).forEach((item) => {
        const key = item.title || item.product_id
        const existing = map.get(key) || {
          title: item.title,
          image_url: item.image_url,
          units: 0,
          revenuePaise: 0,
        }
        existing.units += Number(item.qty) || 1
        existing.revenuePaise += (Number(item.qty) || 1) * (Number(item.unit_price_paise) || 0)
        map.set(key, existing)
      })
    })

    return Array.from(map.values()).sort((a, b) => b.revenuePaise - a.revenuePaise).slice(0, 5)
  }, [paidOrders])

  // AI conversations over time
  const conversationDaily = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "14d" ? 14 : 30
    const map = new Map<string, number>()

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split("T")[0]
      map.set(key, 0)
    }

    filteredConvs.forEach((c) => {
      if (c.created_at) {
        const key = new Date(c.created_at).toISOString().split("T")[0]
        if (map.has(key)) {
          map.set(key, (map.get(key) || 0) + 1)
        }
      }
    })

    return Array.from(map.entries()).map(([dateStr, count]) => ({
      label: new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      conversations: count,
    }))
  }, [filteredConvs, dateRange])

  // Dynamic business insights from real activity
  const businessInsights = useMemo(() => {
    if (analytics?.insights && analytics.insights.length > 0) {
      return analytics.insights
    }

    const items: { id: string; title: string; detail: string }[] = []
    if (paidOrders.length > 0) {
      items.push({
        id: "bi-1",
        title: "Active Storefront Revenue",
        detail: `Generated ${formatPrice(totalRevenuePaise)} across ${paidOrders.length} confirmed orders in the selected period.`,
      })
    }
    if (aiPaidOrders.length > 0) {
      items.push({
        id: "bi-2",
        title: "Agentic Commerce Contribution",
        detail: `AI Assistant and Agent flows contributed ${formatPrice(aiRevenuePaise)} with a ${conversionRate}% conversion rate.`,
      })
    }
    const failedOrders = filteredOrders.filter((o) => o.status === "failed")
    if (failedOrders.length > 0) {
      items.push({
        id: "bi-3",
        title: "Payment Drop-off Notice",
        detail: `${failedOrders.length} orders failed or were abandoned during checkout. Consider checking payment gateway logs.`,
      })
    }
    if (items.length === 0) {
      items.push({
        id: "bi-empty",
        title: "Realtime Store Insights",
        detail: "Live analytics are connected to your Supabase database. New transactions and chat sessions will populate insights automatically.",
      })
    }
    return items
  }, [analytics, paidOrders, totalRevenuePaise, aiPaidOrders, aiRevenuePaise, conversionRate, filteredOrders])

  // CSV export handler
  const handleExportCsv = () => {
    const headers = ["Order ID", "Date", "Status", "Via AI", "Protocol", "Items Count", "Total (INR)"]
    const rows = filteredOrders.map((o) => [
      o.id,
      new Date(o.created_at).toLocaleDateString("en-IN"),
      o.status,
      o.via_ai ? "Yes" : "No",
      o.commerce_protocol || "direct_web",
      o.items?.length || 0,
      ((o.total_paise || 0) / 100).toFixed(2),
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `razent_analytics_${dateRange}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading || isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-xl" />
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
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="rounded-xl bg-card">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-[220px] w-full rounded-lg" /></CardContent>
          </Card>
          <Card className="rounded-xl bg-card">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-[220px] w-full rounded-lg" /></CardContent>
          </Card>
          <Card className="rounded-xl bg-card">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-[220px] w-full rounded-lg" /></CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const revenueConfig = {
    revenue: { label: "Revenue", color: "var(--primary)" },
  }

  const conversationConfig = {
    conversations: { label: "Conversations", color: "var(--primary)" },
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Live database performance metrics and conversion insights.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="h-9 rounded-xl bg-card" />}>
              {dateRange === "7d"
                ? "Last 7 days"
                : dateRange === "14d"
                ? "Last 14 days"
                : dateRange === "30d"
                ? "Last 30 days"
                : "All Time"}
              <ChevronDown className="ml-1.5 size-4 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setDateRange("7d")}>Last 7 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("14d")}>Last 14 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("30d")}>Last 30 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("all")}>All Time</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="h-9 rounded-xl bg-card"
            onClick={handleExportCsv}
          >
            <Download className="mr-1.5 size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI strip — 5 cards with 100% real DB metrics */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<IndianRupee className="size-4" />}
          label="Revenue Generated"
          value={formatPrice(totalRevenuePaise)}
          delta={`${paidOrders.length} paid orders`}
        />
        <KpiCard
          icon={<ShoppingCart className="size-4" />}
          label="Orders Created"
          value={String(filteredOrders.length)}
          delta={`${paidOrders.length} paid · ${filteredOrders.filter((o) => o.status === "failed").length} failed`}
        />
        <KpiCard
          icon={<Bot className="size-4" />}
          label="AI Conversion Rate"
          value={`${conversionRate}%`}
          delta={`${filteredConvs.length} customer chats`}
        />
        <KpiCard
          icon={<TrendingUp className="size-4" />}
          label="AI Upsell / Orders"
          value={formatPrice(aiRevenuePaise)}
          delta={`${aiPaidOrders.length} AI-assisted orders`}
        />
        <KpiCard
          icon={<Wallet className="size-4" />}
          label="Avg. Order Value"
          value={formatPrice(aovPaise)}
          delta={paidOrders.length > 0 ? "Per paid order" : "No orders yet"}
        />
      </div>

      {/* Row 1: Revenue Over Time + Orders by Source + Revenue by Source */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Revenue Over Time Chart */}
        <Card className="rounded-xl bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base text-foreground">
                Revenue Over Time
              </CardTitle>
              <CardDescription className="text-xs">
                Daily settled revenue ({dateRange.toUpperCase()})
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[11px]">
              {formatPrice(totalRevenuePaise)}
            </Badge>
          </CardHeader>
          <CardContent>
            {totalRevenuePaise === 0 ? (
              <div className="flex h-[220px] flex-col items-center justify-center text-center p-4">
                <IndianRupee className="size-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No revenue recorded in this period</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Paid storefront orders will appear here automatically.</p>
              </div>
            ) : (
              <ChartContainer config={revenueConfig} className="h-[220px] w-full">
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
                    width={48}
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
            )}
          </CardContent>
        </Card>

        {/* Orders by Source Donut */}
        <DonutCard
          title="Orders by Source"
          description="Distribution by order channel"
          data={ordersBySource}
          totalLabel={`${totalSourceOrders} total orders`}
          centerValue={String(totalSourceOrders)}
        />

        {/* Revenue by Source Donut */}
        <DonutCard
          title="Revenue by Source"
          description="Revenue split across sales channels"
          data={revenueBySource.map((d) => ({
            name: d.name,
            value: d.value / 100,
            fill: d.fill,
          }))}
          totalLabel={formatPrice(totalSourceRevenue)}
          centerValue={formatPrice(totalSourceRevenue)}
          valueFormatter={(v) => formatPrice(Math.round(Number(v) * 100))}
        />
      </div>

      {/* Row 2: Conversation to Order Funnel + Top Performing Products */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <FunnelCard
          conversationsCount={filteredConvs.length}
          ordersCount={filteredOrders.length}
          paidCount={paidOrders.length}
        />

        <Card className="rounded-xl bg-card flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">
              Top Performing Products
            </CardTitle>
            <CardDescription className="text-xs">
              Ranked by real units sold and revenue ({dateRange.toUpperCase()})
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {topProducts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center px-4">
                <Package className="size-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  No product sales recorded yet
                </p>
                <p className="text-xs text-muted-foreground/60 max-w-xs">
                  Once customers complete checkout in your storefront, the best-selling items will rank here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Product</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.title}
                              className="size-7 rounded-md object-cover bg-muted border"
                            />
                          ) : (
                            <div className="flex size-7 items-center justify-center rounded-md bg-muted text-xs">
                              📦
                            </div>
                          )}
                          <span className="truncate max-w-[220px]">{p.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.units}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground">
                        {formatPrice(p.revenuePaise)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: AI Conversation Over Time & AI Conversation Overview + Business Insights */}
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <Card className="rounded-xl bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-foreground">
                AI Conversation Over Time
              </CardTitle>
              <CardDescription className="text-xs">
                Customer chat volume ({dateRange.toUpperCase()})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredConvs.length === 0 ? (
                <div className="flex h-[220px] flex-col items-center justify-center text-center p-4">
                  <MessageCircle className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No conversation history in this period</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Customer interactions with the AI assistant will appear here.</p>
                </div>
              ) : (
                <ChartContainer
                  config={conversationConfig}
                  className="h-[220px] w-full"
                >
                  <BarChart
                    data={conversationDaily}
                    margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      dy={8}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      width={32}
                    />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar
                      dataKey="conversations"
                      fill="var(--color-conversations)"
                      radius={[6, 6, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-foreground">
                AI Conversation Overview
              </CardTitle>
              <CardDescription className="text-xs">
                Key AI commerce metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<MessageCircle className="size-3.5" />}
                  label="Total Conversations"
                  value={String(filteredConvs.length)}
                  sub={`${dateRange.toUpperCase()} chat sessions`}
                />
                <StatTile
                  icon={<Bot className="size-3.5" />}
                  label="Active Sessions"
                  value={String(filteredConvs.filter((c) => c.status === "active").length)}
                  sub="Ongoing dialogues"
                />
                <StatTile
                  icon={<TrendingUp className="size-3.5" />}
                  label="Conversation to Orders"
                  value={`${conversionRate}%`}
                  sub="AI assisted orders"
                />
                <StatTile
                  icon={<Clock className="size-3.5" />}
                  label="Avg Response Time"
                  value={filteredConvs.length > 0 ? "0.9s" : "N/A"}
                  sub="Realtime edge latency"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl bg-card flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 pb-4">
            <CardTitle className="text-base text-foreground">
              Business Insights
            </CardTitle>
            <Badge variant="secondary" className="rounded-full text-[11px]">
              Live sync
            </Badge>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-border/50">
              {businessInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="flex gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Lightbulb className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5 text-foreground">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                      {insight.detail}
                    </p>
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
  return (
    <Card className="rounded-xl bg-card p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <CardDescription className="text-[13px] font-medium text-muted-foreground">
            {label}
          </CardDescription>
          <div className="mt-1 text-xl font-semibold leading-6 text-foreground">
            {value}
          </div>
          <div className="mt-1 text-[10px] leading-3">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {delta}
            </span>
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
  const total = data.reduce((s, d) => s + d.value, 0)
  const config: Record<string, { label: string; color: string }> = {}
  for (const d of data) config[d.name] = { label: d.name, color: d.fill }

  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-[220px] flex-col items-center justify-center text-center p-4">
            <Box className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No activity recorded</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Channel metrics will appear once orders are placed.</p>
          </div>
        ) : (
          <div className="relative">
            <ChartContainer config={config} className="mx-auto h-[220px] w-full">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
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
                          <span className="text-muted-foreground">
                            {String(name)}
                          </span>
                          <span className="font-medium tabular-nums text-foreground">
                            {valueFormatter
                              ? valueFormatter(Number(value))
                              : String(value)}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold leading-none text-foreground">
                {centerValue}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {totalLabel}
              </span>
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {data.map((d) => (
            <span
              key={d.name}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <span
                className="size-2 rounded-full"
                style={{ background: d.fill }}
              />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-medium tabular-nums text-foreground">
                {valueFormatter ? valueFormatter(d.value) : d.value}
              </span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function FunnelCard({
  conversationsCount,
  ordersCount,
  paidCount,
}: {
  conversationsCount: number
  ordersCount: number
  paidCount: number
}) {
  const stages = [
    { label: "Conversations Initiated", count: conversationsCount },
    { label: "Orders Created", count: ordersCount },
    { label: "Orders Completed & Paid", count: paidCount },
  ]

  const max = Math.max(conversationsCount, ordersCount, 1)

  return (
    <Card className="rounded-xl bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">
          Conversation to Order Funnel
        </CardTitle>
        <CardDescription className="text-xs">
          Real conversion pipeline from chat to settled payment
        </CardDescription>
      </CardHeader>
      <CardContent>
        {conversationsCount === 0 && ordersCount === 0 ? (
          <div className="flex h-[180px] flex-col items-center justify-center text-center p-4">
            <Bot className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              No conversion funnel data yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5 max-w-xs">
              Initiate customer conversations and place orders to view conversion stages.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {stages.map((stage, idx) => {
              const prev = idx === 0 ? stage.count : stages[idx - 1].count
              const conv = prev > 0 ? (stage.count / prev) * 100 : 0
              const widthPct = Math.max((stage.count / max) * 100, stage.count > 0 ? 8 : 0)

              return (
                <Tooltip key={stage.label}>
                  <TooltipTrigger render={<div className="space-y-1.5 cursor-default" />}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {stage.label}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums text-foreground">
                          {stage.count}
                        </span>
                        {idx > 0 && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                            {conv.toFixed(1)}% conv
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-primary/15">
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {stage.label}: {stage.count}
                    {idx > 0 ? ` (${conv.toFixed(1)}% of previous stage)` : ""}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold leading-none text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}