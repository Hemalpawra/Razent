import type { Product } from "@/lib/types/product"

export interface StorefrontProductCardProps {
  product: Product
  onOpenDetails?: (product: Product) => void
  onAddToCart?: (product: Product, quantity?: number) => void
  onBuyNow?: (product: Product) => void
  isWishlisted?: boolean
  onToggleWishlist?: (product: Product, isWishlisted: boolean) => void
  badge?: string
  className?: string
  priority?: boolean
}

export interface AIAssistantProductCardProps {
  product: Product
  onOpenDetails?: (product: Product) => void
  onAddToCart?: (product: Product) => void
  onBuyNow?: (product: Product) => void
  index?: number
  className?: string
}

export interface ProductCardSkeletonProps {
  variant?: "storefront" | "ai-assistant"
  className?: string
}
