import { useEffect, useMemo, useState } from "react"
import { Search, SlidersHorizontal, Download, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, IndianRupee, ShoppingCart, TrendingUp, Package, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table"
import { listProducts, deleteProduct } from "@/lib/api/client"
import { formatPrice } from "@/lib/types/product"
import type { Product, ProductStatus } from "@/lib/types/product"

// Strict shadcn — matches Figma 1920WLight-1: Header + 5 KPI cards + filters + Table + pagination
// Tokens: bg-card / text-foreground / muted / primary, rounded-xl, no hardcoded hex

const PAGE_SIZE = 10

export default function ProductsScreen() {
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const data = await listProducts()
      if (alive) {
        setProducts(data)
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => products.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false
    if (!q.trim()) return true
    const needle = q.toLowerCase()
    return p.title.toLowerCase().includes(needle) || p.category.toLowerCase().includes(needle) || p.tags.some((t) => t.toLowerCase().includes(needle)) || p.description.toLowerCase().includes(needle)
  }), [products, q, statusFilter])

  // reset page when filter changes
  useEffect(() => { setPage(1) }, [q, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const paged = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  const kpi = useMemo(() => {
    const total = products.length
    const active = products.filter(p => p.status === "active").length
    const low = products.filter(p => p.stock > 0 && p.stock <= 10).length
    const out = products.filter(p => p.stock === 0).length
    const draft = products.filter(p => p.status === "draft").length
    return { total, active, low, out, draft }
  }, [products])

  return (
    <div className="space-y-4 bg-muted/30 -m-6 p-6">
      {/* Header — Figma Header: title + subtitle left, user block right */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">Products</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Manage your product catalog, inventory and visibility.</p>
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">MS</div>
          <div className="leading-none">
            <div className="text-xs font-bold text-foreground">Merchant Store</div>
            <div className="text-[11px] text-muted-foreground">Super Admin</div>
          </div>
          <span className="text-xs text-muted-foreground">⌄</span>
        </div>
      </div>

      {/* KPI strip — 5 cards — Figma Container6 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={<IndianRupee className="size-4" />} label="Total Products" value={String(kpi.total)} sub="All Products in catalog" />
        <KpiCard icon={<ShoppingCart className="size-4" />} label="Active Products" value={String(kpi.active)} sub="Visible to customers" />
        <KpiCard icon={<TrendingUp className="size-4" />} label="Low stock" value={String(kpi.low)} sub="Need attention" />
        <KpiCard icon={<Package className="size-4" />} label="Out of stock" value={String(kpi.out)} sub="Currently unavailble" />
        <KpiCard icon={<FileText className="size-4" />} label="Draft Products" value={String(kpi.draft)} sub="Not Published yet" />
      </div>

      {/* Table card — wraps toolbar + table + pagination — Figma _Table/Header-Base + rows */}
      <Card className="rounded-xl bg-card overflow-hidden p-0 shadow-sm">
        {/* Toolbar — Figma WrapperDesktop: search left, actions right */}
        <div className="flex flex-col gap-3 border-b bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full max-w-[285px]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products, categories, tags..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 rounded-lg bg-card pl-9"
              />
            </div>
            <Button variant="outline" className="h-9 rounded-lg bg-card hidden sm:inline-flex">
              <SlidersHorizontal className="size-3.5" />
              More Filters
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 lg:flex">
              <Button variant="outline" size="icon" className="size-9 rounded-md bg-muted/40" aria-label="grid">
                <span className="size-4 rounded-sm border border-muted-foreground/40" />
              </Button>
              <Button variant="outline" size="icon" className="size-9 rounded-md bg-muted/40" aria-label="list">
                <span className="size-4 rounded-sm border border-muted-foreground/40" />
              </Button>
            </div>
            <Button variant="outline" className="h-9 rounded-md border-primary text-primary hover:bg-primary/5 hover:text-primary">
              <Download className="size-4" />
              Export
            </Button>
            <Button className="h-9 rounded-md">
              <Plus className="size-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Status filter pills — keeps existing functionality, Figma-like muted */}
        <div className="flex items-center gap-1.5 border-b bg-card px-3 py-2">
          <span className="mr-1 text-[11px] font-medium text-muted-foreground">Status:</span>
          {(["all", "active", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors " +
                (statusFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              {s}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} products</span>
        </div>

        {/* Table — Figma columns: [chk] Product | SKU | Category | Price | Stock | Status | Last updated | Actions */}
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-muted/40">
              <TableHead className="w-[48px] px-3">
                <input type="checkbox" className="size-4 rounded border-input" aria-label="select all" />
              </TableHead>
              <TableHead className="text-xs font-semibold text-foreground">Product</TableHead>
              <TableHead className="text-xs font-semibold text-foreground">Category</TableHead>
              <TableHead className="text-right text-xs font-semibold text-foreground">Price</TableHead>
              <TableHead className="text-center text-xs font-semibold text-foreground">Stock</TableHead>
              <TableHead className="text-xs font-semibold text-foreground">Status</TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-semibold text-foreground">Last updated</TableHead>
              <TableHead className="text-right text-xs font-semibold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">Loading products...</TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">No products match this filter.</TableCell>
              </TableRow>
            ) : (
              paged.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="px-3">
                    <input type="checkbox" className="size-4 rounded border-input" aria-label={`select ${p.title}`} />
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image_url} alt={p.title} className="size-9 shrink-0 rounded-md object-cover ring-1 ring-border/50" loading="lazy" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{p.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.description.slice(0, 48)}…</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-xs text-muted-foreground">{p.category}</TableCell>
                  <TableCell className="px-3 text-right text-sm font-semibold tabular-nums text-foreground">{formatPrice(p.price_paise)}</TableCell>
                  <TableCell className="px-3 text-center">
                    <span className={"text-sm font-semibold tabular-nums " + (p.stock === 0 ? "text-destructive" : p.stock <= 10 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>{p.stock}</span>
                    <span className={"ml-1 text-xs " + (p.stock === 0 ? "text-destructive" : p.stock <= 10 ? "text-amber-600/80" : "text-muted-foreground")}>{p.stock === 0 ? "out" : p.stock <= 10 ? "low" : "in stock"}</span>
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge variant={p.status === "active" ? "success" : p.status === "draft" ? "warning" : "secondary"} className="rounded-full px-2.5 py-0 text-xs capitalize">{p.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell px-3 text-xs text-muted-foreground">
                    <div className="leading-tight text-foreground">{new Date(p.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(p.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="icon-sm" className="rounded-md" onClick={() => alert(`Edit ${p.title}`)} aria-label={`Edit ${p.title}`}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={async () => {
                          await deleteProduct(p.id)
                          setProducts((prev) => prev.filter((x) => x.id !== p.id))
                        }}
                        aria-label={`Delete ${p.title}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination — Figma Pagination: Previous / Next 32px muted bg */}
        <div className="flex items-center justify-between border-t bg-card px-3 py-3">
          <span className="text-xs text-muted-foreground">Showing {(pageClamped - 1) * PAGE_SIZE + 1}–{Math.min(pageClamped * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" className="size-8 rounded-md bg-muted/40" disabled={pageClamped <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-xs tabular-nums text-muted-foreground">Page {pageClamped} of {totalPages}</span>
            <Button variant="outline" size="icon-sm" className="size-8 rounded-md bg-muted/40" disabled={pageClamped >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card className="rounded-xl bg-card p-6 shadow-sm">
      <div className="flex gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 font-heading text-2xl font-semibold leading-8 text-foreground">{value}</div>
          <div className="text-[10px] leading-3 text-muted-foreground">{sub}</div>
        </div>
      </div>
    </Card>
  )
}
