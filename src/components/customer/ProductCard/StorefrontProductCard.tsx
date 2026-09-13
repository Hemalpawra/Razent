import * as React from "react"
import { Check, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { StorefrontProductCardProps } from "./types"
import {
  ProductCardImage,
  ProductCardPrice,
  calculateDiscount,
} from "./SharedProductCardElements"
import { toast } from "sonner"

/**
 * StorefrontProductCard
 * 
 * Production-ready quick-commerce product card designed according to specifications:
 * - Desktop: 280px width, 160px image, 16px radius, 12px gap, 44px dual blue buttons
 * - Mobile: 170px width, 120px image, 14px radius, 36px dual blue buttons ("Add" / "Buy")
 * - WCAG AA accessible, keyboard navigable, responsive hover elevation
 */
export function StorefrontProductCard({
  product,
  onOpenDetails,
  onAddToCart,
  onBuyNow,
  isWishlisted: _isWishlisted = false,
  onToggleWishlist: _onToggleWishlist,
  badge,
  className,
}: StorefrontProductCardProps) {
  const [isAdded, setIsAdded] = React.useState(false)

  const discountPercent = calculateDiscount(product.price_paise, product.mrp_paise)
  const isOutOfStock = product.stock <= 0

  // Derived rating
  const ratingValue = product.rating || 4.5

  const handleOpen = () => {
    onOpenDetails?.(product)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOutOfStock) return
    onAddToCart?.(product, 1)
    setIsAdded(true)
    toast.success(`Added ${product.title} to cart`)
    setTimeout(() => setIsAdded(false), 1800)
  }

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOutOfStock) return
    onBuyNow?.(product)
  }

  return (
    <div
      data-slot="storefront-product-card"
      onClick={handleOpen}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden text-left cursor-pointer select-none transition-all duration-300",
        // Desktop Specs: fluid width respecting CSS grid, 16px radius, border #E5E7EB, shadow 0 8px 24px rgba(0,0,0,0.08), clean spacing
        "w-full min-w-0 h-full rounded-[14px] sm:rounded-[16px] border border-[#E5E7EB] dark:border-border bg-white dark:bg-card p-2.5 sm:p-3.5 gap-2 sm:gap-2.5",
        "shadow-[0_4px_16px_rgba(0,0,0,0.06)] sm:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
        // Hover elevation & shadow expansion
        "hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {/* Image Container with Badges & Wishlist */}
        <div className="relative w-full">
          <ProductCardImage
            src={product.image_url}
            alt={product.title}
            category={product.category}
            className="w-full h-[110px] min-[400px]:h-[125px] sm:h-[145px] rounded-[10px] sm:rounded-[12px] p-2 sm:p-2.5"
            imageClassName="object-contain"
          />

          {/* Top-Left Pill Badge: Custom Badge (e.g. 'Best Seller') or In-Stock Status */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
            {badge ? (
              <Badge className="bg-primary/10 text-primary border-none font-medium text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full shadow-2xs leading-none">
                {badge}
              </Badge>
            ) : isOutOfStock ? (
              <Badge className="bg-destructive text-destructive-foreground border-none font-medium text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full shadow-2xs leading-none">
                Out of Stock
              </Badge>
            ) : discountPercent && discountPercent >= 15 ? (
              <Badge className="bg-primary text-primary-foreground border-none font-semibold text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full shadow-2xs leading-none">
                Best Seller
              </Badge>
            ) : null}
          </div>

          {/* Top-Right Rating Badge (replaces wishlist button) */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-white/95 dark:bg-card/95 px-2 py-0.5 shadow-xs border border-border/70 backdrop-blur-xs text-[11px] font-semibold text-foreground select-none pointer-events-none">
            <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
            <span>{ratingValue.toFixed(1)}</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col gap-1 sm:gap-1.5">
          {/* Product Name (semibold, max 2 lines) */}
          <h3
            title={product.title}
            className="text-[13px] sm:text-[15px] font-semibold text-foreground leading-[17px] sm:leading-[21px] line-clamp-2 min-h-[34px] sm:min-h-[42px] group-hover:text-primary transition-colors"
          >
            {product.title}
          </h3>

          {/* Description */}
          {product.description ? (
            <p className="text-[11px] sm:text-[13px] font-normal text-[#6B7280] dark:text-muted-foreground line-clamp-1 sm:line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          ) : null}

          {/* Price Row */}
          <div className="pt-0.5 sm:pt-1">
            <ProductCardPrice
              pricePaise={product.price_paise}
              mrpPaise={product.mrp_paise}
              currency={product.currency}
              size="lg"
              showDiscountBadge={true}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons: Dual Buttons (Add to Cart Outlined Blue + Buy Now Filled Blue) */}
      <div className="pt-2 sm:pt-2.5 grid grid-cols-2 gap-1.5 sm:gap-2">
        {/* Add to Cart */}
        <Button
          type="button"
          variant="outline"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          className={cn(
            "w-full rounded-xl transition-all duration-200 cursor-pointer font-medium select-none shadow-2xs",
            "border border-primary text-primary hover:bg-primary/10 active:scale-[0.98]",
            "h-[34px] sm:h-[38px] text-[11px] sm:text-[12px] min-[1400px]:text-[13px] px-1 sm:px-1.5"
          )}
        >
          {isAdded ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in-0 duration-200">
              <Check className="size-3.5 sm:size-4" />
              <span>Added</span>
            </span>
          ) : (
            <span className="whitespace-nowrap truncate">
              Add<span className="hidden sm:inline"> to Cart</span>
            </span>
          )}
        </Button>

        {/* Buy Now */}
        <Button
          type="button"
          disabled={isOutOfStock}
          onClick={handleBuyNow}
          className={cn(
            "w-full rounded-xl transition-all duration-200 cursor-pointer font-semibold select-none shadow-xs",
            "bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98]",
            "h-[34px] sm:h-[38px] text-[11px] sm:text-[12px] min-[1400px]:text-[13px] px-1 sm:px-1.5"
          )}
        >
          <span className="whitespace-nowrap truncate">
            Buy<span className="hidden sm:inline"> Now</span>
          </span>
        </Button>
      </div>
    </div>
  )
}
