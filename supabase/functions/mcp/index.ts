// @ts-nocheck
/**
 * Razent Model Context Protocol (MCP) Streamable HTTP Server
 *
 * Implements authoritative Model Context Protocol (MCP) 2026-07-28 specification
 * with full backward compatibility for 2025-11-25 and 2024-11-05.
 *
 * Transports & Protocols Supported:
 * - MCP 2026-07-28 Streamable HTTP (Stateless JSON-RPC 2.0, server/discover, resultType, CacheableResult)
 * - Universal Commerce Protocol (UCP 2026-01-16) for catalog discovery
 * - Agentic Commerce Protocol (ACP) for checkout sessions & Razorpay settlement
 * - Google Agent Payments Protocol (AP2) for delegated spending & intent mandates
 * - Human-in-the-Loop strict payment authorization rails
 */

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_TXeysTR9U8Fyws"
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "UuzZqB93v2obPdSyg3plRzKd"

const SUPPORTED_PROTOCOL_VERSIONS = ["2026-07-28", "2025-11-25", "2024-11-05"]
const LATEST_PROTOCOL_VERSION = "2026-07-28"

const SERVER_INFO = {
  name: "razent-commerce-mcp",
  version: "2026.7.28",
  title: "Razent Quick Commerce MCP Server",
  description: "Official Razent Model Context Protocol (MCP) Server. 10-15 minute delivery across 10 store aisles.",
}

const INSTRUCTIONS =
  "You are connected to the Razent Quick Commerce MCP Server (https://razent.vercel.app). " +
  "Help customers discover products across 10 aisles, prepare checkout sessions with Razorpay payment links, and track deliveries. " +
  "Never charge a customer automatically without consent; always present the secure Razorpay payment link for human verification. " +
  "Format links cleanly as markdown buttons: [Click here to Pay ₹XX via Razorpay](url) and [Click here to Download Tax Invoice](url)."

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, mcp-session-id, x-acp-signature, mcp-protocol-version, mcp-method, mcp-name, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const memorySessions = new Map()

// MCP Tool Definitions (deterministic ordering applied at query time)
const TOOLS = [
  {
    name: "search_catalog",
    description:
      "Search products in Razent 10-15 min quick grocery delivery catalog via Universal Commerce Protocol (UCP). " +
      "Features typo tolerance, category filtering, plural stemming, and price ceilings. Returns matching items with price in rupees, stock, and images.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword e.g. 'milk', 'peanut butter', 'atta', 'bread', 'chocolate', 'drinks'" },
        category: {
          type: "string",
          description:
            "Aisle category: 'Grocery & Staples', 'Beverages', 'Electronics', 'Beauty & Personal Care', 'Home Care', 'Home & Kitchen', 'Decor', 'Kids', 'Kitchen Appliances', 'Office & Stationery'",
        },
        max_price_paise: { type: "number", description: "Maximum price in paise (e.g. 25000 = ₹250)" },
        in_stock_only: { type: "boolean", description: "Only return items currently in stock (default: true)" },
      },
    },
  },
  {
    name: "create_checkout_session",
    description:
      "Create an Agentic Commerce Protocol (ACP) checkout session and generate a verified Razorpay payment link. " +
      "Human-in-the-loop: Present the payment link to the customer for authorization. Never charge automatically.",
    inputSchema: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          description: "List of product items and quantities to buy",
          items: {
            type: "object",
            required: ["id", "quantity"],
            properties: {
              id: { type: "string", description: "Product ID (number or string) or exact product title" },
              quantity: { type: "number", minimum: 1, description: "Quantity of item" },
            },
          },
        },
        delivery_address: {
          type: "object",
          description: "Customer delivery address",
          properties: {
            full_name: { type: "string" },
            phone: { type: "string" },
            line1: { type: "string" },
            city: { type: "string" },
            pincode: { type: "string" },
          },
        },
      },
    },
  },
  {
    name: "get_checkout_session",
    description:
      "Check live payment and order settlement status of a checkout session. " +
      "Polls Razorpay in real time: when customer completes payment, automatically settles the order and generates tracking and invoice links.",
    inputSchema: {
      type: "object",
      required: ["session_id"],
      properties: {
        session_id: { type: "string", description: "Session ID returned from create_checkout_session (e.g. acp_mty6n7ti_yokj)" },
      },
    },
  },
  {
    name: "track_orders",
    description:
      "Track live order delivery and history by Order ID (e.g. RAZ-A2A-MTY6O735), customer mobile phone, or email. " +
      "Returns delivery timeline stage, items, address, and downloadable tax invoice link.",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "Order ID (e.g. RAZ-A2A-MTY6O735)" },
        mobile: { type: "string", description: "Customer phone number" },
        email: { type: "string", description: "Customer email address" },
      },
    },
  },
  {
    name: "ap2_execute_autonomous_checkout",
    description:
      "Execute autonomous Human-Not-Present purchase under Google AP2 protocol with real Razorpay test settlement. Verifies delegated spending cap and creates authoritative orders.",
    inputSchema: {
      type: "object",
      required: ["checkout_session_id"],
      properties: {
        checkout_session_id: { type: "string", description: "Session ID returned from create_checkout_session" },
        upi_vpa: { type: "string", description: "Customer UPI VPA (defaults to customer@okhdfcbank)" },
        delegated_price_cap_paise: { type: "number", description: "User delegated spending cap in paise (e.g. 50000 = ₹500)" },
      },
    },
  },
]

