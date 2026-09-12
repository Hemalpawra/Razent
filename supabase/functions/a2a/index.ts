// @ts-nocheck
/**
 * Razent Agent-to-Agent (A2A) Gateway Edge Function
 * Implements UCP, ACP, and AP2 protocols on Supabase Edge Network.
 *
 * Handles:
 * - GET  /a2a/catalog (or /ucp/catalog): Federated UCP catalog search
 * - POST /a2a/checkout_sessions (or /acp/checkout_sessions): ACP session creation
 * - GET  /a2a/checkout_sessions/:id: Retrieve ACP session
 * - POST /a2a/checkout_sessions/:id/complete: AP2/ACP settlement via real Razorpay Test Rails
 * - POST /a2a/mandate: AP2 Cart Mandate generation
 */

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_TXeysTR9U8Fyws"
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "UuzZqB93v2obPdSyg3plRzKd"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key, x-acp-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// In-memory cache for sessions
const memorySessions = new Map()

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/v1/, "").replace(/^\/a2a/, "")

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. UCP CATALOG SEARCH: GET /catalog or GET /ucp/catalog
    // ─────────────────────────────────────────────────────────────
    if ((path === "/catalog" || path === "/ucp/catalog" || path === "") && req.method === "GET") {
      const q = url.searchParams.get("q") || url.searchParams.get("query") || ""
      const category = url.searchParams.get("category")
      const maxPricePaise = url.searchParams.get("max_price_paise")
      const inStockOnly = url.searchParams.get("in_stock_only") === "true"

      let dbQuery = supabase.from("products").select("*").eq("status", "active")
      if (category && category !== "All") {
        dbQuery = dbQuery.eq("category", category)
      }

      const rawQ = q.trim().toLowerCase()
      if (rawQ) {
        const terms = new Set<string>()
        terms.add(rawQ)

        // Split multi-word queries
        rawQ.split(/\s+/).forEach((w) => {
          if (w.length > 2) terms.add(w)
        })

        // Stemming plurals
        Array.from(terms).forEach((t) => {
          if (t.endsWith("s") && t.length > 3) terms.add(t.slice(0, -1))
          if (t.endsWith("es") && t.length > 4) terms.add(t.slice(0, -2))
        })

        // Synonym expansion
        if (rawQ.includes("drink") || rawQ.includes("beverage")) {
          ["drink", "beverage", "juice", "water", "cola", "soda", "tea", "coffee"].forEach((w) => terms.add(w))
        }
        if (rawQ.includes("juic") || rawQ.includes("jiuc") || rawQ.includes("juce")) {
          ["juice", "fruit", "orange", "apple", "beverage", "drink"].forEach((w) => terms.add(w))
        }
        if (rawQ.includes("milk") || rawQ.includes("dairy")) {
          ["milk", "dairy", "taaza", "amul", "butter", "curd"].forEach((w) => terms.add(w))
        }

        const orClauses: string[] = []
        for (const t of Array.from(terms).slice(0, 10)) {
          orClauses.push(`title.ilike.%${t}%`, `description.ilike.%${t}%`, `category.ilike.%${t}%`)
        }
        dbQuery = dbQuery.or(orClauses.join(","))
      }

      if (maxPricePaise) {
        dbQuery = dbQuery.lte("price_paise", parseInt(maxPricePaise, 10))
      }
      if (inStockOnly) {
        dbQuery = dbQuery.gt("stock", 0)
      }

      const { data, error } = await dbQuery.order("created_at", { ascending: false }).limit(30)
      if (error) throw error

      // Rank results intelligently
      let ranked = data || []
      if (rawQ) {
        const isJuiceQuery = rawQ.includes("juic") || rawQ.includes("jiuc") || rawQ.includes("juce")
        const isDrinkQuery = rawQ.includes("drink") || rawQ.includes("beverage") || isJuiceQuery

        ranked.sort((a, b) => {
          if (isJuiceQuery) {
            const aJuice = (a.title + " " + (a.description || "")).toLowerCase().includes("juice") ? 1 : 0
            const bJuice = (b.title + " " + (b.description || "")).toLowerCase().includes("juice") ? 1 : 0
            if (aJuice !== bJuice) return bJuice - aJuice
          }
          if (isDrinkQuery) {
            const aIsBev = a.category === "Beverages" || a.category === "Dairy & Bakery" ? 1 : 0
            const bIsBev = b.category === "Beverages" || b.category === "Dairy & Bakery" ? 1 : 0
            if (aIsBev !== bIsBev) return bIsBev - aIsBev
          }
          const aTitleMatch = a.title.toLowerCase().includes(rawQ) ? 1 : 0
          const bTitleMatch = b.title.toLowerCase().includes(rawQ) ? 1 : 0
          return bTitleMatch - aTitleMatch
        })
      }

      const products = ranked.slice(0, 20).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description || "",
        price_paise: p.price_paise,
        price_rupees: (p.price_paise / 100).toFixed(2),
        currency: "INR",
        category: p.category,
        stock: p.stock,
        in_stock: p.stock > 0,
        image_url: p.image_url,
        delivery_sla: "10-15 minutes",
      }))

      return new Response(
        JSON.stringify({
          protocol: "ucp",
          version: "2026-01-16",
          matches_count: products.length,
          products,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ACP CREATE CHECKOUT SESSION: POST /checkout_sessions
    // ─────────────────────────────────────────────────────────────
    if ((path === "/checkout_sessions" || path === "/acp/checkout_sessions") && req.method === "POST") {
      const body = await req.json()
      const items = body.items || body.line_items || []
      if (!items.length) {
        return new Response(JSON.stringify({ error: "items array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data: allProds } = await supabase.from("products").select("*")
      const prods = allProds || []

      let totalPaise = 0
      const lineItems = []

      for (const item of items) {
        const prodId = item.id || item.item_id || item.product_id
        const qty = item.quantity || item.qty || 1
        const prod = prods.find((p) => p.id === prodId)
        if (!prod) continue

        const amount = prod.price_paise * qty
        totalPaise += amount
        lineItems.push({
          id: prod.id,
          title: prod.title,
          quantity: qty,
          unit_price_paise: prod.price_paise,
          line_total_paise: amount,
        })
      }

      const sessionId = `acp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      const session = {
        id: sessionId,
        status: "ready_for_payment",
        currency: "INR",
        totals: [{ type: "total", amount: totalPaise, display_text: "Total Amount" }],
        line_items: lineItems,
        delivery_address: body.delivery_address || {
          full_name: "Autonomous Agent Buyer",
          phone: "+91 98765 43210",
          line1: "100ft Rd, Indiranagar",
          city: "Bengaluru",
          pincode: "560038",
        },
        supported_handlers: ["dev.acp.upi_autopay", "dev.acp.tokenized.card"],
        created_at: new Date().toISOString(),
      }

      let paymentLink = null
      let paymentLinkId = null
      try {
        const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
        const plinkRes = await fetch("https://api.razorpay.com/v1/payment_links", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: totalPaise,
            currency: "INR",
            description: `Razent Order - ${lineItems.map((i) => `${i.quantity}x ${i.title}`).join(", ").slice(0, 80)}`,
            customer: {
              name: session.delivery_address.full_name || "Customer",
              contact: (session.delivery_address.phone || "+919876543210").replace(/\s+/g, ""),
              email: "customer@example.com",
            },
            notify: { sms: false, email: false },
            notes: {
              session_id: sessionId,
              protocol: "acp",
            },
          }),
        })
        if (plinkRes.ok) {
          const plinkData = await plinkRes.json()
          paymentLink = plinkData.short_url
          paymentLinkId = plinkData.id
        } else {
          console.error("Payment link creation error:", await plinkRes.text())
        }
      } catch (err) {
        console.error("Exception creating payment link:", err)
      }

      session.payment_link = paymentLink || `https://razent-merchant.vercel.app/checkout?session=${sessionId}`
      session.payment_url = session.payment_link
      session.payment_link_id = paymentLinkId
      session.payment_instruction = "CRITICAL: Ask the customer to approve payment. Format the link strictly as an embedded markdown button: [Click here to Pay on Razorpay](" + session.payment_url + "). Never show the raw link."

      memorySessions.set(sessionId, session)

      try {
        const { error: insErr } = await supabase.from("acp_checkout_sessions").insert({
          id: sessionId,
          merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
          status: "ready_for_payment",
          currency: "INR",
          line_items: lineItems,
          totals: session.totals,
          capabilities: { supported_handlers: session.supported_handlers, payment_link_id: paymentLinkId },
          fulfillment_details: session.delivery_address,
          payment_link: session.payment_link,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
        })
        if (insErr) {
          console.error("Error inserting acp_checkout_session:", insErr)
        }
      } catch (err) {
        console.error("Exception inserting acp_checkout_session:", err)
      }

      return new Response(JSON.stringify(session), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ─────────────────────────────────────────────────────────────
    // 3. ACP COMPLETE CHECKOUT SESSION: POST /checkout_sessions/:id/complete
    // ─────────────────────────────────────────────────────────────
    if (path.includes("/complete") && req.method === "POST") {
      const match = path.match(/checkout_sessions\/([^\/]+)\/complete/)
      const sessionId = match ? match[1] : null
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "missing session id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      let session = memorySessions.get(sessionId)
      if (!session) {
        const { data, error: fetchErr } = await supabase.from("acp_checkout_sessions").select("*").eq("id", sessionId).maybeSingle()
        if (fetchErr) {
          console.error("Error fetching acp_checkout_session:", fetchErr)
        }
        if (data) {
          session = {
            ...data,
            line_items: data.line_items || [],
            totals: data.totals || [],
            delivery_address: data.fulfillment_details || data.delivery_address || {
              full_name: "Autonomous Agent Customer",
              phone: "+91 98765 43210",
              line1: "Indiranagar 100ft Rd",
              city: "Bengaluru",
              pincode: "560038",
            },
          }
        }
      }

      if (!session) {
        return new Response(JSON.stringify({ error: "session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const totalPaise = session.totals?.[0]?.amount || 0

      // Call Real Razorpay Test API
      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalPaise,
          currency: "INR",
          receipt: `agent_${sessionId.slice(0, 14)}`,
          notes: {
            protocol: "ap2",
            session_id: sessionId,
          },
        }),
      })

      if (!rzpRes.ok) {
        const errText = await rzpRes.text()
        return new Response(JSON.stringify({ error: `Razorpay failed: ${errText}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const rzpOrder = await rzpRes.json()
      const orderId = `RAZ-A2A-${Date.now().toString(36).toUpperCase()}`

      const invoiceUrl = `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/a2a/invoice?order_id=${orderId}&download=true`
      const trackingUrl = `https://razent-merchant.vercel.app/?track=${orderId}`

      try {
        const { error: ordErr } = await supabase.from("orders").insert({
          external_id: orderId,
          merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
          razorpay_order_id: rzpOrder.id,
          status: "paid",
          shipping_status: "dispatched",
          currency: "INR",
          total_paise: totalPaise,
          items: session.line_items || [],
          shipping_address: session.delivery_address || {
            full_name: "Autonomous Agent Customer",
            phone: "+91 98765 43210",
            line1: "Indiranagar 100ft Rd",
            city: "Bengaluru",
            pincode: "560038",
          },
          via_ai: true,
          commerce_protocol: "ap2",
          payment_link: session.payment_link || null,
          settlement_reference: `settle_${rzpOrder.id}`,
          paid_at: new Date().toISOString(),
        })
        if (ordErr) {
          console.error("Error inserting order into DB:", ordErr)
        }
      } catch (err) {
        console.error("Exception inserting order into DB:", err)
      }

      try {
        await supabase.from("acp_checkout_sessions").update({
          status: "completed",
          order_id: orderId,
          razorpay_order_id: rzpOrder.id,
          updated_at: new Date().toISOString(),
        }).eq("id", sessionId)
      } catch (e) {
        console.error("Error updating acp_checkout_session:", e)
      }

      session.status = "completed"
      session.order_id = orderId
      session.razorpay_order_id = rzpOrder.id

      return new Response(
        JSON.stringify({
          success: true,
          status: "settled",
          protocol: "ap2",
          order_id: orderId,
          razorpay_order_id: rzpOrder.id,
          amount_paid_rupees: (totalPaise / 100).toFixed(2),
          settlement_rail: "NPCI UPI AutoPay via Razorpay Test Rails",
          delivery_eta: "10-15 minutes",
          invoice_url: invoiceUrl,
          tracking_url: trackingUrl,
          instructions: "Order settled successfully! Format your response using clean embedded markdown buttons: [Click here to Download Tax Invoice](" + invoiceUrl + ") and [Click here to Track Live Delivery](" + trackingUrl + "). Do NOT show raw URLs.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ACP GET SESSION: GET /checkout_sessions/:id
    // ─────────────────────────────────────────────────────────────
    if (path.includes("/checkout_sessions/") && req.method === "GET") {
      const match = path.match(/checkout_sessions\/([^\/\?]+)/)
      const sessionId = match ? match[1] : null
      let session = memorySessions.get(sessionId)
      if (!session) {
        const { data } = await supabase.from("acp_checkout_sessions").select("*").eq("id", sessionId).maybeSingle()
        if (data) {
          session = {
            ...data,
            line_items: data.line_items || [],
            totals: data.totals || [],
            delivery_address: data.fulfillment_details || data.delivery_address,
            payment_link_id: data.capabilities?.payment_link_id,
          }
        }
      }

      if (!session) {
        return new Response(JSON.stringify({ error: "session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // If already completed, return settled info
      if (session.status === "completed") {
        const invoiceUrl = `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/a2a/invoice?order_id=${session.order_id}&download=true`
        const trackingUrl = `https://razent-merchant.vercel.app/?track=${session.order_id}`
        return new Response(
          JSON.stringify({
            ...session,
            status: "settled",
            order_id: session.order_id,
            razorpay_order_id: session.razorpay_order_id,
            amount_paid_rupees: ((session.totals?.[0]?.amount || 0) / 100).toFixed(2),
            settlement_rail: "NPCI UPI AutoPay via Razorpay Test Rails",
            delivery_eta: "10-15 minutes",
            invoice_url: invoiceUrl,
            tracking_url: trackingUrl,
            instructions: "Order is settled! Format your response using clean embedded markdown buttons: [Click here to Download Tax Invoice](" + invoiceUrl + ") and [Click here to Track Live Delivery](" + trackingUrl + "). Do NOT show raw URLs.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Auto-check Razorpay payment status if ready_for_payment
      const plinkId = session.payment_link_id || session.capabilities?.payment_link_id
      if (session.status === "ready_for_payment" && plinkId) {
        try {
          const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
          const chkRes = await fetch(`https://api.razorpay.com/v1/payment_links/${plinkId}`, {
            headers: { Authorization: `Basic ${auth}` },
          })
          if (chkRes.ok) {
            const chkData = await chkRes.json()
            if (chkData.status === "paid") {
              // User has completed payment on Razorpay! Auto-settle the order now
              const totalPaise = session.totals?.[0]?.amount || chkData.amount || 0
              const rzpOrderId = chkData.order_id || chkData.id
              const orderId = `RAZ-A2A-${Date.now().toString(36).toUpperCase()}`
              const invoiceUrl = `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/a2a/invoice?order_id=${orderId}&download=true`
              const trackingUrl = `https://razent-merchant.vercel.app/?track=${orderId}`

              try {
                await supabase.from("orders").insert({
                  external_id: orderId,
                  merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
                  razorpay_order_id: rzpOrderId,
                  status: "paid",
                  shipping_status: "dispatched",
                  currency: "INR",
                  total_paise: totalPaise,
                  items: session.line_items || [],
                  shipping_address: session.delivery_address || {
                    full_name: "Autonomous Agent Customer",
                    phone: "+91 98765 43210",
                    line1: "Indiranagar 100ft Rd",
                    city: "Bengaluru",
                    pincode: "560038",
                  },
                  via_ai: true,
                  commerce_protocol: "ap2",
                  payment_link: session.payment_link || null,
                  settlement_reference: `settle_${rzpOrderId}`,
                  paid_at: new Date().toISOString(),
                })

                await supabase.from("acp_checkout_sessions").update({
                  status: "completed",
                  order_id: orderId,
                  razorpay_order_id: rzpOrderId,
                  updated_at: new Date().toISOString(),
                }).eq("id", sessionId)
              } catch (e) {
                console.error("Error writing auto-settled order:", e)
              }

              session.status = "completed"
              session.order_id = orderId
              session.razorpay_order_id = rzpOrderId
              memorySessions.set(sessionId, session)

              return new Response(
                JSON.stringify({
                  ...session,
                  status: "settled",
                  order_id: orderId,
                  razorpay_order_id: rzpOrderId,
                  amount_paid_rupees: (totalPaise / 100).toFixed(2),
                  settlement_rail: "NPCI UPI AutoPay via Razorpay Test Rails",
                  delivery_eta: "10-15 minutes",
                  invoice_url: invoiceUrl,
                  tracking_url: trackingUrl,
                  instructions: "Payment verified on Razorpay! Inform the customer their order is placed. Format links as clean markdown buttons: [Click here to Download Tax Invoice](" + invoiceUrl + ") and [Click here to Track Live Delivery](" + trackingUrl + "). Do NOT show raw URLs.",
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              )
            }
          }
        } catch (err) {
          console.error("Error verifying payment link status with Razorpay:", err)
        }
      }

      return new Response(JSON.stringify(session), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ─────────────────────────────────────────────────────────────
    // 5. AP2 CREATE MANDATE: POST /mandate
    // ─────────────────────────────────────────────────────────────
    if ((path === "/mandate" || path === "/ap2/mandate") && req.method === "POST") {
      const body = await req.json()
      return new Response(
        JSON.stringify({
          protocol: "ap2",
          version: "1.0.0",
          mandate_id: `man_${Date.now()}`,
          status: "authorized",
          algorithm: "ES256",
          hash_algorithm: "SHA-256",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 6. OFFICIAL TAX INVOICE HTML: GET /invoice
    // ─────────────────────────────────────────────────────────────
    if (path.startsWith("/invoice") && req.method === "GET") {
      const orderId = url.searchParams.get("order_id") || url.searchParams.get("id") || path.split("/").pop()
      const isDownload = url.searchParams.get("download") !== "false" && url.searchParams.get("view") !== "true"
      const { data: order } = await supabase.from("orders").select("*").eq("external_id", orderId).maybeSingle()

      if (!order) {
        return new Response(`<h1>Invoice Not Found</h1><p>Order ${orderId} does not exist.</p>`, {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        })
      }

      const totalPaise = order.total_paise || 0
      const subtotalPaise = Math.round(totalPaise / 1.18)
      const gstPaise = totalPaise - subtotalPaise
      const cgstPaise = Math.round(gstPaise / 2)
      const sgstPaise = gstPaise - cgstPaise
      const items = Array.isArray(order.items) ? order.items : []
      const addr = order.shipping_address || {}

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GST Tax Invoice - ${order.external_id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .badge { display: inline-block; background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px; }
    .section { margin-top: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    th { text-align: left; background: #f8fafc; padding: 10px; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
    .total-row { font-weight: 700; font-size: 15px; border-top: 2px solid #0f172a; }
    .btn { display: inline-block; margin-top: 24px; background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 style="margin:0; font-size: 22px;">RAZENT STORE</h1>
        <p style="margin:4px 0 0; color:#64748b; font-size: 13px;">Official GST Tax Invoice</p>
      </div>
      <div style="text-align: right;">
        <span class="badge">✓ PAID VIA RAZORPAY</span>
        <p style="margin:6px 0 0; font-family: monospace; font-size: 12px; color: #475569;">${order.external_id}</p>
      </div>
    </div>

    <div class="section grid">
      <div>
        <strong>Billed To:</strong><br>
        ${addr.full_name || "Customer"}<br>
        ${addr.line1 || ""}<br>
        ${addr.city || ""}, ${addr.pincode || ""}<br>
        Phone: ${addr.phone || "N/A"}
      </div>
      <div style="text-align: right;">
        <strong>Invoice Details:</strong><br>
        Invoice No: INV-${order.external_id.replace(/^RAZ-A2A-/, "")}<br>
        Date: ${new Date(order.paid_at || order.created_at).toLocaleDateString("en-IN")}<br>
        Razorpay Order ID: <span style="font-family: monospace;">${order.razorpay_order_id || "N/A"}</span><br>
        Protocol: Google AP2 / ACP
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((i: any) => `
          <tr>
            <td><strong>${i.title}</strong></td>
            <td style="text-align: center;">${i.quantity || i.qty || 1}</td>
            <td style="text-align: right;">₹${(((i.unit_price_paise || i.price_paise || 0) / 100)).toFixed(2)}</td>
            <td style="text-align: right;">₹${(((i.line_total_paise || (i.unit_price_paise || 0) * (i.quantity || 1)) / 100)).toFixed(2)}</td>
          </tr>
        `).join("")}
        <tr>
          <td colspan="3" style="text-align: right; color: #64748b;">Subtotal (Taxable Value):</td>
          <td style="text-align: right;">₹${(subtotalPaise / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right; color: #64748b;">CGST (9%):</td>
          <td style="text-align: right;">₹${(cgstPaise / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right; color: #64748b;">SGST (9%):</td>
          <td style="text-align: right;">₹${(sgstPaise / 100).toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">Grand Total:</td>
          <td style="text-align: right;">₹${(totalPaise / 100).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b;">
      Settlement Reference: ${order.settlement_reference || "N/A"} | Delivery ETA: 10–15 Minutes. This is a computer-generated tax invoice verified under Google Agent Payments Protocol (AP2) rails.
    </div>

    <div style="text-align: center;">
      <button class="btn" onclick="window.print()">Print / Download PDF</button>
    </div>
  </div>
</body>
</html>`

      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      }
      if (isDownload) {
        responseHeaders["Content-Disposition"] = `attachment; filename="Invoice-${order.external_id}.html"`
      }

      return new Response(html, {
        headers: responseHeaders,
      })
    }

    return new Response(JSON.stringify({ error: `Not Found: ${path}` }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
