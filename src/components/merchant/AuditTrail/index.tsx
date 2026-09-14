import { useMemo, useState, useEffect } from "react"

import {
  SearchIcon,
  ChevronDownIcon,
  DownloadIcon,
  RotateCcwIcon,
  RotateCw,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon as ChevronDownSmallIcon,
  EyeIcon,
  Activity,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DateRangePicker, type DateRangeValue } from "@/components/shared/DateRangePicker"
import { cn } from "@/lib/utils"
import { useMerchant } from "@/state/useMerchant"
import { toast } from "sonner"
import { calculateAuditTrailMetrics } from "@/lib/utils/metrics"
import { KpiCard } from "@/components/merchant/shared/KpiCard"
import { SortableTableHead } from "@/components/merchant/shared/SortableTableHead"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table"

import { Separator } from "@/components/ui/separator"

import { listAuditSessions } from "@/lib/api/client"
import { supabase } from "@/lib/api/supabase"

import type { AuditResult, AuditSession, AuditEvent } from "@/lib/types/audit"

import AuditDrawer from "./AuditDrawer"
import { useUI } from "@/state/useUI"
import { useIsMobile } from "@/hooks/use-mobile"

function variant(
  r: AuditResult,
): "success" | "warning" | "destructive" | "secondary" {
  if (r === "Success") return "success"

  if (r === "Warning") return "warning"

  if (r === "Failed" || r === "Critical") return "destructive"

  return "secondary"
}

export default function AuditTrailScreen() {
  const [q, setQ] = useState("")
  const [eventFilter, setEventFilter] = useState<string>("all")
  const [resultFilter, setResultFilter] = useState<string>("all")
  const [actorFilter, setActorFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<DateRangeValue>({
    preset: "all",
    label: "All Time",
    startDate: null,
    endDate: null,
  })
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortKey, setSortKey] = useState<string>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection(key === "date" || key === "event_count" ? "desc" : "asc")
    }
    setPage(1)
  }
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selectedSession, setSelectedSession] = useState<AuditSession | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isMobile = useIsMobile()
  const setActiveScreen = useUI((s) => s.setActiveScreen)
  const openAuditDrawer = useUI((s) => s.openAuditDrawer)
  const closeAuditDrawer = useUI((s) => s.closeAuditDrawer)
  const drawerAuditSessionId = useUI((s) => s.drawerAuditSessionId)

  const { hasPermission } = useMerchant()
  const canExport = hasPermission("export_audit")

  const [auditData, setAuditData] = useState<AuditSession[]>([])

  const loadAuditData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const data = await listAuditSessions()
      setAuditData(data)
      if (isManual) toast.success("Audit logs refreshed")
    } finally {
      if (isManual) setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  useEffect(() => {
    setLoading(true)
    listAuditSessions()
      .then((data) => {
        setAuditData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Live Realtime listener on Supabase audit_sessions
    const channel = supabase
      .channel("audit_sessions_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audit_sessions" },
        () => {
          listAuditSessions()
            .then((data) => setAuditData(data))
            .catch(() => {})
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [q, eventFilter, resultFilter, actorFilter, dateFilter])

  // Sync with global UI state if drawerAuditSessionId is set externally
  useEffect(() => {
    if (drawerAuditSessionId && auditData.length > 0) {
      const found = auditData.find(
        (s) => s.session_id === drawerAuditSessionId || (s as any).id === drawerAuditSessionId
      )
      if (found) {
        setSelectedSession(found)
        setSelectedEvent(null)
        setDrawerOpen(true)
      }
    }
  }, [drawerAuditSessionId, auditData])

  const {
    totalSessions,
    totalEvents,
    successEvents: success,
    failedEvents: failed,
    criticalAlerts: critical,
  } = useMemo(() => calculateAuditTrailMetrics(auditData), [auditData])

  const filtered = useMemo(() => {
    return auditData.filter((s) => {
      if (q.trim()) {
        const n = q.toLowerCase()
        if (
          !s.session_id.toLowerCase().includes(n) &&
          !(s.order_id ?? "").toLowerCase().includes(n) &&
          !s.customer.toLowerCase().includes(n) &&
          !s.last_event.toLowerCase().includes(n) &&
          !s.events.some((e) => e.type.toLowerCase().includes(n))
        )
          return false
      }

      if (eventFilter !== "all") {
        if (eventFilter === "order_settled") {
          const match = s.events.some((e) => ["autonomous_order_settled", "payment_completed", "Payment Successful"].includes(e.type))
          if (!match) return false
        } else if (eventFilter === "order_blocked") {
          const match = s.events.some((e) => ["autonomous_purchase_blocked", "payment_failed", "spend_limit_exceeded", "npci_limit_exceeded", "insufficient_wallet_balance"].includes(e.type))
          if (!match) return false
        } else if (eventFilter === "checkout_created") {
          const match = s.events.some((e) => ["checkout_created", "checkout_initiated", "Razorpay Order Created"].includes(e.type))
          if (!match) return false
        } else if (eventFilter === "ai_search") {
          const match = s.events.some((e) => ["ai_search", "Products Searched"].includes(e.type))
          if (!match) return false
        } else if (!s.events.some((e) => e.type.toLowerCase().includes(eventFilter.toLowerCase()))) {
          return false
        }
      }

      if (resultFilter !== "all" && s.status.toLowerCase() !== resultFilter.toLowerCase()) return false

      if (actorFilter !== "all") {
        if (actorFilter === "customer") {
          const isCust = s.actor_label?.toLowerCase().includes("customer") || s.events.some((e) => (e.actor || "").toLowerCase().includes("customer"))
          if (!isCust) return false
        } else if (actorFilter === "ai_assistants") {
          const isAi = (s.actor_label && !["customer", "user action", "system"].includes(s.actor_label.toLowerCase())) ||
                       s.events.some((e) => e.actor && !["customer", "user action", "system"].includes(e.actor.toLowerCase()))
          if (!isAi) return false
        } else if (actorFilter === "mcp") {
          const isMcp = (s.session_id || "").startsWith("acp_") ||
                        (s.order_id || "").startsWith("RAZ-MCP") ||
                        s.events.some((e) => (e.source || "").toLowerCase().includes("mcp"))
          if (!isMcp) return false
        } else {
          const target = actorFilter.toLowerCase()
          const match = (s.actor_label || "").toLowerCase().includes(target) ||
                        s.events.some((e) => (e.actor || "").toLowerCase().includes(target))
          if (!match) return false
        }
      }

      // Date range filtering
      const sessionDate = s.created_at || ""
      if (dateFilter.preset === "today") {
        const today = new Date().toISOString().slice(0, 10)
        if (!sessionDate.startsWith(today)) return false
      } else if (dateFilter.preset === "yesterday") {
        const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        if (!sessionDate.startsWith(y)) return false
      } else if (dateFilter.preset === "7d") {
        const cutoff = new Date(Date.now() - 7 * 86400000).toISOString()
        if (sessionDate < cutoff) return false
      } else if (dateFilter.preset === "30d") {
        const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
        if (sessionDate < cutoff) return false
      } else if (dateFilter.preset === "custom") {
        const d = sessionDate.slice(0, 10)
        if (dateFilter.startDate && d < dateFilter.startDate) return false
        if (dateFilter.endDate && d > dateFilter.endDate) return false
      }

      return true
    }).sort((a, b) => {
      let comparison = 0
      if (sortKey === "session_id") {
        comparison = a.session_id.localeCompare(b.session_id)
      } else if (sortKey === "order_id") {
        comparison = (a.order_id || "").localeCompare(b.order_id || "")
      } else if (sortKey === "customer") {
        comparison = (a.customer || "").localeCompare(b.customer || "")
      } else if (sortKey === "event_count") {
        comparison = (a.event_count || 0) - (b.event_count || 0)
      } else if (sortKey === "last_event") {
        comparison = (a.last_event || "").localeCompare(b.last_event || "")
      } else if (sortKey === "status") {
        comparison = (a.status || "").localeCompare(b.status || "")
      } else if (sortKey === "severity") {
        comparison = (a.severity || "").localeCompare(b.severity || "")
      } else if (sortKey === "date") {
        comparison = new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [auditData, q, eventFilter, resultFilter, actorFilter, dateFilter, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage = Math.min(page, totalPages)
  const start = filtered.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const end = Math.min(safePage * rowsPerPage, filtered.length)
  const pagedSessions = useMemo(() => {
    return filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage)
  }, [filtered, safePage, rowsPerPage])

  const handleExportLogs = () => {
    if (!canExport) {
      toast.error("You do not have permission to export audit logs.")
      return
    }
    if (!auditData || auditData.length === 0) {
      toast.info("No audit logs to export")
      return
    }
    const headers = [
      "Session ID",
      "Order ID",
      "Customer / Actor",
      "Started At",
      "Status",
      "Severity",
      "Events Count",
      "Last Event",
    ]
    const rows = filtered.map((s) => [
      s.session_id,
      s.order_id || "—",
      `"${(s.customer || "Customer").replace(/"/g, '""')}"`,
      s.created_at ? new Date(s.created_at).toLocaleString("en-IN") : "—",
      s.status,
      s.severity || s.status,
      s.event_count,
      `"${(s.last_event || "").replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-trail-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const openDrawer = (s: AuditSession, e: AuditEvent | null = null) => {
    setSelectedSession(s)
    setSelectedEvent(e)
    setDrawerOpen(true)
  }

  if (loading && auditData.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Skeleton className="h-9 w-48 rounded-lg" />
            <Skeleton className="h-4 w-72 mt-2 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-20 rounded-xl", i === 4 && "col-span-2 sm:col-span-1")} />
          ))}
        </div>
        <Card className="rounded-xl bg-card p-4 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-9 w-64 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
          Audit Trail
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Review every important AI commerce event in one place.
        </p>
      </div>

      {/* KPI 5 cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={<Activity className="size-4" />}
          label="Total Sessions"
          value={String(totalSessions)}
          sub="All sessions"
        />
        <KpiCard
          icon={<FileText className="size-4" />}
          label="Total Events"
          value={String(totalEvents)}
          sub="Logged events"
        />
        <KpiCard
          icon={<CheckCircle2 className="size-4 text-emerald-500" />}
          label="Success Events"
          value={String(success)}
          sub="Completed successfully"
          tone="success"
        />
        <KpiCard
          icon={<AlertTriangle className="size-4 text-rose-500" />}
          label="Failed Events"
          value={String(failed)}
          sub="Need attention"
          tone="destructive"
        />
        <KpiCard
          icon={<AlertOctagon className="size-4 text-rose-500" />}
          label="Critical Alerts"
          value={String(critical)}
          sub="Immediate review"
          tone="destructive"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Filters toolbar */}
      <Card className="rounded-xl bg-card overflow-hidden p-0 shadow-sm border">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b">
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
            <div className="relative w-full sm:w-auto sm:min-w-[220px] lg:min-w-[280px] flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search session, order, event, product…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 rounded-lg bg-card pl-9 text-xs"
              />
            </div>
            <Select value={eventFilter} onValueChange={(v) => setEventFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-full sm:w-[160px] rounded-lg bg-card text-xs flex-1 sm:flex-none">
                <SelectValue placeholder="Event type">
                  {eventFilter === "all"
                    ? "All Events"
                    : eventFilter === "order_settled"
                    ? "Order Settled / Paid"
                    : eventFilter === "order_blocked"
                    ? "Order Blocked / Failed"
                    : eventFilter === "checkout_created"
                    ? "Checkout Created"
                    : "Product Search"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="order_settled">Order Settled / Paid</SelectItem>
                <SelectItem value="order_blocked">Order Blocked / Failed</SelectItem>
                <SelectItem value="checkout_created">Checkout Created</SelectItem>
                <SelectItem value="ai_search">Product Search</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={(v) => setResultFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-full sm:w-[130px] rounded-lg bg-card text-xs flex-1 sm:flex-none">
                <SelectValue placeholder="Result">
                  {resultFilter === "all" ? "All Results" : resultFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="Success">Success</SelectItem>
                <SelectItem value="Warning">Warning</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actorFilter} onValueChange={(v) => setActorFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-full sm:w-[145px] rounded-lg bg-card text-xs flex-1 sm:flex-none">
                <SelectValue placeholder="Actor">
                  {actorFilter === "all"
                    ? "All Actors"
                    : actorFilter === "chatgpt"
                    ? "ChatGPT"
                    : actorFilter === "claude"
                    ? "Claude"
                    : actorFilter === "gemini"
                    ? "Google Gemini"
                    : actorFilter === "store_agent"
                    ? "Store Agent"
                    : actorFilter === "mcp"
                    ? "Connected MCP"
                    : actorFilter === "customer"
                    ? "Customer"
                    : "System"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actors</SelectItem>
                <SelectItem value="chatgpt">ChatGPT</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="store_agent">Store Agent</SelectItem>
                <SelectItem value="mcp">Connected MCP</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker value={dateFilter} onChange={setDateFilter} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <Button
              variant="outline"
              size="icon"
              className="size-9 bg-card shrink-0"
              aria-label="Refresh"
              disabled={isRefreshing}
              onClick={() => loadAuditData(true)}
              title="Refresh audit data"
            >
              <RotateCw className={cn("size-4", isRefreshing && "animate-spin text-primary")} />
            </Button>
            {canExport && (
              <Button
                variant="outline"
                className="h-9 rounded-lg border-primary text-primary hover:bg-primary/5 gap-1.5 px-2.5 sm:px-3 text-xs"
                onClick={handleExportLogs}
              >
                <DownloadIcon className="size-3.5" />
                <span className="hidden sm:inline">Export Logs</span>
              </Button>
            )}
          </div>
        </div>

        {/* Table by session — grouped */}
        <div className="overflow-x-auto">
          <Table className="min-w-[850px]">
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-muted/40">
              <TableHead className="w-8 px-2" />
              <SortableTableHead
                label="Session ID"
                sortKey="session_id"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Order ID"
                sortKey="order_id"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Customer / Actor"
                sortKey="customer"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Event Count"
                sortKey="event_count"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="center"
              />
              <SortableTableHead
                label="Last Event"
                sortKey="last_event"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Status"
                sortKey="status"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Severity"
                sortKey="severity"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <TableHead className="text-right text-xs font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedSessions.map((s) => (
              <>
                <TableRow
                  key={s.session_id}
                  className="hover:bg-muted/20 cursor-pointer"
                  onClick={() => openDrawer(s, null)}
                >
                  <TableCell className="px-2 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()

                        setExpanded((prev) => ({
                          ...prev,
                          [s.session_id]: !prev[s.session_id],
                        }))
                      }}
                      className="flex size-6 items-center justify-center rounded hover:bg-muted"
                      aria-label="Expand"
                    >
                      {expanded[s.session_id] ? (
                        <ChevronDownSmallIcon className="size-4" />
                      ) : (
                        <ChevronRightIcon className="size-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">
                    {s.session_id}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {s.order_id ? (
                      s.order_id
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground/80 font-normal border-dashed bg-muted/20">
                        Not Created
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{s.customer?.trim() ? s.customer : "Guest Customer"}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                          {s.actor_label || "Customer"}
                        </span>
                        {(s.session_id.startsWith("acp_") || (s.order_id && s.order_id.startsWith("RAZ-MCP")) || s.events.some((e) => (e.source || "").toLowerCase().includes("mcp"))) && (
                          <span className="rounded px-1 py-0.5 text-[9px] font-mono font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800">
                            MCP
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs font-medium tabular-nums">
                    {s.event_count} events
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[180px]">
                    {s.last_event}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={variant(s.status)}
                      className="rounded-full text-[11px]"
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={variant(s.severity)}
                      className="rounded-full text-[11px]"
                    >
                      {s.severity || s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-md bg-card text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDrawer(s, null)
                      }}
                    >
                      <EyeIcon className="size-3.5" /> View
                    </Button>
                  </TableCell>
                </TableRow>
                {expanded[s.session_id] ? (
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableCell colSpan={9} className="p-0">
                      <div className="px-6 py-3 space-y-1">
                        {s.events.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs hover:bg-muted/30 cursor-pointer"
                            onClick={() => openDrawer(s, e)}
                          >
                            <span className="font-medium">{e.type}</span>
                            <span className="flex items-center gap-2">
                              <Badge
                                variant={variant(e.result)}
                                className="rounded-full text-[11px]"
                              >
                                {e.result}
                              </Badge>
                              <span className="text-muted-foreground hidden sm:inline">
                                {e.actor} ·{" "}
                                {new Date(e.timestamp).toLocaleTimeString(
                                  "en-IN",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                              <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                            </span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No sessions match filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col gap-3 border-t bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? "Showing 0 of 0"
              : `Showing ${start}-${end} of ${filtered.length} sessions (${totalEvents} total events)`}
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
                <ChevronLeftIcon className="size-4" />
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
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <AuditDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          closeAuditDrawer()
        }}
        session={selectedSession}
        event={selectedEvent}
      />
    </div>
  )
}
