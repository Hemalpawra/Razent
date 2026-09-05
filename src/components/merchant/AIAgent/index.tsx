import { useState, useEffect, useMemo } from "react"
import {
  Users,
  ShoppingCart,
  IndianRupee,
  MessageCircle,
  TrendingUp,
  RotateCw,
  Download,
  Search,
  Eye,
  SlidersHorizontal,
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker, type DateRangeValue } from "@/components/shared/DateRangePicker"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPrice } from "@/lib/types/product"
import {
  listConversations,
  listOrders,
  subscribeToConversations,
} from "@/lib/api/client"
import type { Conversation } from "@/lib/types/conversation"
import type { Order } from "@/lib/types/order"
import ConversationDrawer from "@/components/merchant/AIAgent/ConversationDrawer"
import { useMerchant } from "@/state/useMerchant"
import { toast } from "sonner"

function isConversationActive(c: Conversation): boolean {
  const s = (c.status || "").toLowerCase()
  return s === "active" || s === "waiting_for_customer" || s === "waiting_for_payment"
}

export default function AIAgentScreen({
  loading: externalLoading,
  error,
}: {
  loading?: boolean
  error?: string | null
}) {
  const { role, hasPermission } = useMerchant()
  const canExport = hasPermission("export_data")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(!externalLoading)

  const [convData, setConvData] = useState<Conversation[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [dateFilter, setDateFilter] = useState<DateRangeValue>({
    preset: "all",
    label: "All Time",
    startDate: null,
    endDate: null,
  })

  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const [c, o] = await Promise.all([listConversations(), listOrders()])
      setConvData(c || [])
      setOrders(o || [])
    } catch {
      setConvData([])
      setOrders([])
    } finally {
      setIsLoading(false)
      if (isManual) setTimeout(() => setIsRefreshing(false), 400)
    }
  }

  useEffect(() => {
    loadData()
    const unsubscribe = subscribeToConversations(() => {
      listConversations().then(setConvData).catch(() => {})
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const selected = selectedId
    ? (convData.find((c) => c.id === selectedId) ?? null)
    : null

  const filteredConversations = useMemo(() => {
    const term = q.trim().toLowerCase()
    return convData.filter((c) => {
      const active = isConversationActive(c)
      if (statusFilter === "active" && !active) return false
      if (statusFilter === "inactive" && active) return false

      if (term) {
        const nameMatch = (c.customer_name || "").toLowerCase().includes(term)
        const msgMatch = (c.last_message || "").toLowerCase().includes(term)
        const idMatch = c.id.toLowerCase().includes(term)
        if (!nameMatch && !msgMatch && !idMatch) return false
      }

      if (dateFilter.preset === "today") {
        const today = new Date().toISOString().slice(0, 10)
        return c.created_at.startsWith(today)
      } else if (dateFilter.preset === "yesterday") {
        const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        return c.created_at.startsWith(y)
      } else if (dateFilter.preset === "7d") {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        return c.created_at >= sevenDaysAgo
      } else if (dateFilter.preset === "30d") {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
        return c.created_at >= thirtyDaysAgo
      } else if (dateFilter.preset === "custom") {
        const d = c.created_at.slice(0, 10)
        if (dateFilter.startDate && d < dateFilter.startDate) return false
        if (dateFilter.endDate && d > dateFilter.endDate) return false
      }
      return true
    })
  }, [convData, q, statusFilter, dateFilter])

  const activeCount = convData.filter(isConversationActive).length
  const todayStr = new Date().toISOString().slice(0, 10)
  const ordersToday = orders.filter((o) => o.created_at.startsWith(todayStr)).length
  const revenueToday = orders
    .filter((o) => o.status === "paid" && o.created_at.startsWith(todayStr))
    .reduce((s, o) => s + o.total_paise, 0)
  const customersHelped = convData.length
  const conversionRate = convData.length > 0
    ? `${((orders.filter((o) => o.via_ai).length / convData.length) * 100).toFixed(1)}%`
    : "0%"

  const handleOpen = (id: string) => {
    if (role === "view_only") {
      toast.error("You are using the view-only merchant account. Conversation details are restricted.")
      return
    }
    setSelectedId(id)
    setDrawerOpen(true)
  }

  const handleExportConversations = () => {
    if (!canExport) {
      toast.error("View-only accounts cannot export conversation data.")
      return
    }
    if (filteredConversations.length === 0) {
      toast.error("No conversations to export")
      return
    }
    const headers = [
      "ID",
      "Customer",
      "Type",
      "Status",
      "Last Message",
      "Order Amount (INR)",
      "Created At",
    ]
    const rows = filteredConversations.map((c) => {
      const active = isConversationActive(c)
      const amt = c.amount_paise ? (c.amount_paise / 100).toFixed(2) : ""
      return [
        c.id,
        `"${(c.customer_name || "").replace(/"/g, '""')}"`,
        c.type,
        active ? "Active" : "Inactive",
        `"${(c.last_message || "").replace(/"/g, '""')}"`,
        amt,
        c.created_at,
      ]
    })
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `ai_conversations_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${filteredConversations.length} conversations`)
  }

  if (externalLoading || isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="rounded-xl bg-card p-10 text-center">
        <p className="text-sm font-medium text-destructive">Failed to load AI Agent</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => loadData(true)}>
          Retry
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header — clean title and single toolbar */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
          AI Agent
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Monitor real-time AI customer conversations and sales conversions.
        </p>
      </div>

      {/* KPI 5 cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<Users className="size-4" />}
          label="Customers Helped"
          value={String(customersHelped)}
          sub="Total customer chats"
        />
        <KpiCard
          icon={<TrendingUp className="size-4" />}
          label="Conversion Rate"
          value={conversionRate}
          sub="AI assisted orders"
        />
        <KpiCard
          icon={<MessageCircle className="size-4" />}
          label="Active Conversations"
          value={String(activeCount)}
          sub="Currently in progress"
        />
        <KpiCard
          icon={<ShoppingCart className="size-4" />}
          label="Orders Created Today"
          value={String(ordersToday)}
          sub="Via AI conversations"
        />
        <KpiCard
          icon={<IndianRupee className="size-4" />}
          label="Revenue Generated Today"
          value={formatPrice(revenueToday)}
          sub="From paid AI orders"
          valueIsAmount
        />
      </div>

      {/* Main Table Card (Full Width - A2A and Needs Attention cards removed) */}
      <Card className="overflow-hidden rounded-xl bg-card py-0 shadow-sm border">
        {/* Single clean toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card p-3">
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
            <div className="relative w-full max-w-[280px] min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customer, message, ID..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 rounded-lg bg-card pl-9 text-sm"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                if (v) setStatusFilter(v as "all" | "active" | "inactive")
              }}
            >
              <SelectTrigger className="h-9 w-[130px] rounded-lg text-xs bg-card">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker value={dateFilter} onChange={setDateFilter} />
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-md shrink-0 bg-card"
              aria-label="Refresh"
              disabled={isRefreshing}
              onClick={() => loadData(true)}
            >
              <RotateCw className={cn("size-4", isRefreshing && "animate-spin text-primary")} />
            </Button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              className="h-9 rounded-md border-primary text-primary hover:bg-primary/5 hover:text-primary gap-1.5"
              onClick={handleExportConversations}
              disabled={!canExport || filteredConversations.length === 0}
            >
              <Download className="size-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Live Conversation Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-4 text-xs font-semibold text-foreground">
                  Customer / Channel
                </TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">
                  Status
                </TableHead>
                <TableHead className="h-10 px-3 text-right text-xs font-semibold text-foreground">
                  Order Placed
                </TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold text-foreground hidden sm:table-cell">
                  Last Updated
                </TableHead>
                <TableHead className="h-10 px-4 text-right text-xs font-semibold text-foreground">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                    No conversations match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredConversations.map((c) => {
                  const active = isConversationActive(c)
                  const matchingOrder = orders.find(
                    (o) => o.id === c.order_id || o.conversation_id === c.id,
                  )
                  const orderAmount = c.amount_paise
                    ? formatPrice(c.amount_paise)
                    : matchingOrder?.total_paise
                      ? formatPrice(matchingOrder.total_paise)
                      : "—"

                  return (
                    <TableRow
                      key={c.id}
                      className="hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleOpen(c.id)}
                    >
                      <TableCell className="px-4 py-3">
                        <div className="text-sm font-medium text-foreground">
                          {c.customer_name || "Storefront Customer"}
                        </div>
                        <div className="max-w-[22rem] truncate text-xs text-muted-foreground">
                          {c.last_message || "Active customer shopping session"}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <Badge
                          variant={active ? "default" : "secondary"}
                          className="rounded-full text-[11px] px-2 py-0"
                        >
                          {active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right font-medium text-sm tabular-nums">
                        {orderAmount !== "—" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {orderAmount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {c.updated_at
                          ? new Date(c.updated_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpen(c.id)
                          }}
                        >
                          <Eye className="size-3.5" /> Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Slide-over Right Drawer for Conversation Details */}
      <ConversationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversation={selected}
      />
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  valueIsAmount,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  valueIsAmount?: boolean
}) {
  return (
    <Card className="rounded-xl bg-card p-3 shadow-sm border">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
        <div className="p-1 rounded-md bg-muted/60 text-foreground">{icon}</div>
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </Card>
  )
}