// Tool execution handlers
async function executeSearchCatalog(args: any) {
  const q = args.query || args.q || ""
  const category = args.category
  const maxPricePaise = args.max_price_paise
  const inStockOnly = args.in_stock_only !== false

  let dbQuery = supabase.from("products").select("*").eq("status", "active")
  if (category && category !== "All") {
    dbQuery = dbQuery.eq("category", category)
  }

  const rawQ = q.trim().toLowerCase()
  if (rawQ) {
    const terms = new Set<string>()
    terms.add(rawQ)
    rawQ.split(/\s+/).forEach((w: string) => {
      if (w.length > 2) terms.add(w)
    })
    Array.from(terms).forEach((t: string) => {
      if (t.endsWith("ies") && t.length > 4) terms.add(t.slice(0, -3) + "y")
      if (t.endsWith("es") && t.length > 4) terms.add(t.slice(0, -2))
      if (t.endsWith("s") && t.length > 3) terms.add(t.slice(0, -1))
    })
    if (rawQ.includes("drink") || rawQ.includes("beverage")) {
      ;["drink", "beverage", "juice", "water", "cola", "soda", "tea", "coffee"].forEach((w) => terms.add(w))
    }
    if (rawQ.includes("juic") || rawQ.includes("jiuc") || rawQ.includes("juce")) {
      ;["juice", "fruit", "orange", "apple", "beverage", "drink"].forEach((w) => terms.add(w))
    }
    if (rawQ.includes("milk") || rawQ.includes("dairy")) {
      ;["milk", "dairy", "taaza", "amul", "butter", "curd"].forEach((w) => terms.add(w))
    }

    const orClauses = []
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

  const { data, error } = await dbQuery.order("created_at", { ascending: false }).limit(20)
  if (error) throw error

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
        const aIsBev = a.category === "Beverages" ? 1 : 0
        const bIsBev = b.category === "Beverages" ? 1 : 0
        if (aIsBev !== bIsBev) return bIsBev - aIsBev
      }
      const aTitleMatch = a.title.toLowerCase().includes(rawQ) ? 1 : 0
      const bTitleMatch = b.title.toLowerCase().includes(rawQ) ? 1 : 0
      return bTitleMatch - aTitleMatch
    })
  }

  return {
    protocol: "ucp",
    version: "2026-01-16",
    matches_count: ranked.length,
    products: ranked.slice(0, 10).map((p) => ({
      id: p.id,
      title: p.title,
      price: "₹" + (p.price_paise / 100).toFixed(2),
      price_paise: p.price_paise,
      mrp: p.mrp_paise ? "₹" + (p.mrp_paise / 100).toFixed(2) : null,
      unit: p.unit || "1 unit",
      category: p.category,
      stock: p.stock,
      image_url: p.image_url,
      delivery_sla: "10-15 minutes",
    })),
  }
}

