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
  created_at: string
  updated_at: string
}

export function formatPrice(paise: number, currency: Currency = "INR"): string {
  const rupees = paise / 100
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(rupees)
}