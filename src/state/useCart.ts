import { create } from "zustand"
import type { Product } from "@/lib/types/product"

export interface CartItem {
  id: string
  product: Product
  qty: number
}

interface CartStore {
  items: CartItem[]
  directCheckoutItem: CartItem | null
  addToCart: (product: Product, qty?: number) => void
  removeFromCart: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clearCart: () => void
  prepareCheckout: (product: Product, qty?: number) => void
  clearDirectCheckout: () => void
  getItemCount: () => number
  getTotalPaise: () => number
}

const STORAGE_KEY = "razent_shared_cart"

function loadInitialCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export const useCart = create<CartStore>((set, get) => ({
  items: loadInitialCart(),
  directCheckoutItem: null,

  addToCart: (product: Product, qty = 1) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === product.id)
      let newItems: CartItem[]
      if (existing) {
        newItems = state.items.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + qty } : i
        )
      } else {
        newItems = [...state.items, { id: product.id, product, qty }]
      }
      saveCart(newItems)
      return { items: newItems }
    })
  },

  removeFromCart: (productId: string) => {
    set((state) => {
      const newItems = state.items.filter((i) => i.id !== productId)
      saveCart(newItems)
      return { items: newItems }
    })
  },

  updateQty: (productId: string, qty: number) => {
    set((state) => {
      let newItems: CartItem[]
      if (qty <= 0) {
        newItems = state.items.filter((i) => i.id !== productId)
      } else {
        newItems = state.items.map((i) =>
          i.id === productId ? { ...i, qty } : i
        )
      }
      saveCart(newItems)
      return { items: newItems }
    })
  },

  clearCart: () => {
    saveCart([])
    set({ items: [], directCheckoutItem: null })
  },

  prepareCheckout: (product: Product, qty = 1) => {
    const item: CartItem = { id: product.id, product, qty }
    set({ directCheckoutItem: item })
  },

  clearDirectCheckout: () => {
    set({ directCheckoutItem: null })
  },

  getItemCount: () => {
    const { items, directCheckoutItem } = get()
    if (directCheckoutItem) return directCheckoutItem.qty
    return items.reduce((acc, i) => acc + i.qty, 0)
  },

  getTotalPaise: () => {
    const { items, directCheckoutItem } = get()
    if (directCheckoutItem) {
      return directCheckoutItem.product.price_paise * directCheckoutItem.qty
    }
    return items.reduce((acc, i) => acc + i.product.price_paise * i.qty, 0)
  },
}))