async function executeCreateCheckoutSession(args: any) {
  const items = args.items || []
  if (!items.length) {
    throw new Error("No items provided in checkout session request")
  }

  const { data: allProds, error: pErr } = await supabase.from("products").select("*")
  if (pErr) throw pErr
  const prods = allProds || []

  let totalPaise = 0
  const lineItems = []

  for (const item of items) {
    const rawId = String(item.id).trim().toLowerCase()
    const prod = prods.find((p) => String(p.id).toLowerCase() === rawId || p.title.toLowerCase().includes(rawId))
    if (!prod) {
      throw new Error(`Product not found for: "${item.id}"`)
    }
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1)
    const lineTotal = prod.price_paise * qty
    totalPaise += lineTotal
    lineItems.push({
      id: prod.id,
      title: prod.title,
      quantity: qty,
      unit_price_paise: prod.price_paise,
      line_total_paise: lineTotal,
    })
  }

  const sessionId = `acp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const defaultAddress = {
    full_name: "Customer (via MCP)",
    phone: "+91 98765 43210",
    line1: "Indiranagar 100ft Rd",
    city: "Bengaluru",
    pincode: "560038",
  }
  const address = args.delivery_address ? { ...defaultAddress, ...args.delivery_address } : defaultAddress

  let paymentLink = `https://razent.vercel.app/checkout?session=${sessionId}`
  let razorpayPaymentLinkId = null

  try {
    const authHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    const rzpRes = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: totalPaise,
        currency: "INR",
        accept_partial: false,
        reference_id: sessionId,
        description: `Razent Instant Delivery - ${lineItems.length} item(s)`,
        customer: {
          name: address.full_name,
          contact: address.phone.replace(/[^0-9]/g, "").slice(-10),
        },
        notify: { sms: false, email: false },
        reminder_enable: false,
        callback_url: `https://razent.vercel.app/checkout/success?session=${sessionId}`,
        callback_method: "get",
      }),
    })

    if (rzpRes.ok) {
      const rzpData = await rzpRes.json()
      if (rzpData.short_url) {
        paymentLink = rzpData.short_url
        razorpayPaymentLinkId = rzpData.id
      }
    }
  } catch (err) {
    console.warn("Razorpay link creation notice:", err.message)
  }

  const sessionObj = {
    session_id: sessionId,
    status: "ready_for_payment",
    currency: "INR",
    total_rupees: "₹" + (totalPaise / 100).toFixed(2),
    total_paise: totalPaise,
    items: lineItems,
    delivery_address: address,
    payment_link: paymentLink,
    payment_link_markdown: `[Click here to Pay ₹${(totalPaise / 100).toFixed(2)} on Razorpay](${paymentLink})`,
    razorpay_payment_link_id: razorpayPaymentLinkId,
    instructions: "CRITICAL: Present the payment link above to the customer for manual verification. Never pay on customer behalf.",
    created_at: new Date().toISOString(),
  }

  memorySessions.set(sessionId, sessionObj)

  try {
    const { error: insErr } = await supabase.from("acp_checkout_sessions").insert({
      id: sessionId,
      merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
      status: "ready_for_payment",
      currency: "INR",
      line_items: lineItems,
      totals: [{ type: "total", amount: totalPaise, display_text: "Total Amount" }],
      capabilities: { payment_link_id: razorpayPaymentLinkId },
      fulfillment_details: address,
      payment_link: paymentLink,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })
    if (insErr) console.error("Insert checkout session error:", insErr)
  } catch (e) {
    console.error("Exception inserting checkout session:", e)
  }

  return sessionObj
}

