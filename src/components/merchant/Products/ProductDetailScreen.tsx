"use client" /* Header */ /* Product Header */ /* Pricing */ /* Stock */ /* Actions */

import { ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUI } from "@/state/useUI"
import { mockProducts } from "@/lib/mock/products"
import { formatPrice } from "@/lib/types/product"

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
  const product = drawerProductId
    ? (mockProducts.find((p) => p.id === drawerProductId) ?? null)
    : null

  const sku = product ? getSku(product) : ""
  const updated = product
    ? new Date(product.updated_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : ""
  const compareAt = product
    ? product.price_paise + Math.round(product.price_paise * 0.18)
    : 0

  const handleBack = () => {
    closeProductDrawer()
    setActiveScreen("products")
  }

  return (
    <div className="min-h-screen bg-background">
      {}
      <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="p-1"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-sm font-medium capitalize">
          Product #{product?.id ?? "Details"}
        </span>
      </header>

      <div className="p-4 space-y-4">
        {!product ? (
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
            {}
            <Card className="p-4">
              <div className="flex gap-4">
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="size-20 rounded-lg object-cover ring-1 ring-border/40"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground leading-tight">
                    {product.title}
                  </h2>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {product.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full text-[11px] font-mono"
                    >
                      {sku}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="rounded-full text-[11px]"
                    >
                      {product.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Pricing
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-semibold">
                    {formatPrice(product.price_paise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Compare-at price
                  </span>
                  <span className="font-medium text-muted-foreground line-through">
                    {formatPrice(compareAt)}
                  </span>
                </div>
              </div>
            </Card>

            {}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Inventory
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Current stock</div>
                  <div className="text-xl font-semibold">{product.stock}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Status</div>
                  <Badge
                    variant={
                      product.stock === 0
                        ? "destructive"
                        : product.stock <= 10
                          ? "warning"
                          : "success"
                    }
                    className="rounded-full"
                  >
                    {product.stock === 0
                      ? "Out of stock"
                      : product.stock <= 10
                        ? "Low stock"
                        : "In stock"}
                  </Badge>
                </div>
              </div>
            </Card>

            {}
            <div className="space-y-2">
              <Button variant="default" className="w-full">
                Edit Product
              </Button>
              <Button variant="outline" className="w-full">
                Duplicate
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
