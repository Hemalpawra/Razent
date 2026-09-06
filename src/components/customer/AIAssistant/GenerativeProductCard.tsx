import React, { useState } from "react"
import { Check, ImageIcon } from "lucide-react"
import { formatPrice, type Product } from "@/lib/types/product"

interface GenerativeProductCardProps {
  product: Product
  onProductClick: (product: Product) => void
  onAddToCart: (product: Product) => void
  onBuyNow: (product: Product) => void
}

export const GenerativeProductCard: React.FC<GenerativeProductCardProps> = ({
  product,
  onProductClick,
  onAddToCart,
  onBuyNow,
}) => {
  const [justAdded, setJustAdded] = useState(false)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(product)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation()
    onBuyNow(product)
  }

  return (
    <div
      onClick={() => onProductClick(product)}
      className="group relative flex items-center justify-between gap-2.5 p-2.5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-card/90 shadow-xs hover:shadow-sm transition-all duration-200 w-[270px] sm:w-[300px] shrink-0 select-none cursor-pointer"
    >
      {/* Left: Square Thumbnail */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center border border-border/50">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <ImageIcon className="w-6 h-6 text-muted-foreground/40 stroke-1" />
        )}
      </div>

      {/* Middle: Title & Price */}
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {product.title}
        </h4>
        <div className="mt-1 text-sm font-bold text-foreground">
          {formatPrice(product.price_paise, product.currency)}
        </div>
      </div>

      {/* Right: Stacked Action Buttons */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAdd}
          className={`h-6 sm:h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
            justAdded
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-primary/5 hover:bg-primary/10 text-primary border-primary/30 hover:border-primary"
          }`}
          title="Add to cart"
        >
          {justAdded ? (
            <>
              <Check className="w-3 h-3" />
              <span>Added</span>
            </>
          ) : (
            <span>Add to Cart</span>
          )}
        </button>

        {/* Buy Now Button */}
        <button
          type="button"
          onClick={handleBuy}
          className="h-6 sm:h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all cursor-pointer flex items-center justify-center"
          title="Buy Now"
        >
          Buy Now
        </button>
      </div>
    </div>
  )
}

export default GenerativeProductCard
