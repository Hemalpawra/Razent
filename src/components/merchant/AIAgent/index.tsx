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
  ChevronLeft,
  ChevronRight,
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
import { useUI } from "@/state/useUI"
import { toast } from "sonner"
import {
  calculateAiAgentDashboardNumbers,
  isConversationActive,
} from "@/lib/utils/metrics"
import { getConversationAgentSource } from "@/lib/utils/agentSource"
import { AgentBadge } from "@/components/shared/AgentBadge"

export default function AIAgentScreen({
  loading: externalLoading,
  error,
}: {
  loading?: boolean
  error?: string | null
}) {
  const { role, hasPermission } = useMerchant()
  const canExport = hasPermission("export_data")

  const globalConvId = useUI((s) => s.drawerConversationId)
  const closeGlobalConvDrawer = useUI((s) => s.closeConversationDrawer)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (globalConvId) {
      setSelectedId(globalConvId)
      setDrawerOpen(true)
      closeGlobalConvDrawer()
    }
  }, [globalConvId, closeGlobalConvDrawer])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(!externalLoading)

  const [convData, setConvData] = useState<Conversation[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [assistantFilter, setAssistantFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<DateRangeValue>({
    preset: "all",
    label: "All Time",
    startDate: null,
    endDate: null,
  })
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

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

  useEffect(() => {
    setPage(1)
  }, [q, statusFilter, assistantFilter, dateFilter])

  const selected = selectedId
    ? (convData.find((c) => c.id === selectedId) ?? null)
    : null

  const filteredConversations = useMemo(() => {
    const term = q.trim().toLowerCase()
    return convData.filter((c) => {
      const active = isConversationActive(c)
      if (statusFilter === "active" && !active) return false
      if (statusFilter === "inactive" && active) return false

      const agentSource = getConversationAgentSource(c)
      if (assistantFilter !== "all" && agentSource.type !== assistantFilter) return false

      if (term) {
        const nameMatch = (c.customer_name || "").toLowerCase().includes(term)
        const msgMatch = (c.last_message || "").toLowerCase().includes(term)
        const idMatch = c.id.toLowerCase().includes(term)
        const agentMatch = agentSource.name.toLowerCase().includes(term)
        if (!nameMatch && !msgMatch && !idMatch && !agentMatch) return false
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
  }, [convData, q, statusFilter, assistantFilter, dateFilter])

  const totalPages = Math.max(1, Math.ceil(filteredConversations.length / rowsPerPage))
  const safePage = Math.min(page, totalPages)
  const start = filteredConversations.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const end = Math.min(safePage * rowsPerPage, filteredConversations.length)
  const pagedConversations = useMemo(() => {
    return filteredConversations.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  }, [filteredConversations, safePage, rowsPerPage])

  const {
    activeConversations: activeCount,
    ordersCreatedToday: ordersToday,
    revenueGeneratedTodayPaise: revenueToday,
    conversionRatePct,
    customersHelped,
  } = useMemo(() => calculateAiAgentDashboardNumbers(convData, orders), [convData, orders])

  const conversionRate = `${conversionRatePct}%`

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
      "Assistant",
      "Status",
      "Last Message",
      "Order Amount (INR)",
      "Created At",
    ]
    const rows = filteredConversations.map((c) => {
      const active = isConversationActive(c)
      const amt = c.amount_paise ? (c.amount_paise / 100).toFixed(2) : ""
      const agentSource = getConversationAgentSource(c)
      return [
        c.id,
        `"${(c.customer_name || "").replace(/"/g, '""')}"`,
        `"${agentSource.name.replace(/"/g, '""')}"`,
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
            <Select
              value={assistantFilter}
              onValueChange={(v) => {
                if (v) setAssistantFilter(v)
              }}
            >
              <SelectTrigger className="h-9 w-[135px] rounded-lg text-xs bg-card">
                <SelectValue placeholder="All Assistants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assistants</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="chatgpt">ChatGPT</SelectItem>
                <SelectItem value="store_agent">Store Agent</SelectItem>
                <SelectItem value="external_agent">External Agent</SelectItem>
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
                  Customer
                </TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">
                  Assistant
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
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                    No conversations match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                pagedConversations.map((c) => {
                  const active = isConversationActive(c)
                  const agentSource = getConversationAgentSource(c)
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
                        <div className="max-w-[18rem] truncate text-xs text-muted-foreground">
                          {c.last_message || "Active customer shopping session"}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <AgentBadge source={agentSource} size="sm" />
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

        {/* Pagination Footer */}
        <div className="flex flex-col gap-3 border-t bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {filteredConversations.length === 0
              ? "Showing 0 of 0"
              : `Showing ${start}-${end} of ${filteredConversations.length}`}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Rows per page</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v: string | null) => {
                  if (v) {
                    setRowsPerPage(Number(v))
                    setPage(1)
                  }
                }}
              >
                <SelectTrigger className="h-8 w-[70px] bg-card text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                className="size-8 rounded-md bg-card"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-xs text-muted-foreground">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-8 rounded-md bg-card"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
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
