// @ts-nocheck
/**
 * Razent Model Context Protocol (MCP) Streamable HTTP Server
 *
 * Implements standard Model Context Protocol (MCP) over Streamable HTTP (JSON-RPC 2.0).
 * Fully compatible with:
 * - Claude.ai MCP Connectors (Streamable HTTP / SSE)
 * - Anthropic Claude Desktop & Cursor
 * - OpenAI ChatGPT Plugins / Connectors / Actions
 * - Autonomous AI Commerce Agents
 */

import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_TXeysTR9U8Fyws"
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "UuzZqB93v2obPdSyg3plRzKd"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, mcp-session-id, x-acp-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const memorySessions = new Map()

// Tool definitions for MCP
const TOOLS = [
  {
    name: "search_catalog",
    description:
      "Search products in Razent 10-15 min quick grocery delivery catalog via Universal Commerce Protocol (UCP). " +
      "Features typo tolerance, category filtering, plural stemming, and price ceilings. Returns matching items with price in rupees, stock, and images.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword e.g. 'milk', 'peanut butter', 'atta', 'bread', 'chocolate'" },
        category: { type: "string", description: "Aisle category: 'Grocery & Staples', 'Beverages', 'Electronics', 'Beauty & Personal Care', 'Home Care', 'Home & Kitchen', 'Decor', 'Kids', 'Kitchen Appliances', 'Office & Stationery'" },
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
      ["drink", "beverage", "juice", "water", "cola", "soda", "tea", "coffee"].forEach((w) => terms.add(w))
    }
    if (rawQ.includes("juic") || rawQ.includes("jiuc") || rawQ.includes("juce")) {
      ["juice", "fruit", "orange", "apple", "beverage", "drink"].forEach((w) => terms.add(w))
    }
    if (rawQ.includes("milk") || rawQ.includes("dairy")) {
      ["milk", "dairy", "taaza", "amul", "butter", "curd"].forEach((w) => terms.add(w))
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
  if (!items.length) throw new Error("items array is required")

  const { data: allProds } = await supabase.from("products").select("*")
  const prods = allProds || []

  let totalPaise = 0
  const lineItems = []

  for (const item of items) {
    const prodId = String(item.id || item.product_id || "").trim()
    const qty = item.quantity || 1
    const prod = prods.find((p) => String(p.id) === prodId || p.title.toLowerCase().includes(prodId.toLowerCase()))
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

  if (lineItems.length === 0) {
    throw new Error("None of the requested products were found in active catalog")
  }

  const sessionId = `acp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const deliveryAddress = args.delivery_address || {
    full_name: "Customer",
    phone: "+91 98765 43210",
    line1: "Indiranagar",
    city: "Bengaluru",
    pincode: "560038",
  }

  let paymentLink = null
  let paymentLinkId = null

  try {
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    const desc = "Razent Order - " + lineItems.map((i) => `${i.quantity}x ${i.title}`).join(", ").slice(0, 80)
    const plinkRes = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: totalPaise,
        currency: "INR",
        description: desc,
        customer: {
          name: deliveryAddress.full_name || "Customer",
          contact: (deliveryAddress.phone || "+919876543210").replace(/\s+/g, ""),
          email: "customer@example.com",
        },
        notify: { sms: false, email: false },
        notes: { session_id: sessionId, protocol: "acp_mcp" },
      }),
    })

    if (plinkRes.ok) {
      const plinkData = await plinkRes.json()
      paymentLink = plinkData.short_url
      paymentLinkId = plinkData.id
    }
  } catch (err) {
    console.error("Razorpay plink creation failed:", err)
  }

  const finalPaymentLink = paymentLink || `https://razent-merchant.vercel.app/checkout?session=${sessionId}`

  const session = {
    session_id: sessionId,
    status: "ready_for_payment",
    currency: "INR",
    total_rupees: "₹" + (totalPaise / 100).toFixed(2),
    total_paise: totalPaise,
    items: lineItems,
    delivery_address: deliveryAddress,
    payment_link: finalPaymentLink,
    payment_link_markdown: `[Click here to Pay ₹${(totalPaise / 100).toFixed(2)} on Razorpay](${finalPaymentLink})`,
    instructions:
      "CRITICAL: Present the payment link above to the customer for manual verification. Never pay on customer behalf.",
  }

  memorySessions.set(sessionId, { ...session, payment_link_id: paymentLinkId })

  try {
    await supabase.from("acp_checkout_sessions").insert({
      id: sessionId,
      merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
      status: "ready_for_payment",
      currency: "INR",
      line_items: lineItems,
      totals: [{ type: "total", amount: totalPaise, display_text: "Total Amount" }],
      capabilities: { supported_handlers: ["dev.acp.upi_autopay"], payment_link_id: paymentLinkId },
      fulfillment_details: deliveryAddress,
      payment_link: finalPaymentLink,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    })
  } catch {}

  return session
}

async function executeGetCheckoutSession(args: any) {
  const sessionId = args.session_id
  if (!sessionId) throw new Error("session_id is required")

  let session = memorySessions.get(sessionId)
  if (!session) {
    const { data } = await supabase.from("acp_checkout_sessions").select("*").eq("id", sessionId).maybeSingle()
    if (data) {
      session = {
        ...data,
        items: data.line_items || [],
        payment_link_id: data.capabilities?.payment_link_id,
      }
    }
  }

  if (!session) throw new Error(`Session ${sessionId} not found`)

  // Check if completed
  if (session.status === "completed") {
    const invoiceUrl = `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/a2a/invoice?order_id=${session.order_id}&download=true`
    const trackingUrl = `https://razent-merchant.vercel.app/?track=${session.order_id}`
    return {
      status: "settled",
      order_id: session.order_id,
      razorpay_order_id: session.razorpay_order_id,
      amount_paid: session.total_rupees || (session.totals?.[0]?.amount ? "₹" + (session.totals[0].amount / 100).toFixed(2) : "Paid"),
      delivery_eta: "10-15 minutes",
      invoice_url: invoiceUrl,
      invoice_markdown: `[Click here to Download Tax Invoice](${invoiceUrl})`,
      tracking_url: trackingUrl,
      tracking_markdown: `[Click here to Track Live Delivery](${trackingUrl})`,
      instructions: "Order settled successfully! Format responses with clean markdown buttons.",
    }
  }

  // Real-time polling check via Razorpay
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
              items: session.items || session.line_items || [],
              shipping_address: session.delivery_address || session.fulfillment_details || {},
              via_ai: true,
              commerce_protocol: "acp_mcp",
              payment_link: session.payment_link,
              settlement_reference: `settle_${rzpOrderId}`,
              paid_at: new Date().toISOString(),
            })
          } catch (e) {
            console.error("Order insert notice:", e)
          }

          try {
            await supabase.from("acp_checkout_sessions").update({
              status: "completed",
              order_id: orderId,
              razorpay_order_id: rzpOrderId,
            }).eq("id", sessionId)
          } catch {}

          session.status = "completed"
          session.order_id = orderId
          session.razorpay_order_id = rzpOrderId

          return {
            status: "settled",
            order_id: orderId,
            razorpay_order_id: rzpOrderId,
            amount_paid: "₹" + (totalPaise / 100).toFixed(2),
            delivery_eta: "10-15 minutes",
            invoice_url: invoiceUrl,
            invoice_markdown: `[Click here to Download Tax Invoice](${invoiceUrl})`,
            tracking_url: trackingUrl,
            tracking_markdown: `[Click here to Track Live Delivery](${trackingUrl})`,
          }
        }
      }
    } catch (err) {
      console.error("Polling error:", err)
    }
  }

  return {
    status: session.status || "pending",
    session_id: sessionId,
    payment_link: session.payment_link,
    payment_link_markdown: `[Click here to Pay on Razorpay](${session.payment_link})`,
    message: "Awaiting customer payment authorization.",
  }
}

