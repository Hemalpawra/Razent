export type Currency = "INR"

export type ProductStatus = "active" | "draft" | "archived"

export type Product = {
  id: string
  title: string
  description: string
  /** Price in paise (1 INR = 100 paise) to match Razorpay convention. */
  price_paise: number
  currency: Currency
  stock: number
  status: ProductStatus
  image_url: string
  category: string
  tags: string[]
  unit?: string
  mrp_paise?: number
  external_id?: string
  images?: string[]
  rating?: number
  review_count?: number
  merchant_id?: string
  brand?: string
  features?: string[]
  specifications?: Record<string, string>
  stock_threshold?: number
  created_at: string
  updated_at: string
}

export type StockStatusType = "in_stock" | "low_stock" | "out_of_stock"

export interface StockStatusInfo {
  status: StockStatusType
  label: string
  color: "green" | "orange" | "red"
  badgeClass: string
  dotClass: string
  description: string
}

export function getProductStockStatus(stock: number, threshold: number = 10): StockStatusInfo {
  const t = Math.max(0, threshold)
  if (stock <= 0) {
    return {
      status: "out_of_stock",
      label: "Out of Stock",
      color: "red",
      badgeClass: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
      dotClass: "bg-red-500",
      description: "The item has zero physical quantity available and cannot be purchased right away.",
    }
  }
  if (stock <= t) {
    return {
      status: "low_stock",
      label: "Low Stock",
      color: "orange",
      badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      dotClass: "bg-amber-500",
      description: `Critical inventory status: quantity (${stock}) has fallen below minimum threshold (${t}).`,
    }
  }
  return {
    status: "in_stock",
    label: "In Stock",
    color: "green",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-500",
    description: "The item is physically present and ready for immediate sale or shipping.",
  }
}

export function formatPrice(paise: number, currency: Currency = "INR"): string {
  const rupees = paise / 100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(rupees)
}