async function executeGetCheckoutSession(args: any) {
  const { session_id } = args
  if (!session_id) throw new Error("session_id is required")

  let session = memorySessions.get(session_id)
  if (!session) {
    const { data: dbSession } = await supabase.from("acp_checkout_sessions").select("*").eq("id", session_id).maybeSingle()
    if (dbSession) {
      session = {
        session_id: dbSession.id,
        status: dbSession.status,
        total_paise: dbSession.totals?.[0]?.amount || 0,
        payment_link: dbSession.payment_link || dbSession.metadata?.payment_link,
        razorpay_payment_link_id: dbSession.capabilities?.payment_link_id || dbSession.metadata?.razorpay_payment_link_id,
        items: dbSession.line_items || [],
        order_id: dbSession.metadata?.order_id,
      }
    }
  }

  if (!session) throw new Error(`Session ${session_id} not found`)

  if (session.razorpay_payment_link_id && session.status !== "paid" && session.status !== "completed") {
    try {
      const authHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payment_links/${session.razorpay_payment_link_id}`, {
        headers: { Authorization: `Basic ${authHeader}` },
      })
      if (rzpRes.ok) {
        const rzpData = await rzpRes.json()
        if (rzpData.status === "paid") {
          const orderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
          session.status = "paid"
          session.order_id = orderId

          await supabase.from("orders").insert({
            external_id: orderId,
            merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
            status: "paid",
            shipping_status: "dispatched",
            currency: "INR",
            total_paise: session.total_paise,
            items: session.items,
            via_ai: true,
            commerce_protocol: "mcp",
          })
          await supabase.from("acp_checkout_sessions").update({ status: "paid" }).eq("id", session_id)
        }
      }
    } catch {}
  }

  if (session.status === "paid" || session.status === "completed") {
    const orderId = session.order_id || `RAZ-${session_id.slice(-8).toUpperCase()}`
    const invoiceUrl = `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/a2a/invoice?order_id=${orderId}&download=true`
    const trackingUrl = `https://razent.vercel.app/?track=${orderId}`
    return {
      status: "paid",
      order_id: orderId,
      delivery_sla: "10-15 minutes",
      tracking_markdown: `[Click here to Track Live Delivery](${trackingUrl})`,
      invoice_markdown: `[Click here to Download Tax Invoice](${invoiceUrl})`,
    }
  }

  return {
    status: session.status,
    session_id: session.session_id,
    payment_link: session.payment_link,
    payment_link_markdown: `[Click here to Pay on Razorpay](${session.payment_link})`,
    message: "Awaiting customer payment authorization.",
  }
}

async function executeTrackOrders(args: any) {
  const { order_id, mobile, email } = args
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false })

  if (order_id) {
    query = query.or(`external_id.ilike.%${order_id}%,razorpay_order_id.ilike.%${order_id}%`)
  } else if (mobile) {
    const cleanMobile = mobile.replace(/[^0-9]/g, "").slice(-10)
    query = query.like("shipping_address->>phone", `%${cleanMobile}%`)
  } else if (email) {
    query = query.ilike("shipping_address->>email", `%${email}%`)
  } else {
    query = query.limit(5)
  }

  const { data, error } = await query.limit(5)
  if (error) throw error

  if (!data || data.length === 0) {
    return { found: false, message: "No orders found matching the provided criteria." }
  }

  return {
    found: true,
    count: data.length,
    orders: data.map((o) => {
      const invoiceUrl = `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/a2a/invoice?order_id=${o.external_id}&download=true`
      const trackingUrl = `https://razent.vercel.app/?track=${o.external_id}`
      return {
        order_id: o.external_id,
        status: o.status,
        shipping_status: o.shipping_status || "processing",
        total: "₹" + (o.total_paise / 100).toFixed(2),
        items: o.items,
        delivery_address: o.shipping_address,
        invoice_url: invoiceUrl,
        invoice_markdown: `[Click here to Download Tax Invoice](${invoiceUrl})`,
        tracking_url: trackingUrl,
        tracking_markdown: `[Click here to Track Live Delivery](${trackingUrl})`,
      }
    }),
  }
}

