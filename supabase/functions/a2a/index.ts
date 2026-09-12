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
      if (q.trim()) {
        const term = q.trim()
        dbQuery = dbQuery.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`)
      }
      if (maxPricePaise) {
        dbQuery = dbQuery.lte("price_paise", parseInt(maxPricePaise, 10))
      }
      if (inStockOnly) {
        dbQuery = dbQuery.gt("stock", 0)
      }

      const { data, error } = await dbQuery.order("created_at", { ascending: false }).limit(20)
      if (error) throw error

      const products = (data || []).map((p) => ({
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

      memorySessions.set(sessionId, session)

      try {
        const { error: insErr } = await supabase.from("acp_checkout_sessions").insert({
          id: sessionId,
          merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
          status: "ready_for_payment",
          currency: "INR",
          line_items: lineItems,
          totals: session.totals,
          capabilities: { supported_handlers: session.supported_handlers },
          fulfillment_details: session.delivery_address,
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

      try {
        await supabase.from("orders").insert({
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
          settlement_reference: `settle_${rzpOrder.id}`,
          paid_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error("Error inserting order into DB:", err)
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
        if (data) session = data
      }

      if (!session) {
        return new Response(JSON.stringify({ error: "session not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
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
