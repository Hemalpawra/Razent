/**
 * Real Razorpay REST API Client for Pre-Production Agentic Commerce
 *
 * Communicates directly with Razorpay API (https://api.razorpay.com/v1)
 * using the configured test credentials.
 *
 * Implements:
 * 1. Order creation for UCP / ACP / AP2 checkouts
 * 2. Order status fetching
 * 3. Payment details verification
 * 4. Cryptographic payment signature verification
 */

import { verifyRazorpayPaymentSignature } from "@/lib/protocol/ap2Crypto"

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TXeysTR9U8Fyws"
const RAZORPAY_KEY_SECRET = import.meta.env.VITE_RAZORPAY_KEY_SECRET || "UuzZqB93v2obPdSyg3plRzKd"
const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1"

export interface RazorpayOrder {
  id: string
  entity: "order"
  amount: number // in paise
  amount_paid: number
  amount_due: number
  currency: "INR"
  receipt: string
  status: "created" | "attempted" | "paid"
  attempts: number
  notes?: Record<string, string>
  created_at: number
}

export interface RazorpayPayment {
  id: string
  entity: "payment"
  amount: number
  currency: "INR"
  status: "created" | "authorized" | "captured" | "refunded" | "failed"
  order_id: string
  invoice_id?: string
  international: boolean
  method: "card" | "netbanking" | "wallet" | "emi" | "upi"
  amount_refunded: number
  refund_status?: string
  captured: boolean
  description?: string
  card_id?: string
  bank?: string
  wallet?: string
  vpa?: string
  email: string
  contact: string
  notes?: Record<string, string>
  fee?: number
  tax?: number
  error_code?: string
  error_description?: string
  created_at: number
}

function getAuthHeader(): string {
  return `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`
}

/**
 * Creates an authoritative order directly on Razorpay's test network with retry resilience.
 */
export async function createRazorpayOrder(params: {
  amount_paise: number
  receipt: string
  notes?: Record<string, string>
}): Promise<RazorpayOrder> {
  const payload = {
    amount: Math.round(params.amount_paise),
    currency: "INR",
    receipt: params.receipt,
    notes: {
      platform: "Razent Agentic Commerce",
      protocol: "ucp_acp_ap2",
      ...(params.notes || {}),
    },
  }

  let lastError: any = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(`Razorpay Order Creation Failed (${res.status}): ${errorBody}`)
      }

      return (await res.json()) as RazorpayOrder
    } catch (err: any) {
      lastError = err
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 600 * attempt))
      }
    }
  }

  throw lastError
}

/**
 * Fetches an order status from Razorpay by its order_id (rzp_order_xxx).
 */
export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder> {
  let lastError: any = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${RAZORPAY_BASE_URL}/orders/${orderId}`, {
        method: "GET",
        headers: {
          Authorization: getAuthHeader(),
        },
      })

      if (!res.ok) {
        const errorBody = await res.text()
        throw new Error(`Razorpay Order Fetch Failed (${res.status}): ${errorBody}`)
      }

      return (await res.json()) as RazorpayOrder
    } catch (err: any) {
      lastError = err
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 600 * attempt))
      }
    }
  }

  throw lastError
}

/**
 * Fetches and verifies a payment record from Razorpay by payment_id (pay_xxx).
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const res = await fetch(`${RAZORPAY_BASE_URL}/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
    },
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Razorpay Payment Fetch Failed (${res.status}): ${errorBody}`)
  }

  return (await res.json()) as RazorpayPayment
}

/**
 * Cryptographically verifies Razorpay payment signature using HMAC-SHA256.
 */
export async function verifyPaymentSignature(params: {
  orderId: string
  paymentId: string
  signature: string
}): Promise<boolean> {
  return verifyRazorpayPaymentSignature(
    params.orderId,
    params.paymentId,
    params.signature,
    RAZORPAY_KEY_SECRET,
  )
}
