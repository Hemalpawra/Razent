import React, { useState } from "react"
import {
  X,
  ShoppingCart,
  Zap,
  Check,
  Package,
  Tag,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { formatPrice, getProductStockStatus, type Product } from "@/lib/types/product"

interface ProductDetailsModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product) => void
  onBuyNow: (product: Product) => void
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [justAdded, setJustAdded] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  if (!isOpen || !product) return null

  const activeImg = selectedImage || product.image_url
  const allImages = [product.image_url, ...(product.images || [])].filter(Boolean)

  const handleAdd = () => {
    onAddToCart(product)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  const handleBuy = () => {
    onClose()
    onBuyNow(product)
  }

  const hasDiscount = product.mrp_paise && product.mrp_paise > product.price_paise
  const discountPercent = hasDiscount
    ? Math.round(((product.mrp_paise! - product.price_paise) / product.mrp_paise!) * 100)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          {/* Product Media Gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square w-full rounded-2xl bg-muted/30 border border-border/80 overflow-hidden flex items-center justify-center">
              {activeImg ? (
                <img
                  src={activeImg}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-16 h-16 text-muted-foreground/40 stroke-1" />
              )}

              {discountPercent && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold tracking-wide shadow-sm">
                  {discountPercent}% OFF
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`relative w-14 h-14 rounded-xl border overflow-hidden shrink-0 transition-all ${
                      activeImg === img
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border/80 hover:border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info & Actions */}
          <div className="flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              {/* Category & Stock */}
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Tag className="w-3 h-3" />
                  {product.category || "General"}
                </span>

                {(() => {
                  const stockInfo = getProductStockStatus(product.stock, product.stock_threshold)
                  return (
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${stockInfo.badgeClass}`}
                    >
                      <span className={`size-1.5 rounded-full ${stockInfo.dotClass}`} />
                      {stockInfo.label}
                    </span>
                  )
                })()}
              </div>

              {/* Brand & Title */}
              <div className="space-y-1">
                {product.brand && (
                  <div className="text-xs font-bold uppercase tracking-wider text-primary">
                    {product.brand}
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                  {product.title}
                </h2>
              </div>

              {/* Price Block */}
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  {formatPrice(product.price_paise, product.currency)}
                </span>
                {hasDiscount && (
                  <span className="text-sm sm:text-base text-muted-foreground line-through">
                    {formatPrice(product.mrp_paise!, product.currency)}
                  </span>
                )}
                {product.unit && (
                  <span className="text-xs text-muted-foreground font-medium">
                    / {product.unit}
                  </span>
                )}
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {product.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {product.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Features List */}
              {product.features && product.features.length > 0 && (
                <div className="pt-2 border-t border-border/80 space-y-1.5">
                  <div className="text-xs font-semibold text-foreground">Key Highlights</div>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    {product.features.map((feat, idx) => (
                      <li key={idx}>{feat}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specifications Grid */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="pt-2 border-t border-border/80 space-y-1.5">
                  <div className="text-xs font-semibold text-foreground">Specifications</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(product.specifications).map(([k, v]) => (
                      <div key={k} className="p-2 rounded-xl bg-muted/40 border border-border/60">
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium truncate">
                          {k}
                        </span>
                        <span className="font-semibold text-foreground truncate block">
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Value props */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/80 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Express 15-min delivery</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>100% genuine quality</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={product.stock <= 0}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-semibold border transition-all ${
                  justAdded
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-muted/80 hover:bg-muted text-foreground border-border hover:border-border/80"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBuy}
                disabled={product.stock <= 0}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Buy Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailsModal
