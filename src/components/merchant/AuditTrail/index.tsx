import { useMemo, useState } from "react"

import {
  SearchIcon,
  ChevronDownIcon,
  DownloadIcon,
  RotateCcwIcon,
  ChevronRightIcon,
  ChevronDownIcon as ChevronDownSmallIcon,
  EyeIcon,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"

import { Input } from "@/components/ui/input"

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

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [selectedSession, setSelectedSession] = useState<AuditSession | null>(
    null,
  )

  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)

  const isMobile = useIsMobile()
  const setActiveScreen = useUI((s) => s.setActiveScreen)
  const openAuditDrawer = useUI((s) => s.openAuditDrawer)
  const closeAuditDrawer = useUI((s) => s.closeAuditDrawer)
  const drawerAuditSessionId = useUI((s) => s.drawerAuditSessionId)

  const totalSessions = auditData.length

  const totalEvents = auditData.reduce((a, s) => a + s.event_count, 0)

  const success = auditData
    .filter((s) => s.status === "Success")
    .reduce((a, s) => a + s.event_count, 0)

  const failed = auditData.filter((s) => s.status === "Failed").length

  const critical = auditData.filter(
    (s) => s.status === "Critical",
  ).length

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

      if (
        eventFilter !== "all" &&
        !s.events.some((e) => e.type === eventFilter)
      )
        return false

      if (resultFilter !== "all" && s.status !== resultFilter) return false

      if (
        actorFilter !== "all" &&
        !s.events.some((e) => e.actor === actorFilter)
      )
        return false

      return true
    })
  }, [q, eventFilter, resultFilter, actorFilter])

  const openDrawer = (s: AuditSession, e: AuditEvent | null = null) => {
    setSelectedSession(s)

    setSelectedEvent(e)

    if (isMobile) {
      openAuditDrawer(s.session_id)
      setActiveScreen("audit_detail")
    } else {
      setDrawerOpen(true)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
            Audit Trail
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Review every important AI commerce event in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg bg-card">
            May 20, 2025 - May 27, 2025
            <ChevronDownIcon className="size-4 opacity-60" />
          </Button>
          <Button variant="outline" className="h-9 rounded-lg bg-card">
            <DownloadIcon className="size-4" />
            Export
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
          </div>
        </div>
      </div>

      {/* KPI 5 cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Total Sessions"
          value={String(totalSessions)}
          sub="All sessions"
        />
        <Kpi
          label="Total Events"
          value={String(totalEvents)}
          sub="Logged events"
        />
        <Kpi
          label="Success Events"
          value={String(success)}
          sub="Completed successfully"
          tone="success"
        />
        <Kpi
          label="Failed Events"
          value={String(failed)}
          sub="Need attention"
          tone="destructive"
        />
        <Kpi
          label="Critical Alerts"
          value={String(critical)}
          sub="Immediate review"
          tone="destructive"
        />
      </div>

      {/* Filters toolbar */}
      <Card className="rounded-xl bg-card overflow-hidden p-0 shadow-sm">
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full max-w-[320px]">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search session, order, event, product…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 rounded-lg bg-card pl-9 text-sm"
              />
            </div>
            <Select value={eventFilter} onValueChange={(v) => setEventFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-[160px] rounded-lg bg-card text-xs">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="Razorpay Order Created">
                  Order Created
                </SelectItem>
                <SelectItem value="Payment Successful">
                  Payment Successful
                </SelectItem>
                <SelectItem value="Products Searched">
                  Products Searched
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={(v) => setResultFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-[140px] rounded-lg bg-card text-xs">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="Success">Success</SelectItem>
                <SelectItem value="Warning">Warning</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actorFilter} onValueChange={(v) => setActorFilter(v ?? "all")}>
              <SelectTrigger className="h-9 w-[150px] rounded-lg bg-card text-xs">
                <SelectValue placeholder="Actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="AI Assistant">AI Assistant</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg bg-card"
            >
              May 20–27
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg bg-card"
              onClick={() => {
                setQ("")
                setEventFilter("all")
                setResultFilter("all")
                setActorFilter("all")
              }}
            >
              <RotateCcwIcon className="size-3.5" /> Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg border-primary text-primary hover:bg-primary/5"
            >
              <DownloadIcon className="size-3.5" /> Export logs
            </Button>
          </div>
        </div>

        {/* Table by session — grouped */}
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-muted/40">
              <TableHead className="w-8 px-2" />
              <TableHead className="text-xs font-semibold">
                Session ID
              </TableHead>
              <TableHead className="text-xs font-semibold">Order ID</TableHead>
              <TableHead className="text-xs font-semibold">
                Customer / AI
              </TableHead>
              <TableHead className="text-center text-xs font-semibold">
                Event Count
              </TableHead>
              <TableHead className="text-xs font-semibold">
                Last Event
              </TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
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
                    {s.order_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium">{s.customer}</span>
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px]">
                      {s.actor_label}
                    </span>
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
                    <TableCell colSpan={8} className="p-0">
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
                  colSpan={8}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No sessions match filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t bg-card px-3 py-3 text-xs text-muted-foreground">
          <span>
            Showing {filtered.length} of {totalSessions} sessions
          </span>
          <span>{totalEvents} total events</span>
        </div>
      </Card>

      <AuditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        session={selectedSession}
        event={selectedEvent}
      />
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone?: "success" | "destructive"
}) {
  return (
    <Card className="rounded-xl bg-card p-5 shadow-sm">
      <CardContent className="p-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={`mt-1 text-2xl font-semibold tabular-nums ${
            tone === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : tone === "destructive"
                ? "text-destructive"
                : "text-foreground"
          }`}
        >
          {value}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}
