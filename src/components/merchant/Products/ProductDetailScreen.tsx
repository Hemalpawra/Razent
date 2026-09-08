"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, CheckCircle2, ListChecks, Sliders, Tag } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useUI } from "@/state/useUI"
import { getProduct } from "@/lib/api/client"
import { formatPrice, getProductStockStatus } from "@/lib/types/product"
import type { Product } from "@/lib/types/product"
import ProductDrawer from "./ProductDrawer"

function getSku(p: { id: string }): string {
  const raw = p.id
    .replace(/^prod_/, "")
    .slice(0, 6)
    .toUpperCase()
    .padEnd(4, "0")
  return `SKU-${raw}`
}

export default function ProductDetailScreen() {
  const setActiveScreen = useUI((s) => s.setActiveScreen)
  const drawerProductId = useUI((s) => s.drawerProductId)
  const closeProductDrawer = useUI((s) => s.closeProductDrawer)

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    if (!drawerProductId) {
      setLoading(false)
      return
    }
    getProduct(drawerProductId)
      .then((p) => setProduct(p ?? null))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [drawerProductId])

  const sku = product ? getSku(product) : ""
  const compareAt = product
    ? product.price_paise + Math.round(product.price_paise * 0.18)
    : 0

  const handleBack = () => {
    closeProductDrawer()
    setActiveScreen("products")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="p-1 cursor-pointer"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-sm font-medium capitalize truncate">
          Product: {product?.title ?? "Details"}
        </span>
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : !product ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No product selected. Please go back and select a product.
            </p>
            <Button variant="outline" onClick={handleBack} className="mt-4">
              Back to Products
            </Button>
          </Card>
        ) : (
          <>
            {/* Main Info Card */}
            <Card className="p-4">
              <div className="flex gap-4">
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="size-24 rounded-lg object-cover ring-1 ring-border/40 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  {product.brand && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary block leading-none mb-1">
                      {product.brand}
                    </span>
                  )}
                  <h2 className="text-base sm:text-lg font-semibold text-foreground leading-tight">
                    {product.title}
                  </h2>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {product.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      variant="secondary"
                      className="rounded-md text-[10px] font-mono"
                    >
                      {sku}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-md text-[10px]"
                    >
                      {product.category}
                    </Badge>
                    {product.tags &&
                      product.tags.map((t) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="rounded-md text-[10px] font-mono text-muted-foreground"
                        >
                          #{t.replace(/^brand:/, "")}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Pricing */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Pricing & Unit
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Store Price</span>
                  <span className="font-semibold text-foreground">
                    {formatPrice(product.price_paise)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Compare-at price</span>
                  <span className="font-medium text-muted-foreground line-through">
                    {formatPrice(compareAt)}
                  </span>
                </div>
                {product.unit && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Unit Size</span>
                    <span className="font-medium text-foreground">{product.unit}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Inventory & Threshold */}
            <Card className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Inventory & Stock Status
              </h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">Current Stock</div>
                  <div className="text-xl font-semibold text-foreground">{product.stock} units</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">Low Threshold</div>
                  <div className="text-xl font-semibold text-foreground">{product.stock_threshold ?? 10} min</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground text-xs">Stock Status</div>
                  {(() => {
                    const stockInfo = getProductStockStatus(product.stock, product.stock_threshold)
                    return (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${stockInfo.badgeClass}`}>
                        <span className={`size-1.5 rounded-full ${stockInfo.dotClass}`} />
                        {stockInfo.label}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </Card>

            {/* Features (if any) */}
            {product.features && product.features.length > 0 && (
              <Card className="p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ListChecks className="size-3.5 text-primary" /> Key Features & Highlights
                </h3>
                <div className="space-y-1.5 pt-1">
                  {product.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Specifications (if any) */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <Card className="p-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="size-3.5 text-primary" /> Specifications
                </h3>
                <div className="rounded-lg border border-border/60 divide-y divide-border/40 text-xs overflow-hidden">
                  {Object.entries(product.specifications).map(([k, v]) => (
                    <div key={k} className="flex justify-between p-2">
                      <span className="text-muted-foreground font-medium">{k}</span>
                      <span className="text-foreground font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <Button
                variant="default"
                className="w-full cursor-pointer"
                onClick={() => setIsEditOpen(true)}
              >
                Edit Product
              </Button>
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={handleBack}
              >
                Back to Products
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Edit Drawer Modal */}
      <ProductDrawer
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        product={product}
        onProductUpdated={(updated) => {
          setProduct(updated)
          setIsEditOpen(false)
        }}
      />
    </div>
  )
}
