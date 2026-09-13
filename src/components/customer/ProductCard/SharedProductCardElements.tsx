import * as React from "react"
import { Star, Heart, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/types/product"

export function calculateDiscount(pricePaise: number, mrpPaise?: number | null): number | null {
  if (!mrpPaise || mrpPaise <= pricePaise) return null
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100)
}

export function formatReviewCount(count?: number): string {
  if (!count) return ""
  if (count >= 1000) {
    return `(${Math.round(count / 100) / 10}K)`
  }
  return `(${count})`
}

/**
 * Shared Star Rating Element
 */
export function ProductCardRating({
  rating = 4.5,
  reviewCount,
  size = "md",
  className,
}: {
  rating?: number
  reviewCount?: number
  size?: "sm" | "md"
  className?: string
}) {
  const isSm = size === "sm"
  const formattedReviews = reviewCount ? formatReviewCount(reviewCount) : ""

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-muted-foreground select-none",
        isSm ? "text-[12px]" : "text-[13px] sm:text-[14px]",
        className
      )}
      aria-label={`Rated ${rating.toFixed(1)} out of 5 stars${formattedReviews ? ` from ${formattedReviews} reviews` : ""}`}
    >
      <Star
        className={cn(
          "fill-amber-400 text-amber-400 shrink-0",
          isSm ? "size-3" : "size-3.5"
        )}
        aria-hidden="true"
      />
      <span className="font-medium text-foreground leading-none">
        {rating.toFixed(1)}
      </span>
      {formattedReviews && (
        <span className="text-[#6B7280] dark:text-muted-foreground leading-none">
          {formattedReviews}
        </span>
      )}
    </div>
  )
}

/**
 * Shared Price Row with optional strikethrough MRP & Discount Pill Badge
 */
export function ProductCardPrice({
  pricePaise,
  mrpPaise,
  currency = "INR",
  size = "md",
  showDiscountBadge = true,
  className,
}: {
  pricePaise: number
  mrpPaise?: number | null
  currency?: string
  size?: "sm" | "md" | "lg"
  showDiscountBadge?: boolean
  className?: string
}) {
  const discountPercent = calculateDiscount(pricePaise, mrpPaise)

  return (
    <div className={cn("flex items-baseline flex-wrap gap-2 leading-none", className)}>
      {/* Current Price */}
      <span
        className={cn(
          "font-bold text-foreground tracking-tight font-mono",
          size === "sm" && "text-[18px] sm:text-[20px]",
          size === "md" && "text-[20px] sm:text-[24px]",
          size === "lg" && "text-[21px] sm:text-[25px] lg:text-[26px]"
        )}
      >
        {formatPrice(pricePaise, currency)}
      </span>

      {/* MRP (strikethrough) */}
      {mrpPaise && mrpPaise > pricePaise ? (
        <span
          className={cn(
            "text-[#6B7280] dark:text-muted-foreground line-through font-mono",
            size === "sm" && "text-[13px] sm:text-[14px]",
            size === "md" && "text-[14px] sm:text-[16px]",
            size === "lg" && "text-[14px] sm:text-[16px]"
          )}
        >
          {formatPrice(mrpPaise, currency)}
        </span>
      ) : null}

      {/* Blue Pill Discount Badge */}
      {showDiscountBadge && discountPercent && discountPercent > 0 ? (
        <span
          className={cn(
            "inline-flex items-center justify-center font-bold uppercase rounded-full bg-primary text-primary-foreground leading-none shadow-2xs select-none",
            size === "sm"
              ? "text-[10px] px-1.5 py-0.5"
              : "text-[11px] sm:text-[12px] px-2 py-0.5 sm:px-2.5 sm:py-1"
          )}
        >
          {discountPercent}% OFF
        </span>
      ) : null}
    </div>
  )
}

/**
 * Top-right Circular Wishlist Button (32x32)
 */
export function ProductCardWishlistButton({
  isWishlisted = false,
  onToggle,
  className,
}: {
  isWishlisted?: boolean
  onToggle?: (e: React.MouseEvent) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle?.(e)
      }}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={isWishlisted}
      className={cn(
        "size-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer select-none",
        "bg-white/90 dark:bg-card/90 backdrop-blur-xs border border-border/60 shadow-xs",
        "hover:bg-white dark:hover:bg-accent hover:scale-105 active:scale-95",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-transform duration-200",
          isWishlisted
            ? "fill-rose-500 text-rose-500 scale-110 animate-in zoom-in-50 duration-150"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-hidden="true"
      />
    </button>
  )
}

/**
 * Robust Product Image with fallback placeholder & smooth zoom hover
 */
export function ProductCardImage({
  src,
  alt,
  category,
  className,
  imageClassName,
  onClick,
}: {
  src?: string
  alt: string
  category?: string
  className?: string
  imageClassName?: string
  onClick?: () => void
}) {
  const [hasError, setHasError] = React.useState(false)
  const [isLoaded, setIsLoaded] = React.useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex items-center justify-center overflow-hidden select-none bg-[#F8FAFC] dark:bg-muted/30 transition-colors",
        onClick && "cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      {!hasError && src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "size-full object-contain transition-all duration-300 group-hover:scale-105",
            !isLoaded ? "opacity-0 scale-95" : "opacity-100 scale-100",
            imageClassName
          )}
        />
      ) : (
        <div className="size-full flex flex-col items-center justify-center text-muted-foreground p-2 text-center gap-1">
          <ShoppingBag className="size-6 text-muted-foreground/50 shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-medium text-muted-foreground/80 line-clamp-1">
            {category || "Verified Item"}
          </span>
        </div>
      )}
    </div>
  )
}
