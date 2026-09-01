/**
 * Single API surface for the merchant dashboard. Today every function
 * returns a Promise resolved with the matching mock. Tomorrow, swap the
 * implementation to a Supabase query — call sites don't change.
 *
 * This file is the seam for "frontend today, backend tomorrow." Keep
 * function signatures stable; never throw on the UI path.
 */
import { mockAnalytics } from "@/lib/mock/analytics"
import { mockDashboard } from "@/lib/mock/kpis"
import { mockOrders } from "@/lib/mock/orders"
import { mockProducts } from "@/lib/mock/products"
import type { AnalyticsData } from "@/lib/types/analytics"
import type { DashboardData } from "@/lib/types/kpi"
import type { Order } from "@/lib/types/order"
import type { Product, ProductStatus } from "@/lib/types/product"

// --- Products --------------------------------------------------------------

export type ListProductsArgs = {
  q?: string
  category?: string
  status?: ProductStatus
}

export async function listProducts(args: ListProductsArgs = {}): Promise<Product[]> {
  const { q, category, status } = args
  await delay(80) // simulate latency; remove when real
  return mockProducts.filter((p) => {
    if (status && p.status !== status) return false
    if (category && p.category !== category) return false
    if (q) {
      const needle = q.toLowerCase()
      if (
        !p.title.toLowerCase().includes(needle) &&
        !p.description.toLowerCase().includes(needle) &&
        !p.tags.some((t) => t.toLowerCase().includes(needle))
      ) {
        return false
      }
    }
    return true
  })
}

export async function getProduct(id: string): Promise<Product | null> {
  await delay(40)
  return mockProducts.find((p) => p.id === id) ?? null
}

export type UpsertProductInput = Omit<Product, "id" | "created_at" | "updated_at">

export async function upsertProduct(
  input: UpsertProductInput & { id?: string },
): Promise<Product> {
  await delay(120)
  const id = input.id ?? `prod_${Date.now().toString(36)}`
  const now = new Date().toISOString()
  return {
    ...input,
    id,
    created_at: mockProducts.find((p) => p.id === id)?.created_at ?? now,
    updated_at: now,
  }
}

export async function deleteProduct(id: string): Promise<{ id: string }> {
  await delay(80)
  return { id }
}

// --- Orders ----------------------------------------------------------------

export async function listOrders(): Promise<Order[]> {
  await delay(80)
  return mockOrders.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getOrder(id: string): Promise<Order | null> {
  await delay(40)
  return mockOrders.find((o) => o.id === id) ?? null
}

// --- Dashboard -------------------------------------------------------------

export async function getDashboard(): Promise<DashboardData> {
  await delay(80)
  return mockDashboard
}

// --- Analytics -------------------------------------------------------------

export async function getAnalytics(): Promise<AnalyticsData> {
  await delay(80)
  return mockAnalytics
}

// --- helpers ---------------------------------------------------------------

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}