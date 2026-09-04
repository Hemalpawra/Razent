import { useEffect, useMemo, useState } from "react"
import {
  Search,
  SlidersHorizontal,
  Download,
  Upload,
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  ShoppingCart,
  TrendingUp,
  Package,
  FileText,
  RotateCw,
  MoreHorizontal,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ImportModal } from "@/components/merchant/shared/ImportModal"
import { cn } from "@/lib/utils"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { listProducts, deleteProduct } from "@/lib/api/client"
import { formatPrice } from "@/lib/types/product"
import type { Product, ProductStatus } from "@/lib/types/product"
import ProductDrawer from "./ProductDrawer"
import { useUI } from "@/state/useUI"
import { useIsMobile } from "@/hooks/use-mobile"

function getSku(p: Product): string {
  const any = p as unknown as Record<string, string>
  if (any.sku) return any.sku
  const raw = p.id
    .replace(/^prod_/, "")
    .slice(0, 6)
    .toUpperCase()
    .padEnd(4, "0")
  return `SKU-${raw}`
}

export default function ProductsScreen() {
  const isMobile = useIsMobile()
  const setActiveScreen = useUI((s) => s.setActiveScreen)
  const openProductDrawer = useUI((s) => s.openProductDrawer)
  const closeProductDrawer = useUI((s) => s.closeProductDrawer)
  const drawerProductId = useUI((s) => s.drawerProductId)
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadProducts = async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const data = await listProducts()
      setProducts(data)
    } finally {
      if (isManual) setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    listProducts()
      .then((data) => {
        if (alive) {
          setProducts(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const handleExport = () => {
    if (!products || products.length === 0) return
    const headers = ["ID", "Title", "SKU", "Category", "Price (INR)", "Stock", "Status"]
    const rows = filtered.map((p) => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      getSku(p),
      p.category,
      (p.price_paise / 100).toFixed(2),
      p.stock,
      p.status,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleImportProducts = async (rows: Record<string, string>[]) => {
    let success = 0
    let errors = 0
    const { upsertProduct } = await import("@/lib/api/client")
    for (const r of rows) {
      try {
        const title = r.title || r.Title || r.product_name || "Imported Product"
        const price = Math.round(parseFloat(r.price || r.Price || "100") * 100)
        const id = r.id || `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        await upsertProduct({
          id,
          title,
          description: r.description || `${title} from catalog`,
          price_paise: price,
          category: r.category || "Grocery",
          stock: parseInt(r.stock || "50", 10),
          status: (r.status || "active") as any,
          tags: ["imported", r.category || "grocery"].filter(Boolean),
          image_url: r.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=240&q=70&auto=format&fit=crop",
        })
        success++
      } catch {
        errors++
      }
    }
    await loadProducts()
    return { success, errors }
  }

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false
        if (!q.trim()) return true
        const needle = q.toLowerCase()
        const sku = getSku(p).toLowerCase()
        return (
          p.title.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle)) ||
          p.description.toLowerCase().includes(needle) ||
          sku.includes(needle)
        )
      }),
    [products, q, statusFilter],
  )

  useEffect(() => {
    setPage(1)
  }, [q, statusFilter, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageClamped = Math.min(page, totalPages)
  const paged = filtered.slice(
    (pageClamped - 1) * pageSize,
    pageClamped * pageSize,
  )

  const kpi = useMemo(() => {
    const total = products.length
    const active = products.filter((p) => p.status === "active").length
    const low = products.filter((p) => p.stock > 0 && p.stock <= 10).length
    const out = products.filter((p) => p.stock === 0).length
    const draft = products.filter((p) => p.status === "draft").length
    return { total, active, low, out, draft }
  }, [products])

  function handleProductClick(p: Product) {
    if (isMobile) {
      setActiveScreen("product_detail")
      openProductDrawer(p.id)
    } else {
      openProductDrawer(p.id)
    }
  }

  if (loading && products.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 mt-1 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Card className="rounded-xl bg-card p-4 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-9 w-64 rounded-lg" />
            <Skeleton className="h-9 w-48 rounded-lg" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header — simplified, no avatar block, no date */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-[32px] font-semibold leading-[38px] tracking-tight text-foreground">
          Products
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Manage your product catalog, inventory and visibility.
        </p>
      </div>

      {/* KPI strip — 5 cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<IndianRupee className="size-4" />}
          label="Total Products"
          value={String(kpi.total)}
          sub="All Products in catalog"
        />
        <KpiCard
          icon={<ShoppingCart className="size-4" />}
          label="Active Products"
          value={String(kpi.active)}
          sub="Visible to customers"
        />
        <KpiCard
          icon={<TrendingUp className="size-4" />}
          label="Low stock"
          value={String(kpi.low)}
          sub="Need attention"
        />
        <KpiCard
          icon={<Package className="size-4" />}
          label="Out of stock"
          value={String(kpi.out)}
          sub="Currently unavailable"
        />
        <KpiCard
          icon={<FileText className="size-4" />}
          label="Draft Products"
          value={String(kpi.draft)}
          sub="Not Published yet"
        />
      </div>

      {/* Table card — full width, no side gutters */}
      <Card className="overflow-hidden rounded-xl bg-card p-0 shadow-sm">
        {/* Toolbar — left: search + filters + refresh + more, right: Export + Add Product, flex-wrap gap-2 */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card p-3">
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
            <div className="relative w-full max-w-[285px] min-w-[180px] flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products, categories, tags..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 rounded-lg bg-card pl-9 text-sm"
              />
            </div>
            <Button
              variant="outline"
              className="h-9 rounded-lg bg-card hidden sm:inline-flex"
            >
              <SlidersHorizontal className="size-3.5" />
              More Filters
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-md shrink-0"
              aria-label="Refresh"
              disabled={isRefreshing}
              onClick={() => loadProducts(true)}
            >
              <RotateCw className={cn("size-4", isRefreshing && "animate-spin text-primary")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-md shrink-0"
              aria-label="More options"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              className="h-9 rounded-md gap-1.5"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" />
              Import
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-md border-primary text-primary hover:bg-primary/5 hover:text-primary gap-1.5"
              onClick={handleExport}
            >
              <Download className="size-4" />
              Export
            </Button>
            <Button className="h-9 rounded-md" onClick={() => openProductDrawer(null)}>
              <Plus className="size-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-b bg-card px-3 py-2">
          <span className="mr-1 text-[11px] font-medium text-muted-foreground">
            Status:
          </span>
          {(["all", "active", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors " +
                (statusFilter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              {s}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} products
          </span>
        </div>

        {/* Table — full width, horizontal scroll with min-w, sticky header, tight cells */}
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/40">
              <TableRow className="hover:bg-muted/40">
                <TableHead className="w-[40px] px-2.5 py-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    aria-label="select all"
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableHead>
                <TableHead className="px-2.5 py-2 text-xs font-semibold text-foreground">
                  Product
                </TableHead>
                <TableHead className="px-2.5 py-2 text-xs font-semibold text-foreground">
                  SKU
                </TableHead>
                <TableHead className="px-2.5 py-2 text-xs font-semibold text-foreground">
                  Category
                </TableHead>
                <TableHead className="px-2.5 py-2 text-right text-xs font-semibold text-foreground">
                  Price
                </TableHead>
                <TableHead className="px-2.5 py-2 text-center text-xs font-semibold text-foreground">
                  Stock
                </TableHead>
                <TableHead className="px-2.5 py-2 text-xs font-semibold text-foreground">
                  Status
                </TableHead>
                <TableHead className="px-2.5 py-2 text-right text-xs font-semibold text-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    No products match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/30 even:bg-muted/10"
                    onClick={() => handleProductClick(p)}
                  >
                    <TableCell
                      className="px-2.5 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        aria-label={`select ${p.title}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="px-2.5 py-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="size-9 shrink-0 rounded-md object-cover ring-1 ring-border/50"
                          loading="lazy"
                        />
                        <div className="min-w-0 max-w-[240px]">
                          <div className="truncate text-sm font-medium text-foreground">
                            {p.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {p.description.slice(0, 48)}…
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2.5 py-2">
                      <span className="font-mono text-xs font-medium tracking-tight text-muted-foreground">
                        {getSku(p)}
                      </span>
                    </TableCell>
                    <TableCell className="px-2.5 py-2 text-xs text-muted-foreground">
                      {p.category}
                    </TableCell>
                    <TableCell className="px-2.5 py-2 text-right text-sm font-semibold tabular-nums text-foreground">
                      {formatPrice(p.price_paise)}
                    </TableCell>
                    <TableCell className="px-2.5 py-2 text-center">
                      <span
                        className={
                          "text-sm font-semibold tabular-nums " +
                          (p.stock === 0
                            ? "text-destructive"
                            : p.stock <= 10
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400")
                        }
                      >
                        {p.stock}
                      </span>
                      <span
                        className={
                          "ml-1 text-xs " +
                          (p.stock === 0
                            ? "text-destructive"
                            : p.stock <= 10
                              ? "text-amber-600/80"
                              : "text-muted-foreground")
                        }
                      >
                        {p.stock === 0
                          ? "out"
                          : p.stock <= 10
                            ? "low"
                            : "in stock"}
                      </span>
                    </TableCell>
                    <TableCell className="px-2.5 py-2">
                      <Badge
                        variant={
                          p.status === "active"
                            ? "success"
                            : p.status === "draft"
                              ? "warning"
                              : "secondary"
                        }
                        className="rounded-full px-2.5 py-0 text-xs capitalize"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2.5 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="rounded-md"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleProductClick(p)
                          }}
                          aria-label={`View ${p.title}`}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="outline"
                                size="icon-sm"
                                className="rounded-md"
                                aria-label={`Actions for ${p.title}`}
                                onClick={(e: React.MouseEvent) =>
                                  e.stopPropagation()
                                }
                              />
                            }
                          >
                            <MoreHorizontal className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              onClick={() => handleProductClick(p)}
                            >
                              <Eye className="size-3.5" /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={async (e) => {
                                e.stopPropagation()
                                await deleteProduct(p.id)
                                setProducts((prev) =>
                                  prev.filter((x) => x.id !== p.id),
                                )
                              }}
                            >
                              <Trash2 className="size-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer: Showing + Select rows per page + pagination */}
        <div className="flex flex-col gap-3 border-t bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Showing{" "}
            {filtered.length === 0 ? 0 : (pageClamped - 1) * pageSize + 1}–
            {Math.min(pageClamped * pageSize, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Rows per page
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(v: string | null) => setPageSize(Number(v))}
              >
                <SelectTrigger className="h-8 w-[72px] rounded-md">
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
                className="size-8 rounded-md bg-muted/40"
                disabled={pageClamped <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-xs tabular-nums text-muted-foreground">
                Page {pageClamped} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-8 rounded-md bg-muted/40"
                disabled={pageClamped >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ProductDrawer
        open={drawerProductId !== null}
        onClose={closeProductDrawer}
        product={products.find((p) => p.id === drawerProductId) ?? null}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Products"
        description="Upload a CSV with product catalog items (columns: title, category, price, stock, sku)."
        sampleCsv={`title,category,price,stock,sku\nOrganic Brown Eggs (6pcs),Dairy & Bakery,65,40,SKU-EGG6\nFresh Blueberries (125g),Fruits,180,25,SKU-BERRY\nTata Tea Gold (500g),Beverages,280,60,SKU-TEA500`}
        onImport={handleImportProducts}
      />
    </div>
  )
}

function KpiCard({
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
    <Card className="rounded-xl bg-card p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="hidden size-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary sm:flex">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 font-heading text-2xl font-semibold leading-8 text-foreground">
            {value}
          </div>
          <div className="text-[10px] leading-3 text-muted-foreground">
            {sub}
          </div>
        </div>
      </div>
    </Card>
  )
}
