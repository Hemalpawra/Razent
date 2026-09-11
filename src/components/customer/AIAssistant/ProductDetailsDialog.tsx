import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Check, PackageCheck, ShieldCheck, Plus, Minus } from "lucide-react"
import type { Product } from "@/lib/types/product"
import { formatPrice } from "@/lib/types/product"
import { useCart } from "@/state/useCart"
import { toast } from "sonner"

interface ProductDetailsDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCheckoutProduct?: (product: Product) => void
}

export function ProductDetailsDialog({
  product,
  open,
  onOpenChange,
  onCheckoutProduct,
}: ProductDetailsDialogProps) {
  const [qty, setQty] = useState(1)
  const [isAdded, setIsAdded] = useState(false)
  const addToCart = useCart((s) => s.addToCart)

  if (!product) return null

  const discountPercent =
    product.mrp_paise && product.mrp_paise > product.price_paise
      ? Math.round(((product.mrp_paise - product.price_paise) / product.mrp_paise) * 100)
      : null

  const handleAddToCart = () => {
    addToCart(product, qty)
    setIsAdded(true)
    toast.success(`Added ${qty} × ${product.title} to cart`)
    setTimeout(() => setIsAdded(false), 1800)
  }

  const handleBuyNow = () => {
    addToCart(product, qty)
    onOpenChange(false)
    if (onCheckoutProduct) {
      onCheckoutProduct(product)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[92vw] p-5 gap-4">
        <DialogHeader className="gap-1.5 text-left">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px] uppercase tracking-wider">
              {product.category || "General"}
            </Badge>
            {product.stock > 0 ? (
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                In Stock ({product.stock} left)
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px]">
                Out of Stock
              </Badge>
            )}
          </div>
          <DialogTitle className="text-base font-semibold leading-snug text-foreground">
            {product.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            {product.description || "Authentic quality verified product from Razent Catalog."}
          </DialogDescription>
        </DialogHeader>

        {/* Product Image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <ShoppingCart className="size-12 text-muted-foreground/40" />
          )}
          {discountPercent && (
            <div className="absolute top-2.5 right-2.5">
              <Badge className="bg-emerald-600 text-white font-semibold text-xs shadow-sm">
                {discountPercent}% OFF
              </Badge>
            </div>
          )}
        </div>

        {/* Price & Unit */}
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-primary">
              {formatPrice(product.price_paise, product.currency)}
            </span>
            {product.mrp_paise && product.mrp_paise > product.price_paise && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.mrp_paise, product.currency)}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {product.unit || "1 unit"}
          </span>
        </div>

        {/* Product specs / tags if available */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <Separator />

        {/* Trust Badges */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <PackageCheck className="size-3.5 text-primary" />
            <span>Instant Dispatch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>100% Genuine</span>
          </div>
        </div>

        {/* Quantity and Actions */}
        <div className="flex items-center gap-2 pt-2">
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-md"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-8 text-center text-xs font-semibold">{qty}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-md"
              disabled={qty >= (product.stock || 99)}
              onClick={() => setQty((q) => q + 1)}
            >
              <Plus className="size-3" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5 text-xs font-medium"
            onClick={handleAddToCart}
          >
            {isAdded ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="size-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            className="flex-1 text-xs font-semibold"
            onClick={handleBuyNow}
          >
            Order Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