async function executeTrackOrders(args: any) {
  const { order_id, mobile, email } = args
  let query = supabase.from("orders").select("*")

  if (order_id) {
    query = query.eq("external_id", order_id)
  } else if (mobile) {
    const cleanMobile = mobile.replace(/\D/g, "")
    query = query.ilike("shipping_address->>phone", `%${cleanMobile}%`)
  } else if (email) {
    query = query.ilike("shipping_address->>email", `%${email.trim()}%`)
  } else {
    throw new Error("Provide at least one lookup factor: order_id, mobile, or email")
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(5)
  if (error) throw error
  if (!data || data.length === 0) return { found: false, message: "No orders found matching details." }

  return {
    found: true,
    count: data.length,
    orders: data.map((o) => {
      const invoiceUrl = `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/a2a/invoice?order_id=${o.external_id}&download=true`
      const trackingUrl = `https://razent-merchant.vercel.app/?track=${o.external_id}`
      return {
        order_id: o.external_id,
        status: o.status,
        shipping_status: o.shipping_status || "dispatched",
        total: "₹" + ((o.total_paise || 0) / 100).toFixed(2),
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // GET: Health, Capabilities, or SSE
  if (req.method === "GET") {
    const accept = req.headers.get("accept") || ""
    if (accept.includes("text/event-stream")) {
      const body = `event: endpoint\ndata: ${req.url}\n\n`
      return new Response(body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    }

    return new Response(
      JSON.stringify(
        {
          name: "razent-commerce-mcp",
          version: "1.0.0",
          status: "online",
          transport: "Streamable HTTP (JSON-RPC 2.0)",
          mcp_version: "2024-11-05",
          description:
            "Official Razent Model Context Protocol (MCP) Quick Commerce Server. Search catalog, create checkout sessions with Razorpay payment links, and track orders with 10-15 min instant delivery.",
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
          storefront_url: "https://razent-merchant.vercel.app",
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
      return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error: empty body" }, id: null }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let payload
    try {
      payload = JSON.parse(bodyText)
    } catch {
      return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error: invalid JSON" }, id: null }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const isBatch = Array.isArray(payload)
    const requests = isBatch ? payload : [payload]
    const responses = []

    for (const rpc of requests) {
      const { id = null, method, params = {} } = rpc

      if (method === "initialize") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: params.protocolVersion || "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
              resources: { listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: "razent-commerce-mcp",
              version: "1.0.0",
            },
            instructions:
              "You are connected to the Razent Quick Commerce MCP Server (https://razent-merchant.vercel.app). " +
              "Help customers discover products across 10 aisles, prepare checkout sessions with Razorpay payment links, and track deliveries. " +
              "Never charge a customer automatically; always present the secure Razorpay payment link for human verification. " +
              "Format links cleanly as markdown buttons: [Click here to Pay ₹XX via Razorpay](url) and [Click here to Download Tax Invoice](url).",
          },
        })
        continue
      }

      if (method === "notifications/initialized" || method === "initialized") {
        if (id !== null) responses.push({ jsonrpc: "2.0", id, result: {} })
        continue
      }

      if (method === "ping") {
        responses.push({ jsonrpc: "2.0", id, result: {} })
        continue
      }

      if (method === "tools/list") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: { tools: TOOLS },
        })
        continue
      }

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
          } else {
            throw new Error(`Unknown tool: ${name}`)
          }

          responses.push({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult, null, 2),
                },
              ],
              isError: false,
            },
          })
        } catch (err: any) {
          responses.push({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: `Error: ${err?.message || String(err)}` }],
              isError: true,
            },
          })
        }
        continue
      }

      if (method === "prompts/list") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            prompts: [
              {
                name: "shopping_assistant",
                description: "Official instructions for acting as the Razent Quick Commerce Assistant",
                arguments: [],
              },
            ],
          },
        })
        continue
      }

      if (method === "prompts/get") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            description: "Razent Assistant Instructions",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "You are Razent AI, the official shopping and checkout assistant for Razent Storefront (https://razent-merchant.vercel.app). Help customers find items, prepare checkout, and track orders.",
                },
              },
            ],
          },
        })
        continue
      }

      if (method === "resources/list") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
            resources: [
              {
                uri: "razent://store/aisles",
                name: "Store Aisles",
                mimeType: "application/json",
                description: "10 active instant commerce categories",
              },
            ],
          },
        })
        continue
      }

      if (method === "resources/read") {
        responses.push({
          jsonrpc: "2.0",
          id,
          result: {
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
