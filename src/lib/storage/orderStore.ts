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
   * any one of: full order ID, last 5 digits of phone, or exact email.
   * Empty input fields are skipped (so a customer can look up with just
   * order ID + one of the other two).
   */
  track(orderId: string, mobile: string, email: string): Order | null {
    const order = store.get(orderId.trim())
    if (!order) return null
    const last5 = mobile.replace(/\D/g, "")
    const cleanEmail = email.trim().toLowerCase()
    const phoneMatch =
      last5.length >= 5 &&
      order.shipping_address.phone.replace(/\D/g, "").endsWith(last5)
    const emailMatch =
      cleanEmail.length > 0 &&
      order.shipping_address.email.toLowerCase() === cleanEmail
    // Match if ID resolves AND at least one of the other identifiers matches.
    if (phoneMatch || emailMatch) return order
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
