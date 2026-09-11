/**
 * Pre-Production UCP (Universal Commerce Protocol) Multi-Transport Router
 *
 * Implements standard UCP services:
 * - dev.ucp.shopping.catalog (Federated catalog search, category filtering, price caps)
 * - dev.ucp.shopping.cart (Ephemeral cart session with integer paise subtotals & tax)
 * - dev.ucp.shopping.orders (Fulfillment tracking, delivery ETA, rider status)
 */

import { listProducts, getOrder } from "./client"
import type { UCPCatalogQuery, UCPCartItemInput, UCPCartSession } from "@/lib/protocol/ucpTypes"

const ucpMemoryCarts = new Map<string, UCPCartSession>()

/**
 * dev.ucp.shopping.catalog — Federated Catalog Search
 */
export async function handleUCPCatalogSearch(params: UCPCatalogQuery) {
  const all = await listProducts().catch(() => [])
  let filtered = all.filter((p) => p.status === "active")

  if (params.category) {
    const cat = params.category.toLowerCase().trim()
    filtered = filtered.filter((p) => p.category.toLowerCase() === cat)
  }

  if (params.q) {
    const needle = params.q.toLowerCase().trim()
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.description?.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle) ||
        p.tags?.some((t) => t.toLowerCase().includes(needle)),
    )
  }

  if (params.max_price_paise) {
    filtered = filtered.filter((p) => p.price_paise <= params.max_price_paise!)
  }

  if (params.in_stock_only) {
    filtered = filtered.filter((p) => p.stock > 0)
  }

  const offset = params.offset || 0
  const limit = params.limit || 20
  const sliced = filtered.slice(offset, offset + limit)

  return {
    ucp_service: "dev.ucp.shopping.catalog",
    version: "1.0.0",
    total_count: filtered.length,
    offset,
    limit,
    products: sliced.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price_paise: p.price_paise,
      currency: "INR",
      category: p.category,
      unit: p.unit,
      stock: p.stock,
      in_stock: p.stock > 0,
      image_urls: p.image_url ? [p.image_url] : [],
      tax_pct: (p as any).gst_pct || 5,
    })),
  }
}

/**
 * dev.ucp.shopping.cart — Cart Session Creation
 */
export async function handleUCPCreateCart(items: UCPCartItemInput[]): Promise<UCPCartSession> {
  const allProducts = await listProducts().catch(() => [])
  let subtotalPaise = 0
  const cartItems: UCPCartSession["items"] = []

  for (const it of items) {
    const prod = allProducts.find((p) => p.id === it.product_id)
    if (!prod) continue

    const qty = Math.max(1, it.quantity)
    const lineTotal = prod.price_paise * qty
    subtotalPaise += lineTotal

    cartItems.push({
      product_id: prod.id,
      title: prod.title,
      quantity: qty,
      unit_price_paise: prod.price_paise,
      line_total_paise: lineTotal,
      image_url: prod.image_url,
    })
  }

  const taxPaise = Math.round(subtotalPaise * 0.05)
  const deliveryFeePaise = subtotalPaise >= 49900 ? 0 : 3900
  const totalPaise = subtotalPaise + taxPaise + deliveryFeePaise

  const cartSession: UCPCartSession = {
    id: `ucp_cart_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
    items: cartItems,
    subtotal_paise: subtotalPaise,
    tax_paise: taxPaise,
    delivery_fee_paise: deliveryFeePaise,
    total_paise: totalPaise,
    currency: "INR",
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    locked: false,
  }

  ucpMemoryCarts.set(cartSession.id, cartSession)
  return cartSession
}

/**
 * dev.ucp.shopping.cart/lock — 15-Minute Inventory Hold
 */
export async function handleUCPCartLock(cartId: string): Promise<UCPCartSession> {
  const cart = ucpMemoryCarts.get(cartId)
  if (!cart) {
    throw new Error(`UCP Cart not found: ${cartId}`)
  }

  cart.locked = true
  cart.expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  ucpMemoryCarts.set(cartId, cart)
  return cart
}

/**
 * dev.ucp.shopping.orders — Order Fulfillment Tracking
 */
export async function handleUCPGetOrderStatus(orderId: string) {
  const order = await getOrder(orderId)
  if (!order) {
    throw new Error(`Order not found: ${orderId}`)
  }

  return {
    ucp_service: "dev.ucp.shopping.orders",
    order_id: order.id,
    razorpay_order_id: order.razorpay_order_id,
    status: order.status,
    shipping_status: order.shipping_status,
    delivery_eta: "10-15 minutes",
    total_paise: order.total_paise,
    currency: order.currency,
    items_count: order.items.length,
    created_at: order.created_at,
    tracking_url: `https://razent.store/#/orders?id=${order.id}`,
  }
}
