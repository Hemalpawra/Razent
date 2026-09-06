import React, { useState } from "react"
import { ShoppingCart, Zap, Check, ImageIcon } from "lucide-react"
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
    <div className="group relative flex flex-col w-[200px] sm:w-[220px] rounded-2xl border border-border/80 bg-card hover:bg-card/90 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden shrink-0 select-none">
      {/* Clickable Image Area */}
      <button
        type="button"
        onClick={() => onProductClick(product)}
        className="relative w-full h-32 sm:h-36 bg-muted/40 flex items-center justify-center overflow-hidden cursor-pointer text-left focus:outline-none"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground/50">
            <ImageIcon className="w-8 h-8 stroke-1" />
          </div>
        )}
      </button>

      {/* Clickable Title & Price */}
      <button
        type="button"
        onClick={() => onProductClick(product)}
        className="flex flex-col flex-1 p-3 text-left focus:outline-none cursor-pointer"
      >
        <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {product.title}
        </h4>
        <div className="mt-1.5 flex items-baseline">
          <span className="text-sm sm:text-base font-bold text-foreground">
            {formatPrice(product.price_paise, product.currency)}
          </span>
        </div>
      </button>

      {/* Action Buttons: Add to Cart & Buy Now */}
      <div className="p-2.5 pt-0 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={handleAdd}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium border transition-all ${
            justAdded
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-muted/70 hover:bg-muted text-foreground border-border/70 hover:border-border"
          }`}
          title="Add to cart"
        >
          {justAdded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Added</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Add</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleBuy}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs hover:shadow transition-all"
          title="Buy Now"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Buy Now</span>
        </button>
      </div>
    </div>
  )
}

export default GenerativeProductCard
