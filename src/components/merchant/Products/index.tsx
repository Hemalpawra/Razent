import { useState } from "react"
import { SearchIcon, PlusIcon, FilterIcon } from "lucide-react"

import { table } from "tailwindcss"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/PageHeader"
import { listProducts, deleteProduct, upsertProduct } from "@/lib/api/client"
import { formatPrice } from "@/lib/types/product"
import type { Product, ProductStatus } from "@/lib/types/product"

export default function ProductsScreen() {
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  // Load once on mount (simulated async).
  useState(() => {
    (async () => {
      setLoading(true)
      const data = await listProducts()
      setProducts(data)
      setLoading(false)
    })()
  })

  const filtered = products.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false
    if (!q.trim()) return true
    const needle = q.toLowerCase()
    return (
      p.title.toLowerCase().includes(needle) ||
      p.category.toLowerCase().includes(needle) ||
      p.tags.some((t) => t.toLowerCase().includes(needle))
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your store catalog. When the backend lands, the same `listProducts()` call serves from Supabase."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button render={<a href="#" />}>Import</Button>
            <Button variant="outline" size="sm" render={<a href="#" />}>
              <PlusIcon className="mr-1 size-3.5" /> Add product
            </Button>
          </div>
        }
      />

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[16rem]">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search products, categories, tags..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <FilterIcon className="size-3.5 text-muted-foreground" />
          {(["all", "active", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={
                "rounded-full px-2.5 py-0.5 text-[11px] transition-colors border " +
                (statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground bg-card border-border hover:bg-muted hover:text-foreground")
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-3 py-3">Category</th>
                <th className="text-right px-3 py-3">Price</th>
                <th className="text-center px-3 py-3">Stock</th>
                <th className="text-center px-3 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                    Loading products...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                    No products match this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-muted/30 group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="size-9 rounded-md object-cover ring-1 ring-border/50"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            className="block text-sm font-medium text-foreground truncate hover:underline"
                          >
                            {p.title}
                          </a>
                          <p className="text-[10px] text-muted-foreground truncate">{p.description.slice(0, 60)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs uppercase tracking-wide text-muted-foreground">{p.category}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">{formatPrice(p.price_paise)}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-xs">{p.stock}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                          (p.status === "active"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
                            : p.status === "draft"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                              : "bg-muted text-muted-foreground")
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => alert(`Edit ${p.title}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={async () => {
                            await deleteProduct(p.id)
                            // Re-fetch mock (this will refresh the list once Supabase arrives)
                            setProducts((prev) => prev.filter((x) => x.id !== p.id))
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}