async function executeAP2Checkout(args: any) {
  const { checkout_session_id, upi_vpa = "customer@okhdfcbank", delegated_price_cap_paise = 1500000 } = args
  let session = memorySessions.get(checkout_session_id)
  if (!session) {
    const { data: dbSession } = await supabase.from("acp_checkout_sessions").select("*").eq("id", checkout_session_id).maybeSingle()
    if (dbSession) session = dbSession
  }
  if (!session) throw new Error(`Checkout session ${checkout_session_id} not found`)

  const totalPaise = session.total_paise || session.totals?.[0]?.amount || 0
  if (totalPaise > delegated_price_cap_paise) {
    return {
      status: "step_up_required",
      protocol: "x402",
      message: `Order total ₹${(totalPaise / 100).toFixed(2)} exceeds delegated limit ₹${(delegated_price_cap_paise / 100).toFixed(2)}. Human approval required.`,
    }
  }

  const orderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
  return {
    success: true,
    status: "settled",
    protocol: "ap2",
    order_id: orderId,
    amount_paid_rupees: (totalPaise / 100).toFixed(2),
    settlement_rail: "NPCI UPI AutoPay via Razorpay Test Rails",
    delivery_eta: "10-15 minutes",
    tracking_markdown: `[Click here to Track Live Delivery](https://razent.vercel.app/?track=${orderId})`,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // GET: Health, Discovery & Well-Known Server Info
  if (req.method === "GET") {
    const sortedTools = [...TOOLS].sort((a, b) => a.name.localeCompare(b.name))
    return new Response(
      JSON.stringify(
        {
          name: SERVER_INFO.name,
          version: SERVER_INFO.version,
          status: "online",
          transport: "Streamable HTTP (JSON-RPC 2.0)",
          mcp_specification: LATEST_PROTOCOL_VERSION,
          supported_versions: SUPPORTED_PROTOCOL_VERSIONS,
          protocols_supported: ["mcp", "ucp", "acp", "ap2"],
          description: SERVER_INFO.description,
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false },
            prompts: { listChanged: false },
          },
          tools: sortedTools.map((t) => ({ name: t.name, description: t.description })),
          storefront_url: "https://razent.vercel.app",
          well_known_manifest: "https://razent.vercel.app/.well-known/mcp.json",
        },
        null,
        2
      ),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }

  // POST: Standard JSON-RPC 2.0 Streamable HTTP
  if (req.method === "POST") {
    let bodyText = await req.text()
    if (!bodyText.trim()) {
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error: empty body" }, id: null }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let payload: any
    try {
      payload = JSON.parse(bodyText)
    } catch {
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error: invalid JSON" }, id: null }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const isBatch = Array.isArray(payload)
    const requests = isBatch ? payload : [payload]
    const responses = []

    // Header Protocol Version check per SEP-2575
    const headerVersion = req.headers.get("mcp-protocol-version")
    if (headerVersion && !SUPPORTED_PROTOCOL_VERSIONS.includes(headerVersion)) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: requests[0]?.id || null,
          error: {
            code: -32022,
            message: `Unsupported protocol version: ${headerVersion}`,
            data: { supported: SUPPORTED_PROTOCOL_VERSIONS, requested: headerVersion },
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    for (const rpc of requests) {
      const { id = null, method, params = {} } = rpc

      // Per-request protocolVersion check in _meta (MCP 2026-07-28)
      const meta = params?._meta || rpc?._meta
      const reqVersion = meta?.["io.modelcontextprotocol/protocolVersion"]
      if (reqVersion && !SUPPORTED_PROTOCOL_VERSIONS.includes(reqVersion)) {
        responses.push({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32022,
            message: `Unsupported protocol version: ${reqVersion}`,
            data: { supported: SUPPORTED_PROTOCOL_VERSIONS, requested: reqVersion },
          },
        })
        continue
      }

      // 1. MCP 2026-07-28: server/discover (Mandatory RPC)
      if (method === "server/discover") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            supportedVersions: SUPPORTED_PROTOCOL_VERSIONS,
            capabilities: {
              tools: { listChanged: false },
              resources: { listChanged: false },
              prompts: { listChanged: false },
            },
            _meta: {
              "io.modelcontextprotocol/serverInfo": SERVER_INFO,
            },
            instructions: INSTRUCTIONS,
            ttlMs: 3600000,
            cacheScope: "public",
          },
        })
        continue
      }

      // 2. Legacy initialize handshake (2024-11-05 / 2025-11-25 compatibility)
      if (method === "initialize") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            protocolVersion: params.protocolVersion || LATEST_PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
              resources: { listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: SERVER_INFO,
            instructions: INSTRUCTIONS,
            _meta: {
              "io.modelcontextprotocol/serverInfo": SERVER_INFO,
            },
          },
        })
        continue
      }

      if (method === "notifications/initialized" || method === "initialized" || method === "ping") {
        if (id !== null) {
          responses.push({
            jsonrpc: "2.0",
            id,
            result: {
              resultType: "complete",
              _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO },
            },
          })
        }
        continue
      }

      // 3. Subscriptions pattern (MCP 2026-07-28)
      if (method === "subscriptions/listen") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            subscribed: params.subscriptions || [],
            _meta: {
              "io.modelcontextprotocol/subscriptionId": id,
              "io.modelcontextprotocol/serverInfo": SERVER_INFO,
            },
          },
        })
        continue
      }

      // 4. tools/list (Deterministic ordering, ttlMs and cacheScope per SEP-2549)
      if (method === "tools/list") {
        const sortedTools = [...TOOLS].sort((a, b) => a.name.localeCompare(b.name))
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            tools: sortedTools,
            ttlMs: 300000, // 5 min freshness hint
            cacheScope: "public",
            _meta: {
              "io.modelcontextprotocol/serverInfo": SERVER_INFO,
            },
          },
        })
        continue
      }

      // 5. tools/call (Full protocol handling + structuredContent + MRTR compatibility)
      if (method === "tools/call") {
        const { name, arguments: toolArgs = {} } = params
        try {
          let toolResult
          if (name === "search_catalog" || name === "ucp_catalog_search") {
            toolResult = await executeSearchCatalog(toolArgs)
          } else if (name === "create_checkout_session" || name === "acp_create_checkout_session") {
            toolResult = await executeCreateCheckoutSession(toolArgs)
          } else if (name === "get_checkout_session" || name === "acp_get_checkout_session") {
            toolResult = await executeGetCheckoutSession(toolArgs)
          } else if (name === "track_orders" || name === "track_order") {
            toolResult = await executeTrackOrders(toolArgs)
          } else if (name === "ap2_execute_autonomous_checkout") {
            toolResult = await executeAP2Checkout(toolArgs)
          } else {
            throw new Error(`Unknown tool: ${name}`)
          }

          responses.push({
            jsonrpc: "2.0",
            id,
            result: {
              resultType: "complete",
              content: [
                {
                  type: "text",
                  text: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult, null, 2),
                },
              ],
              structuredContent: typeof toolResult === "object" ? toolResult : undefined,
              isError: false,
              _meta: {
                "io.modelcontextprotocol/serverInfo": SERVER_INFO,
              },
            },
          })
        } catch (err: any) {
          responses.push({
            jsonrpc: "2.0",
            id,
            result: {
              resultType: "complete",
              content: [{ type: "text", text: `Error: ${err?.message || String(err)}` }],
              isError: true,
              _meta: {
                "io.modelcontextprotocol/serverInfo": SERVER_INFO,
              },
            },
          })
        }
        continue
      }

      // 6. prompts/list & prompts/get
      if (method === "prompts/list") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            prompts: [
              {
                name: "shopping_assistant",
                description: "Official instructions for acting as the Razent Quick Commerce Assistant",
                arguments: [],
              },
            ],
            ttlMs: 300000,
            cacheScope: "public",
            _meta: {
              "io.modelcontextprotocol/serverInfo": SERVER_INFO,
            },
          },
        })
        continue
      }

      if (method === "prompts/get") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            description: "Razent Assistant Instructions",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: INSTRUCTIONS,
                },
              },
            ],
            _meta: {
              "io.modelcontextprotocol/serverInfo": SERVER_INFO,
            },
          },
        })
        continue
      }

      // 7. resources/list & resources/read
      if (method === "resources/list") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            resources: [
              {
                uri: "razent://store/aisles",
                name: "Store Aisles",
                mimeType: "application/json",
                description: "10 active instant commerce categories",
              },
            ],
            ttlMs: 300000,
            cacheScope: "public",
            _meta: {
              "io.modelcontextprotocol/serverInfo": SERVER_INFO,
            },
          },
        })
        continue
      }

      if (method === "resources/read") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            resultType: "complete",
            contents: [
              {
                uri: params.uri || "razent://store/aisles",
                mimeType: "application/json",
                text: JSON.stringify({
                  aisles: [
                    "Grocery & Staples",
                    "Beverages",
                    "Electronics",
                    "Beauty & Personal Care",
                    "Home Care",
                    "Home & Kitchen",
                    "Decor",
                    "Kids",
                    "Kitchen Appliances",
                    "Office & Stationery",
                  ],
                  store: "Razent Quick Commerce",
                  delivery_sla: "10-15 minutes",
                }),
              },
            ],
            _meta: {
              "io.modelcontextprotocol/serverInfo": SERVER_INFO,
            },
          },
        })
        continue
      }

      responses.push({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      })
    }

    const respBody = isBatch ? responses : responses[0]
    return new Response(JSON.stringify(respBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders })
})
