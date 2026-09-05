import {
  Users,
  ShoppingCart,
  IndianRupee,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Eye,
  Download,
  RotateCw,
  ShieldCheck,
  Lock,
  ExternalLink,
  Zap,
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
  updateConversationStatus,
  subscribeToConversations,
} from "@/lib/api/client"
import type { Conversation, ConversationStatus } from "@/lib/types/conversation"
import type { Order } from "@/lib/types/order"
import { useState, useEffect, useMemo } from "react"
import ConversationDrawer from "@/components/merchant/AIAgent/ConversationDrawer"
import { toast } from "sonner"

const statusVariant: Record<ConversationStatus, "success" | "secondary" | "warning" | "destructive" | "default"> =
  {
    active: "default",
    waiting_for_customer: "warning",
    waiting_for_payment: "warning",
    checkout_ready: "secondary",
    paid: "success",
    completed: "success",
    failed: "destructive",
    cancelled: "secondary",
  }

const statusLabel: Record<ConversationStatus, string> = {
  active: "Active",
  waiting_for_customer: "Waiting for Customer",
  waiting_for_payment: "Waiting for Payment",
  checkout_ready: "Checkout Ready",
  paid: "Paid",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
}

function sourceLabel(type: string) {
  return type === "agent_to_agent" ? "AI Agent" : "AI Assistant"
}

