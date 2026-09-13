import * as React from "react"
import { Check, Zap, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { AIAssistantProductCardProps } from "./types"
import {
  ProductCardImage,
  ProductCardRating,
  ProductCardPrice,
} from "./SharedProductCardElements"
import { toast } from "sonner"

/**
 * AIAssistantProductCard
 * 
 * Optimized strictly for conversational AI assistant shopping experiences.
 * Layout: Horizontal card with image on the left, structured details & dual buttons on the right.
 * Shows ONLY: Product Image, Category, Product Name, Price, MRP, Rating, Add to Cart, Buy Now.
 * Desktop: 340px width, 14px padding, 72x72 image, 36px buttons
 * Mobile: 100% width, 12px padding, 60x60 image, 34px buttons (max 180px height)
 */
export function AIAssistantProductCard({
  product,
  onOpenDetails,
  onAddToCart,
  onBuyNow,
  index = 0,
  className,
}: AIAssistantProductCardProps) {
  const [isAdded, setIsAdded] = React.useState(false)

  const ratingValue = product.rating || 4.7
  const reviewCountValue =
    product.review_count || Math.floor((product.id.charCodeAt(0) || 5) * 14) + 12

  const handleOpen = () => {
    onOpenDetails?.(product)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart?.(product)
    setIsAdded(true)
    toast.success(`Added ${product.title} to cart`)
    setTimeout(() => setIsAdded(false), 1800)
  }

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation()
    onBuyNow?.(product)
  }

  return (
    <div
      data-slot="ai-assistant-product-card"
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: "both",
      }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden text-left select-none transition-all duration-200",
        // Horizontal scroll sizing: 260px mobile, 290px desktop
        "w-[260px] sm:w-[290px] shrink-0 rounded-[12px] sm:rounded-[14px] border border-[#E5E7EB] dark:border-border bg-white dark:bg-card p-3 sm:p-3.5",
        "shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-primary/40 hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)]",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
        className
      )}
    >
      {/* Horizontal Layout: Image Left, Details Right */}
      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* Product Image: 60x60 on mobile, 72x72 on desktop */}
        <ProductCardImage
          src={product.image_url}
          alt={product.title}
          category={product.category}
          onClick={handleOpen}
          className="size-[60px] sm:size-[72px] shrink-0 rounded-lg p-1 sm:p-1.5"
          imageClassName="object-contain"
        />

        {/* Details Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Product Name (16px semibold desktop, 15px mobile, max 2 lines) */}
          <h4
            onClick={handleOpen}
            title={product.title}
            className="text-[15px] sm:text-[16px] font-semibold text-foreground leading-[19px] sm:leading-[22px] line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          >
            {product.title}
          </h4>

          {/* Price Row: 20px bold (18px mobile), 14px MRP (13px mobile) */}
          <div className="pt-0.5">
            <ProductCardPrice
              pricePaise={product.price_paise}
              mrpPaise={product.mrp_paise}
              currency={product.currency}
              size="sm"
              showDiscountBadge={false}
            />
          </div>

          {/* Star Rating: 13px (12px mobile) with review count */}
          <div className="pt-0.5">
            <ProductCardRating
              rating={ratingValue}
              reviewCount={reviewCountValue}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Buttons Row: Add to Cart (Outlined Primary Blue) + Buy Now (Filled Primary Blue) */}
      <div className="pt-2 sm:pt-2.5 grid grid-cols-2 gap-2">
        {/* Add to Cart */}
        <Button
          type="button"
          variant="outline"
          onClick={handleAddToCart}
          className={cn(
            "w-full rounded-[8px] sm:rounded-[10px] transition-all duration-200 cursor-pointer font-medium select-none shadow-2xs",
            "border border-primary text-primary hover:bg-primary/10 active:scale-[0.98]",
            // Mobile: 34px height, 13px font; Desktop: 36px height, 14px font
            "h-[34px] sm:h-[36px] text-[13px] sm:text-[14px] px-2"
          )}
        >
          {isAdded ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in-0 duration-200">
              <Check className="size-3.5" />
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
          onClick={handleBuyNow}
          className={cn(
            "w-full rounded-[8px] sm:rounded-[10px] transition-all duration-200 cursor-pointer font-semibold select-none shadow-xs",
            "bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98]",
            // Mobile: 34px height, 13px font; Desktop: 36px height, 14px font
            "h-[34px] sm:h-[36px] text-[13px] sm:text-[14px] px-2"
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
