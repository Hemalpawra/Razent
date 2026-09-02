import { useMemo, useState } from "react"
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  IndianRupee,
  ShoppingCart,
  Clock3,
  Truck,
  SlidersHorizontal,
  RotateCw,
  MoreHorizontal,
  Eye,
  Bot,
  User,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import OrderDrawer from "@/components/merchant/Orders/OrderDrawer"
import { useUI } from "@/state/useUI"
import { mockOrders } from "@/lib/mock/orders"
import { formatPrice, type OrderStatus } from "@/lib/types/order"
import type { Order } from "@/lib/types/order"

const STATUS_FILTERS: (OrderStatus | "all")[] = ["all", "paid", "created", "failed", "refunded"]

function statusBadgeVariant(status: OrderStatus) {
  switch (status) {
    case "paid":
      return "success" as const
    case "created":
      return "warning" as const
    case "failed":
      return "destructive" as const
    case "refunded":
      return "secondary" as const
    default:
      return "secondary" as const
  }
}

function statusLabel(status: OrderStatus) {
  switch (status) {
    case "paid":
      return "Paid"
    case "created":
      return "Payment Pending"
    case "failed":
      return "Payment Failed"
    case "refunded":
      return "Refunded"
    default:
      return status
  }
}

function labelForStatus(s: string) {
  if (s === "all") return "All"
  if (s === "paid") return "Paid"
  if (s === "created") return "Created"
  if (s === "failed") return "Failed"
  if (s === "refunded") return "Refunded"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getSource(order: Order): { label: string; icon: typeof Bot } {
  if (order.via_ai && order.conversation_id) return { label: "AI Agent", icon: Bot }
  if (order.via_ai) return { label: "AI Assistant", icon: Bot }
  return { label: "Customer", icon: User }
}

const PAGE_SIZE_DEFAULT = 10

export default function OrdersScreen() {
  const openDrawer = useUI((s) => s.openOrderDrawer)
  const drawerId = useUI((s) => s.drawerOrderId)
  const closeDrawer = useUI((s) => s.closeOrderDrawer)
  const selectedOrder = drawerId ? (mockOrders.find((o) => o.id === drawerId) ?? null) : null

  const [q, setQ] = useState("")
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all")
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_DEFAULT)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return mockOrders
      .filter((o) => {
        if (filterStatus !== "all" && o.status !== filterStatus) return false
        if (!term) return true
        return (
          o.id.toLowerCase().includes(term) ||
          o.shipping_address.full_name.toLowerCase().includes(term) ||
          o.shipping_address.email.toLowerCase().includes(term) ||
          o.items.some((it) => it.title.toLowerCase().includes(term))
        )
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [q, filterStatus])

  // reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const safePage = Math.min(page, totalPages)
  const start = filtered.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1
  const end = Math.min(safePage * rowsPerPage, filtered.length)
  const paged = useMemo(() => {
    const s = (safePage - 1) * rowsPerPage
    return filtered.slice(s, s + rowsPerPage)
  }, [filtered, safePage, rowsPerPage])

  const allPagedSelected = paged.length > 0 && paged.every((o) => selectedIds.has(o.id))
  const somePagedSelected = paged.some((o) => selectedIds.has(o.id)) && !allPagedSelected

  function toggleAll(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        paged.forEach((o) => next.add(o.id))
      } else {
        paged.forEach((o) => next.delete(o.id))
      }
      return next
    })
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const kpis = useMemo(() => {
    const total = mockOrders.length
    const paid = mockOrders.filter((o) => o.status === "paid").length
    const pending = mockOrders.filter((o) => o.status === "created").length
    const shipped = mockOrders.filter((o) => o.shipping_status === "shipped").length
    const revenuePaise = mockOrders.filter((o) => o.status === "paid").reduce((sum, o) => sum + o.total_paise, 0)
    return { total, paid, pending, shipped, revenuePaise }
  }, [])

  return (
    <div className="space-y-4 bg-muted/30 -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
            Orders
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            View and manage all orders created through your store
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg bg-card">
            May 20 - May 27
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
            <ChevronDown className="size-3.5 opacity-60" />
          </div>
        </div>
      </div>

      {/* KPI row — 5 cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={<ShoppingCart className="size-4" />} label="Total Orders" value={String(kpis.total)} sub="All time Orders" />
        <KpiCard
          icon={<ShoppingCart className="size-4" />}
          label="Paid Orders"
          value={String(kpis.paid)}
          sub={`${kpis.total ? ((kpis.paid / kpis.total) * 100).toFixed(1) : "0"}% of total`}
        />
        <KpiCard
          icon={<Clock3 className="size-4" />}
          label="Pending Payment"
          value={String(kpis.pending)}
          sub={`${kpis.total ? ((kpis.pending / kpis.total) * 100).toFixed(1) : "0"}% of total`}
        />
        <KpiCard
          icon={<Truck className="size-4" />}
          label="Shipped orders"
          value={String(kpis.shipped)}
          sub={`${kpis.total ? ((kpis.shipped / kpis.total) * 100).toFixed(1) : "0"}% of total`}
        />
        <KpiCard
          icon={<IndianRupee className="size-4" />}
          label="Revenue (Paid)"
          value={formatPrice(kpis.revenuePaise)}
          sub="From paid orders"
          valueIsAmount
        />
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden rounded-xl bg-card py-0">
        {/* Toolbar — required buttons: search, More Filters, refresh, overflow, date, Export */}
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full max-w-[320px]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
                placeholder="Search by order id or customer…"
                className="h-9 bg-card pl-9"
              />
            </div>
            <Button variant="outline" className="hidden h-9 shrink-0 rounded-lg bg-card sm:inline-flex">
              <SlidersHorizontal className="size-3.5" />
              More Filters
            </Button>
            {/* mobile More Filters icon */}
            <Button variant="outline" size="icon" className="h-9 bg-card sm:hidden" aria-label="More Filters">
              <SlidersHorizontal className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="icon"
              className="hidden h-9 w-9 bg-card sm:inline-flex"
              aria-label="Refresh"
              onClick={() => {
                setQ("")
                setFilterStatus("all")
                setPage(1)
              }}
            >
              <RotateCw className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="hidden h-9 w-9 bg-card sm:inline-flex" aria-label="More">
              <MoreHorizontal className="size-4" />
            </Button>
            <Button variant="outline" className="hidden h-9 rounded-lg bg-card sm:inline-flex">
              May 20 - May 27
              <ChevronDown className="size-4 opacity-60" />
            </Button>
            <Button variant="outline" className="hidden h-9 rounded-lg bg-card sm:inline-flex">
              <Download className="size-4" />
              Export
            </Button>
            {/* On mobile keep compact Export */}
            <Button variant="outline" className="h-9 rounded-lg bg-card sm:hidden">
              <Download className="size-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Status pills row below toolbar */}
        <div className="flex gap-1.5 overflow-x-auto border-b px-3 py-2">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilterStatus(s)
                setPage(1)
              }}
              className="h-7 shrink-0 rounded-full px-3 text-xs capitalize"
            >
              {labelForStatus(s)}
            </Button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 w-10 px-3">
                  <Checkbox
                    checked={allPagedSelected ? true : somePagedSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleAll(v === true)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">Order ID</TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">Product</TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">Source</TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">Price</TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">Status</TableHead>
                <TableHead className="h-10 px-3 text-xs font-semibold text-foreground">Last updated</TableHead>
                <TableHead className="h-10 px-3 text-right text-xs font-semibold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No orders match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((order) => {
                  const source = getSource(order)
                  const SourceIcon = source.icon
                  const primaryItem = order.items[0]
                  const totalQty = order.items.reduce((sum, it) => sum + it.qty, 0)
                  const qtyLine =
                    order.items.length === 1 ? `Qty: ${primaryItem.qty}` : `Qty: ${totalQty} · ${order.items.length} items`
                  const date = new Date(order.created_at)
                  const dateStr = date.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                  const timeStr = date.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                  return (
                    <TableRow key={order.id} className="hover:bg-muted/20">
                      <TableCell className="px-3 py-3">
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={(v) => toggleOne(order.id, v === true)}
                          aria-label={`Select ${order.id}`}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <button
                          onClick={() => openDrawer(order.id)}
                          className="text-left text-xs font-medium text-foreground hover:underline"
                        >
                          {order.id}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={primaryItem.image_url}
                            alt={primaryItem.title}
                            className="size-9 shrink-0 rounded-full object-cover ring-1 ring-border/40"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <div className="max-w-[14rem] truncate text-xs font-medium leading-4 text-foreground">
                              {primaryItem.title}
                              {order.items.length > 1 ? ` +${order.items.length - 1}` : ""}
                            </div>
                            <div className="text-[11px] leading-3 text-muted-foreground">{qtyLine}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <SourceIcon className="size-3.5 text-muted-foreground" />
                          {source.label}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-xs font-medium tabular-nums text-foreground">
                        {formatPrice(order.total_paise)}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <Badge
                          variant={statusBadgeVariant(order.status)}
                          className="rounded-full px-2.5 py-0 text-[11px] capitalize"
                        >
                          {statusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <div className="text-xs leading-4 text-foreground">{dateStr}</div>
                        <div className="text-[11px] leading-3 text-muted-foreground">{timeStr}</div>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="View details"
                            onClick={() => openDrawer(order.id)}
                            className="size-7"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="icon-sm" className="size-7" aria-label="More actions" />}
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openDrawer(order.id)}>View details</DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(order.id).catch(() => {})
                                }}
                              >
                                Copy ID
                              </DropdownMenuItem>
                              <DropdownMenuItem>Refund</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? "Showing 0 of 0"
              : `Showing ${start}-${end} of ${filtered.length}`}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Rows per page</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => {
                  if (v) {
                    setRowsPerPage(Number(v))
                    setPage(1)
                  }
                }}
              >
                <SelectTrigger className="h-8 w-[70px] bg-card">
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

      <OrderDrawer open={drawerId !== null} onClose={closeDrawer} order={selectedOrder} />
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
    <Card className="rounded-xl bg-card p-5 shadow-sm py-5">
      <div className="flex gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium leading-5 text-muted-foreground">{label}</div>
          <div
            className={
              valueIsAmount
                ? "mt-0.5 text-lg font-semibold leading-6 text-foreground"
                : "mt-0.5 font-heading text-[22px] font-semibold leading-7 text-foreground"
            }
          >
            {value}
          </div>
          <div className="mt-0.5 text-[10px] leading-3 text-muted-foreground">{sub}</div>
        </div>
      </div>
    </Card>
  )
}
