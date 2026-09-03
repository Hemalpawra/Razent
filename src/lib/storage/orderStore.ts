/**
 * In-memory order store. Seeded from mockOrders. Used by client.ts as the
 * Supabase fallback; also where new orders from executeAgentCheckout land
 * so the merchant Orders screen and Track Order can find them in-session.
 */
import { mockOrders } from "@/lib/mock/orders"
import type { Order } from "@/lib/types/order"

const store = new Map<string, Order>(mockOrders.map((o) => [o.id, o]))

export const orderStore = {
  list(): Order[] {
    return Array.from(store.values()).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )
  },
  get(id: string): Order | null {
    return store.get(id) ?? null
  },
  /**
   * Find an order for customer-facing Track Order lookup. Real backend
   * would scope by tenant + RLS; for the in-memory store we match by
   * phone last 5 digits + email contains on shipping_address.
   */
  track(orderId: string, mobile: string, email: string): Order | null {
    const order = store.get(orderId)
    if (!order) return null
    const last5 = mobile.replace(/\D/g, "").slice(-5)
    const phoneMatch = order.shipping_address.phone.replace(/\D/g, "").endsWith(last5)
    const emailMatch = order.shipping_address.email.toLowerCase() === email.toLowerCase()
    if (phoneMatch && emailMatch) return order
    return null
  },
  upsert(input: Order): Order {
    store.set(input.id, input)
    return input
  },
  remove(id: string): boolean {
    return store.delete(id)
  },
}