export default function AIAgentScreen({
  loading: externalLoading,
  error,
}: {
  loading?: boolean
  error?: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(!externalLoading)

  const [convData, setConvData] = useState<Conversation[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [dateFilter, setDateFilter] = useState<DateRangeValue>({
    preset: "all",
    label: "All Time",
    startDate: null,
    endDate: null,
  })

  const loadData = async () => {
    setIsRefreshing(true)
    try {
      const [c, o] = await Promise.all([listConversations(), listOrders()])
      setConvData(c || [])
      setOrders(o || [])
    } catch {
      setConvData([])
      setOrders([])
    } finally {
      setIsLoading(false)
      setTimeout(() => setIsRefreshing(false), 400)
    }
  }

  useEffect(() => {
    loadData()

    // Realtime live subscription to conversations
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
    return convData.filter((c) => {
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
        return true
      }
      return true
    })
  }, [convData, dateFilter])

  const activeCount = convData.filter(
    (c) =>
      c.status === "active" ||
      c.status === "waiting_for_customer" ||
      c.status === "waiting_for_payment",
  ).length

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
    setSelectedId(id)
    setDrawerOpen(true)
  }

  const handleStatusChange = async (newStatus: ConversationStatus) => {
    if (!selected) return
    await updateConversationStatus(selected.id, newStatus as any)
    setConvData((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, status: newStatus } : c)),
    )
    toast.success(`Conversation status updated to ${newStatus}`)
  }

  const handleExportConversations = () => {
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
      "Amount Paise",
      "Created At",
      "Updated At",
    ]
    const rows = filteredConversations.map((c) => [
      c.id,
      `"${(c.customer_name || "").replace(/"/g, '""')}"`,
      c.type,
      c.status,
      `"${(c.last_message || "").replace(/"/g, '""')}"`,
      c.amount_paise || 0,
      c.created_at,
      c.updated_at,
    ])
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
      <div className="space-y-3 bg-muted/30 -m-6 p-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[70%_30%]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-muted/30 -m-6 p-6">
        <Card className="rounded-xl bg-card p-10 text-center">
          <p className="text-sm font-medium text-destructive">
            Failed to load AI Agent
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={loadData}>
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  const empty = convData.length === 0

  return (
    <div className="space-y-3 bg-muted/30 -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
            AI Agent
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Monitor how your AI helps customers and drives more sales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={dateFilter} onChange={setDateFilter} />
          <Button
            variant="outline"
            className="h-9 rounded-lg bg-card"
            onClick={handleExportConversations}
          >
            <Download className="size-4 mr-1.5" />
            Export
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-lg bg-card"
            onClick={loadData}
            disabled={isRefreshing}
            title="Refresh conversations"
          >
            <RotateCw className={cn("size-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button
            className="h-9 rounded-lg"
            onClick={() => handleOpen(filteredConversations[0]?.id ?? convData[0]?.id ?? "demo")}
          >
            Test AI
          </Button>
          <div className="hidden items-center gap-3 pl-2 lg:flex">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              MS
            </div>
            <div className="leading-none">
              <div className="text-xs font-bold text-foreground">
                Merchant Store
              </div>
              <div className="text-[11px] text-muted-foreground">
                Super Admin
              </div>
            </div>
            <span className="text-xs text-muted-foreground">⌄</span>
          </div>
        </div>
      </div>

      {/* KPI — tighter gap-3 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<Users className="size-4" />}
          label="Customers Helped"
          value={String(customersHelped)}
          sub="Active conversation sessions"
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
          sub="Waiting or active now"
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
          sub="From AI-assisted orders"
          valueIsAmount
        />
      </div>

      {empty ? (
        <Card className="mt-4 rounded-xl bg-card p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            No conversations yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Your AI will appear here once products are imported and customers
            start chatting.
          </p>
        </Card>
      ) : (
        /* 70/30 Grid Layout with clean Slide-Over Drawer */
        <div className="grid gap-3 lg:grid-cols-[70%_30%]">
          {/* Left — Live Conversations */}
          <LiveConversationsCard onOpen={handleOpen} convData={filteredConversations} />

          {/* Right — needs attention */}
          <div className="space-y-3">
            <Card className="rounded-xl bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Needs Attention</CardTitle>
                <Badge variant="secondary" className="rounded-full text-[11px]">
                  {activeCount} open
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1">
                {convData.filter((c) => c.status === "waiting_for_payment").length > 0 && (
                  <AttentionRow
                    icon={AlertTriangle}
                    title="Waiting for payment"
                    desc={`${convData.filter((c) => c.status === "waiting_for_payment").length} conversation awaiting checkout`}
                    count={String(convData.filter((c) => c.status === "waiting_for_payment").length)}
                    tone="warning"
                  />
                )}
                {convData.filter((c) => c.status === "waiting_for_customer").length > 0 && (
                  <AttentionRow
                    icon={Users}
                    title="Waiting for customer response"
                    desc={`${convData.filter((c) => c.status === "waiting_for_customer").length} active customer threads`}
                    count={String(convData.filter((c) => c.status === "waiting_for_customer").length)}
                    tone="warning"
                  />
                )}
                {activeCount === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    All AI interactions normal. No customer escalations pending.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* A2A Protocol & Google AP2 Status */}
            <Card className="rounded-xl bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">A2A Protocol & AP2</CardTitle>
                    <CardDescription className="text-xs">Agent-to-Agent Commerce</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px]">
                  Active
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Protocol Stack:</span>
                  <span className="font-mono font-medium text-foreground">ACP + Google AP2</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">NPCI AutoPay Ceiling:</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">₹15,000 / order</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Cart Hash Mandates:</span>
                  <span className="font-mono font-medium text-foreground">SHA-256 Enforced</span>
                </div>
                <div className="pt-1 flex flex-col gap-1.5">
                  <a
                    href="/.well-known/agent.json"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/60 transition-colors text-primary font-mono text-[11px]"
                  >
                    <span>/.well-known/agent.json</span>
                    <ExternalLink className="size-3" />
                  </a>
                  <a
                    href="/.well-known/ap2.json"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/60 transition-colors text-primary font-mono text-[11px]"
                  >
                    <span>/.well-known/ap2.json</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Slide-over Right Drawer for Conversation Details */}
      <ConversationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversation={selected}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}

function LiveConversationsCard({
  onOpen,
  convData = [],
}: {
  onOpen: (id: string) => void
  convData?: Conversation[]
}) {
  return (
    <Card className="overflow-hidden rounded-xl bg-card py-0 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 shrink-0">
        <div>
          <CardTitle className="text-base">Live Conversations</CardTitle>
          <CardDescription className="text-xs">
            Latest {Math.min(10, convData.length)} · AI Assistant + AI Agent
          </CardDescription>
        </div>
        <Badge variant="secondary" className="rounded-full text-[11px]">
          {Math.min(10, convData.length)} of {convData.length}
        </Badge>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 px-4 text-xs font-semibold text-foreground">
                Customer / Agent
              </TableHead>
              <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">
                Source
              </TableHead>
              <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">
                Status
              </TableHead>
              <TableHead className="h-10 px-3 text-right text-xs font-semibold text-foreground">
                Amount
              </TableHead>
              <TableHead className="h-10 px-3 text-xs font-semibold text-foreground hidden lg:table-cell">
                Last updated
              </TableHead>
              <TableHead className="h-10 px-4 text-right text-xs font-semibold text-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {convData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                  No conversations match the current date filter.
                </TableCell>
              </TableRow>
            ) : (
              convData.slice(0, 10).map((c) => (
                <TableRow
                  key={c.id}
                  className="hover:bg-muted/20 cursor-pointer"
                  onClick={() => onOpen(c.id)}
                >
                  <TableCell className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground">
                      {c.customer_name}
                    </div>
                    <div className="max-w-[18rem] truncate text-xs text-muted-foreground">
                      {c.last_message}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <Badge
                      variant={
                        c.type === "agent_to_agent" ? "default" : "secondary"
                      }
                      className="rounded-full text-[11px]"
                    >
                      {sourceLabel(c.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <Badge
                      variant={statusVariant[c.status]}
                      className="rounded-full px-2.5 py-0 text-[11px]"
                    >
                      {statusLabel[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right text-sm font-medium tabular-nums text-foreground">
                    {c.amount_paise ? formatPrice(c.amount_paise) : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell px-3 py-3 text-xs text-muted-foreground">
                    {new Date(c.updated_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ·{" "}
                    {new Date(c.updated_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-md"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpen(c.id)
                      }}
                    >
                      <Eye className="size-3.5 mr-1" /> View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t bg-card px-4 py-3 text-xs text-muted-foreground">
        <span>Showing {Math.min(10, convData.length)} of {convData.length} conversations</span>
        {convData.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full bg-card"
            onClick={() => onOpen(convData[0]?.id ?? "demo")}
          >
            View Latest
          </Button>
        )}
      </div>
    </Card>
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
    <Card className="rounded-xl bg-card p-5 shadow-sm py-5">
      <div className="flex gap-3">
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary sm:flex">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-5 text-muted-foreground">
            {label}
          </div>
          <div
            className={
              valueIsAmount
                ? "mt-0.5 text-lg font-semibold leading-6 text-foreground"
                : "mt-0.5 font-heading text-[22px] font-semibold leading-7 text-foreground"
            }
          >
            {value}
          </div>
          <div className="mt-0.5 text-[10px] leading-3 text-muted-foreground">
            {sub}
          </div>
        </div>
      </div>
    </Card>
  )
}

function AttentionRow({
  icon: Icon,
  title,
  desc,
  count,
  tone,
}: {
  icon: typeof AlertTriangle
  title: string
  desc: string
  count: string
  tone: "warning" | "destructive"
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <div
          className={
            "flex size-8 items-center justify-center rounded-full " +
            (tone === "warning"
              ? "bg-amber-500/10 text-amber-600"
              : "bg-destructive/10 text-destructive")
          }
        >
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div
        className={
          "text-sm font-semibold " +
          (tone === "warning" ? "text-amber-600" : "text-destructive")
        }
      >
        {count}
      </div>
    </div>
  )
}
