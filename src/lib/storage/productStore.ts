/**
 * In-memory product store, seeded from mockProducts. Survives navigation
 * (singleton at module scope). Used as the fallback when Supabase env is
 * missing, and during local dev. Never throws.
 */
import { mockProducts } from "@/lib/mock/products"
import type { Product } from "@/lib/types/product"

const store = new Map<string, Product>(mockProducts.map((p) => [p.id, p]))

export const productStore = {
  list(): Product[] {
    return Array.from(store.values())
  },
  get(id: string): Product | null {
    return store.get(id) ?? null
  },
  upsert(input: Product): Product {
    const now = new Date().toISOString()
    const existing = store.get(input.id)
    const merged: Product = {
      ...input,
      created_at: existing?.created_at ?? input.created_at ?? now,
      updated_at: now,
    }
    store.set(merged.id, merged)
    return merged
  },
  remove(id: string): boolean {
    return store.delete(id)
  },
}
