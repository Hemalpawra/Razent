import { useMemo, useState } from "react"
import {
  Search,
  ChevronDown,
  Download,
  IndianRupee,
  ShoppingCart,
  Clock3,
  Truck,
  Wallet,
  SlidersHorizontal,
  LayoutGrid,
  List,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import OrderDrawer from "@/components/merchant/Orders/OrderDrawer"
import { useUI } from "@/state/useUI"
import { mockOrders } from "@/lib/mock/orders"
import { formatPrice, type OrderStatus } from "@/lib/types/order"

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

function shippingBadgeVariant(status: string) {
  switch (status) {
    case "delivered":
      return "success" as const
    case "shipped":
      return "default" as const
    case "packed":
      return "warning" as const
    case "pending":
      return "secondary" as const
    case "returned":
      return "destructive" as const
    default:
      return "secondary" as const
  }
}

function labelForStatus(s: string) {
  if (s === "all") return "All"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function OrdersScreen() {
  const openDrawer = useUI((s) => s.openOrderDrawer)
  const drawerId = useUI((s) => s.drawerOrderId)
  const closeDrawer = useUI((s) => s.closeOrderDrawer)
  const selectedOrder = drawerId ? (mockOrders.find((o) => o.id === drawerId) ?? null) : null

  const [q, setQ] = useState("")
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all")

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return mockOrders
      .filter((o) => {
        if (filterStatus !== "all" && o.status !== filterStatus) return false
        if (!term) return true
        return (
          o.id.toLowerCase().includes(term) ||
          o.shipping_address.full_name.toLowerCase().includes(term) ||
          o.shipping_address.email.toLowerCase().includes(term)
        )
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [q, filterStatus])

  // KPI aggregates from full dataset (Figma shows all-time)
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
      {/* Header — Figma Header: Orders + subtitle + controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
            Orders
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">View and manage all orders created through your store</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      {/* KPI strip — 5 cards — Figma Container12 / Background1..9 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<ShoppingCart className="size-4" />}
          label="Total Orders"
          value={String(kpis.total)}
          sub="All time Orders"
        />
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

      {/* Table Card — Figma _Table/Header-Base + WrapperDesktop + TableHeaderRow + Rows */}
      <Card className="overflow-hidden rounded-xl bg-card py-0">
        {/* Toolbar — search + filters + trailing icons — Figma Container31 */}
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full max-w-[320px]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by order id or customer…"
                className="h-9 bg-card pl-9"
              />
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              {STATUS_FILTERS.map((s) => (
                <Button
                  key={s}
                  variant={filterStatus === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(s)}
                  className="h-7 rounded-full px-3 text-xs capitalize"
                >
                  {labelForStatus(s)}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="outline" size="sm" className="h-9 rounded-lg bg-card">
              <SlidersHorizontal className="size-3.5" />
              More Filters
            </Button>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon-sm" aria-label="Grid view" className="bg-card">
                <LayoutGrid className="size-4" />
              </Button>
              <Button variant="outline" size="icon-sm" aria-label="List view" className="bg-card">
                <List className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile status filters */}
        <div className="flex gap-1.5 overflow-x-auto border-b px-3 py-2 sm:hidden">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className="h-7 shrink-0 rounded-full px-3 text-xs capitalize"
            >
              {labelForStatus(s)}
            </Button>
          ))}
        </div>

        {/* Table — shadcn Table replicating Figma columns: Order ID / Customer / Amount / Status / Shipping + View */}
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12 px-4 text-[13px] font-semibold text-foreground">Order ID</TableHead>
              <TableHead className="h-12 px-3 text-[13px] font-semibold text-foreground">Customer</TableHead>
              <TableHead className="h-12 px-3 text-right text-[13px] font-semibold text-foreground">Amount</TableHead>
              <TableHead className="h-12 px-3 text-center text-[13px] font-semibold text-foreground">Status</TableHead>
              <TableHead className="h-12 px-3 text-center text-[13px] font-semibold text-foreground">Shipping</TableHead>
              <TableHead className="h-12 px-4 text-right text-[13px] font-semibold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No orders match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/20">
                  <TableCell className="px-4 py-3">
                    <button
                      onClick={() => openDrawer(order.id)}
                      className="text-left text-sm font-medium text-foreground hover:underline"
                    >
                      {order.id}
                    </button>
                    <div className="text-[11px] leading-4 text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      <span className="opacity-70">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="text-sm font-medium leading-4 text-foreground">{order.shipping_address.full_name}</div>
                    <div className="max-w-[14rem] truncate text-xs text-muted-foreground" title={order.shipping_address.email}>
                      {order.shipping_address.email}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right font-medium tabular-nums text-foreground">
                    {formatPrice(order.total_paise)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-center">
                    <Badge variant={statusBadgeVariant(order.status)} className="rounded-full px-2.5 py-0 text-[11px] capitalize">
                      {order.status === "created" ? "Payment Pending" : order.status === "paid" ? "Paid" : order.status === "failed" ? "Payment Failed" : order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-center">
                    <Badge variant={shippingBadgeVariant(order.shipping_status)} className="rounded-full px-2.5 py-0 text-[11px] capitalize">
                      {order.shipping_status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => openDrawer(order.id)} className="h-7 rounded-md bg-card">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer — pagination / count — Figma Pagination */}
        <div className="flex items-center justify-between border-t bg-card px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {filtered.length} of {mockOrders.length} orders
            {filterStatus !== "all" ? ` · ${labelForStatus(filterStatus)}` : ""}
            {q ? ` · search: "${q}"` : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled className="size-8 rounded-md bg-card">
              <ChevronDown className="size-4 rotate-90" />
            </Button>
            <Button variant="outline" size="icon-sm" disabled className="size-8 rounded-md bg-card">
              <ChevronDown className="size-4 -rotate-90" />
            </Button>
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
