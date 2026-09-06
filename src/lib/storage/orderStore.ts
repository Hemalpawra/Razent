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
   * Find an order for customer-facing Track Order lookup.
   * Strictly requires exact match on BOTH phone AND email in addition to order ID.
   * Never matches on phone OR email.
   */
  track(orderId: string, mobile: string, email: string): Order | null {
    const order = store.get(orderId.trim())
    if (!order) return null
    const cleanMobile = mobile.replace(/\D/g, "")
    const cleanEmail = email.trim().toLowerCase()
    if (cleanMobile.length < 10 || !cleanEmail.includes("@")) return null
    const last10 = cleanMobile.slice(-10)
    const storedPhone = (order.shipping_address?.phone || "").replace(/\D/g, "")
    const storedEmail = (order.shipping_address?.email || "").trim().toLowerCase()
    const phoneMatch = storedPhone.endsWith(last10)
    const emailMatch = storedEmail === cleanEmail
    // Strict 3-factor: must match BOTH phone AND email
    if (phoneMatch && emailMatch) return order
    return null
  },
  upsert(input: Order): Order {
    store.set(input.id, input)
    return input
  },
  set(input: Order): Order {
    return this.upsert(input)
  },
  remove(id: string): boolean {
    return store.delete(id)
  },
}
