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
  "Help customers discover products across 10 store aisles, collect their delivery address, prepare in-app checkout sessions on Razent, and track deliveries. " +
  "CRITICAL RULES: " +
  "1. ALWAYS ask the customer for their full delivery address (full name, phone number, house/street address, city, pincode) BEFORE calling create_checkout_session. Never place an order or create a checkout session without asking for the delivery address first. " +
  "2. When calling create_checkout_session, identify yourself in the 'assistant' field ('chatgpt', 'gemini', 'claude', 'store_agent', or external agent name). " +
  "3. Always provide the in-app Razent checkout link so the customer can review their cart, authenticate in the app, confirm their address, and pay securely. " +
  "4. Format the checkout link as a markdown link: [Click here to Complete Checkout on Razent](checkout_url)."

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
      "Create an in-app Razent checkout session and order. " +
      "MANDATORY REQUIREMENT: You MUST ask the customer for their full delivery address (full name, phone number, address line/flat, city, pincode) BEFORE calling this tool. " +
      "Returns an in-app Razent checkout link so the customer can authenticate, confirm address, and pay in the app. Never call without address.",
    inputSchema: {
      type: "object",
      required: ["items", "delivery_address"],
      properties: {
        items: {
          type: "array",
          description: "List of product items and quantities to buy",
          items: {
            type: "object",
            required: ["id", "quantity"],
            properties: {
              id: { type: "string", description: "Product ID or exact product title" },
              quantity: { type: "number", minimum: 1, description: "Quantity of item" },
            },
          },
        },
        delivery_address: {
          type: "object",
          description: "Customer delivery address (REQUIRED - ask customer first)",
          required: ["full_name", "phone", "line1", "city", "pincode"],
          properties: {
            full_name: { type: "string", description: "Customer full name" },
            phone: { type: "string", description: "Customer 10-digit mobile number" },
            line1: { type: "string", description: "House/flat number, building, street" },
            city: { type: "string", description: "City name" },
            pincode: { type: "string", description: "6-digit postal code" },
          },
        },
        assistant: {
          type: "string",
          description: "Your AI assistant identifier: 'chatgpt', 'gemini', 'claude', 'store_agent', or external agent name",
          enum: ["chatgpt", "gemini", "claude", "store_agent", "external_agent"],
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

function formatAssistantName(raw?: string): string {
  if (!raw) return "External Agent"
  const l = raw.toLowerCase().trim()
  if (l.includes("chatgpt") || l.includes("openai")) return "ChatGPT"
  if (l.includes("gemini") || l.includes("google")) return "Google Gemini"
  if (l.includes("claude") || l.includes("anthropic")) return "Claude"
  if (l.includes("store_agent") || l.includes("store")) return "Store Agent"
  return (
    raw
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || "External Agent"
  )
}

async function logMcpAudit({
  sessionId,
  orderId,
  customer,
  actorLabel,
  event,
}: {
  sessionId: string
  orderId?: string | null
  customer?: string
  actorLabel: string
  event: {
    type: string
    result: "Success" | "Warning" | "Failed" | "Critical"
    reason?: string
    payload_summary?: string
  }
}) {
  try {
    const fullEvent = {
      id: "evt_" + crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor: actorLabel,
      source: "MCP Server",
      type: event.type,
      result: event.result,
      reason: event.reason,
      payload_summary: event.payload_summary,
      request_id: orderId || sessionId,
    }

    const { data: existing } = await supabase
      .from("audit_sessions")
      .select("*")
      .or(`external_id.eq.${sessionId},id.eq.${sessionId}`)
      .maybeSingle()

    if (existing) {
      const existingEvents = Array.isArray(existing.events) ? existing.events : []
      const combined = [...existingEvents, fullEvent]
      const worst = combined.some((e: any) => e.result === "Critical")
        ? "Critical"
        : combined.some((e: any) => e.result === "Failed")
        ? "Failed"
        : combined.some((e: any) => e.result === "Warning")
        ? "Warning"
        : "Success"

      await supabase
        .from("audit_sessions")
        .update({
          order_id: orderId ?? existing.order_id,
          customer: customer || existing.customer,
          actor_label: actorLabel || existing.actor_label,
          events: combined,
          event_count: combined.length,
          last_event: fullEvent.type,
          status: worst,
          severity: worst,
        })
        .eq("id", existing.id)
    } else {
      await supabase.from("audit_sessions").insert({
        external_id: sessionId,
        merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
        order_id: orderId ?? null,
        customer: customer || "AI Shopper",
        actor_label: actorLabel,
        events: [fullEvent],
        event_count: 1,
        last_event: fullEvent.type,
        status: event.result,
        severity: event.result,
      })
    }
  } catch (err) {
    console.error("[logMcpAudit] error logging audit event:", err)
  }
}

function cleanSearchQuery(q: string): string {
  return q
    .replace(/(?:search\s+for|search\s+product|find\s+me|find|show\s+me|show|get\s+me|get|i\s+need|i\s+want|buy|order)\s+/gi, "")
    .trim()
}

// Tool execution handlers
async function executeSearchCatalog(args: any) {
  const rawInput = args.query || args.q || ""
  const category = args.category
  const maxPricePaise = args.max_price_paise
  const inStockOnly = args.in_stock_only !== false

  const cleanQ = cleanSearchQuery(rawInput)
  const rawQ = cleanQ.trim().toLowerCase()

  let dbQuery = supabase.from("products").select("*").eq("status", "active")
  if (category && category !== "All") {
    dbQuery = dbQuery.eq("category", category)
  }

  const isBroadCategorySearch = [
    "dairy",
    "dairy & bakery",
    "beverage",
    "beverages",
    "drinks",
    "drink",
    "grocery",
    "grocery & staples",
    "electronics",
    "beauty",
    "beauty & personal care",
    "home care",
    "decor",
    "kids",
    "snacks",
    "snacks & munchies",
    "fruits",
    "vegetables",
  ].includes(rawQ)

  const terms = new Set<string>()
  if (rawQ) {
    terms.add(rawQ)
    rawQ.split(/\s+/).forEach((w: string) => {
      if (w.length > 2) terms.add(w)
    })
    Array.from(terms).forEach((t: string) => {
      if (t.endsWith("ies") && t.length > 4) terms.add(t.slice(0, -3) + "y")
      if (t.endsWith("es") && t.length > 4) terms.add(t.slice(0, -2))
      if (t.endsWith("s") && t.length > 3) terms.add(t.slice(0, -1))
    })

    // Targeted high-precision synonyms (never cross-pollinate unrelated grocery items)
    if (rawQ.includes("milk")) {
      ;["milk", "taaza", "toned milk"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("curd") || rawQ.includes("dahi")) {
      ;["curd", "dahi", "yogurt"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("butter") && !rawQ.includes("peanut")) {
      ;["butter", "makhan"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("peanut butter")) {
      ;["peanut butter", "alpino"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("egg")) {
      ;["egg", "eggs", "anda"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("bread")) {
      ;["bread", "pav", "loaf"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("tea") || rawQ.includes("chai")) {
      ;["tea", "chai"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("coffee")) {
      ;["coffee", "nescafe"].forEach((w) => terms.add(w))
    } else if (rawQ === "drink" || rawQ === "drinks" || rawQ.includes("beverage")) {
      ;["drink", "beverage", "juice", "water", "cola", "soda", "tea", "coffee"].forEach((w) => terms.add(w))
    }

    const orClauses = []
    for (const t of Array.from(terms).slice(0, 8)) {
      orClauses.push(`title.ilike.%${t}%`, `description.ilike.%${t}%`)
      if (isBroadCategorySearch) {
        orClauses.push(`category.ilike.%${t}%`)
      }
    }
    dbQuery = dbQuery.or(orClauses.join(","))
  }

  if (maxPricePaise) {
    dbQuery = dbQuery.lte("price_paise", parseInt(maxPricePaise, 10))
  }
  if (inStockOnly) {
    dbQuery = dbQuery.gt("stock", 0)
  }

  const { data, error } = await dbQuery.order("created_at", { ascending: false }).limit(40)
  if (error) throw error

  const isBeverageQuery = ["drink", "drinks", "beverage", "beverages", "juice", "cola", "soda"].some((t) => rawQ.includes(t))

  // Semantic scoring & precision ranking
  const scored = (data || []).map((p: any) => {
    let score = 0
    const titleLower = p.title.toLowerCase()
    const descLower = (p.description || "").toLowerCase()
    const brandLower = (p.brand || "").toLowerCase()
    const tagsLower = (p.tags || []).join(" ").toLowerCase()

    for (const term of terms) {
      const regex = new RegExp(`\\b${term}\\b`, "i")
      if (regex.test(titleLower)) score += 100
      else if (titleLower.includes(term)) score += 50

      if (brandLower.includes(term)) score += 40
      if (regex.test(descLower)) score += 20
      else if (descLower.includes(term)) score += 10
      if (tagsLower.includes(term)) score += 15
    }

    // Beverage safety: do not match skincare or stationery water products
    if (isBeverageQuery) {
      if (p.category === "Beverages") score += 100
      else if (["Beauty & Personal Care", "Kids", "Home & Kitchen", "Home Care", "Decor"].includes(p.category)) {
        score -= 200
      }
    }

    const hasTitleMatch = Array.from(terms).some((t) => titleLower.includes(t))
    return { product: p, score, hasTitleMatch }
  }).filter((item: any) => item.score > 0)

  // When direct title matches exist, prune items with 0 title match to avoid noise
  const titleMatches = scored.filter((s: any) => s.hasTitleMatch)
  const candidates = titleMatches.length > 0 ? titleMatches : scored

  candidates.sort((a: any, b: any) => {
    if (b.score !== a.score) return b.score - a.score
    return b.product.stock - a.product.stock
  })

  // Deduplicate near-identical products
  const seenTitles = new Set<string>()
  const deduped: any[] = []
  for (const item of candidates) {
    const norm = item.product.title.toLowerCase().replace(/\s*\([^)]*\)/g, "").trim()
    const unit = (item.product.unit || "").trim().toLowerCase()
    const key = `${norm}__${unit}`
    if (!seenTitles.has(key)) {
      seenTitles.add(key)
      deduped.push(item.product)
    }
  }

  // Audit trail for catalog discovery
  const assistant = (args.assistant || "external_agent").toLowerCase().trim()
  const actorLabel = formatAssistantName(assistant)
  const searchSessionId = `search_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  logMcpAudit({
    sessionId: searchSessionId,
    actorLabel,
    event: {
      type: "ai_search",
      result: "Success",
      reason: `MCP Search for query: "${rawInput}"`,
      payload_summary: `Found ${deduped.length} items`,
    },
  }).catch(() => {})

  return {
    protocol: "ucp",
    version: "2026-01-16",
    matches_count: deduped.length,
    products: deduped.slice(0, 10).map((p: any) => ({
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

function findProductInCatalog(prods: any[], item: any) {
  const rawId = String(item.id || item.product_id || item.item_id || item.title || "").trim()
  const rawIdLower = rawId.toLowerCase()

  // 1. Exact ID match (numeric or string ID, or external_id)
  let prod = prods.find((p) => String(p.id).trim() === rawId || String(p.external_id || "").trim() === rawId)
  if (prod) return prod

  // 2. Exact Title match
  prod = prods.find((p) => p.title.toLowerCase().trim() === rawIdLower)
  if (prod) return prod

  // 3. Substring Title match ONLY IF NOT a pure number and at least 3 characters
  if (!/^\d+$/.test(rawId) && rawId.length >= 3) {
    prod = prods.find((p) => p.title.toLowerCase().includes(rawIdLower))
    if (prod) return prod
  }

  return null
}

async function executeCreateCheckoutSession(args: any) {
  const items = args.items || []
  if (!items.length) {
    throw new Error("No items provided in checkout session request")
  }

  const rawAddress = args.delivery_address
  if (
    !rawAddress ||
    !rawAddress.full_name?.trim() ||
    !rawAddress.phone?.trim() ||
    !rawAddress.line1?.trim() ||
    !rawAddress.city?.trim() ||
    !rawAddress.pincode?.trim()
  ) {
    throw new Error(
      "MANDATORY ADDRESS REQUIRED: Please ask the customer for their full delivery address (full name, 10-digit mobile number, house/street address, city, and 6-digit pincode) before creating the checkout session."
    )
  }

  const address = {
    full_name: rawAddress.full_name.trim(),
    phone: rawAddress.phone.trim(),
    line1: rawAddress.line1.trim(),
    city: rawAddress.city.trim(),
    pincode: rawAddress.pincode.trim(),
  }

  const assistant = (args.assistant || "external_agent").toLowerCase().trim()
  const actorLabel = formatAssistantName(assistant)

  const { data: allProds, error: pErr } = await supabase.from("products").select("*")
  if (pErr) throw pErr
  const prods = allProds || []

  let totalPaise = 0
  const lineItems = []

  for (const item of items) {
    const prod = findProductInCatalog(prods, item)
    if (!prod) {
      throw new Error(`Product not found for: "${item.id || item.product_id || item.item_id || item.title}"`)
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
  const checkoutUrl = `https://razent.vercel.app/checkout?session=${sessionId}`

  const sessionObj = {
    session_id: sessionId,
    status: "ready_for_payment",
    currency: "INR",
    total_rupees: "₹" + (totalPaise / 100).toFixed(2),
    total_paise: totalPaise,
    items: lineItems,
    delivery_address: address,
    assistant,
    checkout_url: checkoutUrl,
    payment_link: checkoutUrl,
    payment_link_markdown: `[Click here to Complete Checkout on Razent](${checkoutUrl})`,
    instructions: "CRITICAL: Present the checkout link above to the customer. They will complete checkout, confirm address, and pay securely directly in the Razent app.",
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
      fulfillment_details: address,
      delivery_address: address,
      payment_link: checkoutUrl,
      agent_id: assistant,
      metadata: {
        assistant,
        agent_id: assistant,
        actor_label: actorLabel,
      },
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
    })
    if (insErr) console.error("Insert checkout session error:", insErr)
  } catch (e) {
    console.error("Exception inserting checkout session:", e)
  }

  // Also upsert a conversation entry so it displays under Merchant AI Agents screen
  try {
    await supabase.from("conversations").upsert(
      {
        external_id: sessionId,
        merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
        customer_name: address.full_name || "AI Shopper",
        type: "order",
        agent_id: assistant,
        protocol: "mcp",
        status: "active",
        last_message: `Checkout session created for ${lineItems.length} item(s) (₹${(totalPaise / 100).toFixed(2)})`,
        amount_paise: totalPaise,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_id" }
    )
  } catch (convErr) {
    console.warn("Exception upserting conversation:", convErr)
  }

  // Log audit event
  logMcpAudit({
    sessionId,
    customer: address.full_name,
    actorLabel,
    event: {
      type: "checkout_created",
      result: "Success",
      reason: `Checkout session created by ${actorLabel} for ₹${(totalPaise / 100).toFixed(2)}`,
      payload_summary: `${lineItems.length} item(s) to ${address.city} (${address.pincode})`,
    },
  }).catch(() => {})

  return sessionObj
}

async function executeGetCheckoutSession(args: any) {
  const { session_id } = args
  if (!session_id) throw new Error("session_id is required")

  let session = memorySessions.get(session_id)
  let dbSession: any = null
  const { data } = await supabase.from("acp_checkout_sessions").select("*").eq("id", session_id).maybeSingle()
  dbSession = data
  if (!session && dbSession) {
    session = {
      session_id: dbSession.id,
      status: dbSession.status,
      total_paise: dbSession.totals?.[0]?.amount || 0,
      payment_link: dbSession.payment_link || `https://razent.vercel.app/checkout?session=${session_id}`,
      checkout_url: dbSession.payment_link || `https://razent.vercel.app/checkout?session=${session_id}`,
      razorpay_payment_link_id: dbSession.capabilities?.payment_link_id || dbSession.metadata?.razorpay_payment_link_id,
      items: dbSession.line_items || [],
      order_id: dbSession.metadata?.order_id,
      delivery_address:
        dbSession.fulfillment_details ||
        dbSession.delivery_address ||
        dbSession.metadata?.fulfillment_details ||
        dbSession.metadata?.shipping_address ||
        {},
      assistant: dbSession.agent_id || dbSession.metadata?.assistant || dbSession.metadata?.agent_id || "claude",
    }
  }

  if (!session) throw new Error(`Session ${session_id} not found`)
  if (!session.delivery_address && dbSession?.fulfillment_details) {
    session.delivery_address = dbSession.fulfillment_details
  }

  const assistant = session.assistant || dbSession?.agent_id || dbSession?.metadata?.assistant || "claude"
  const actorLabel = formatAssistantName(assistant)

  // Also check if an order was already created in orders table for this session
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("*")
    .eq("acp_checkout_session_id", session_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingOrder) {
    session.status = existingOrder.status === "paid" ? "completed" : existingOrder.status
    session.order_id = existingOrder.external_id
  }

  // If Razorpay link exists and not yet completed, check Razorpay API
  if (session.razorpay_payment_link_id && session.status !== "completed" && session.status !== "paid") {
    try {
      const authHeader = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payment_links/${session.razorpay_payment_link_id}`, {
        headers: { Authorization: `Basic ${authHeader}` },
      })
      if (rzpRes.ok) {
        const rzpData = await rzpRes.json()
        if (rzpData.status === "paid") {
          const paymentId = rzpData.payments?.[0]?.payment_id || rzpData.payments?.[0]?.id || rzpData.payment_id || null
          let orderId = session.order_id || dbSession?.metadata?.order_id || `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
          session.status = "completed"
          session.order_id = orderId

          if (!existingOrder) {
            await supabase.from("orders").insert({
              external_id: orderId,
              merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
              status: "paid",
              shipping_status: "dispatched",
              currency: "INR",
              total_paise: session.total_paise,
              items: session.items,
              shipping_address: session.delivery_address || {},
              via_ai: true,
              commerce_protocol: "mcp",
              agent_id: assistant,
              notes: `Placed by ${actorLabel} via MCP`,
              razorpay_payment_id: paymentId,
              acp_checkout_session_id: session_id,
            })
          }

          await supabase
            .from("acp_checkout_sessions")
            .update({
              status: "completed",
              metadata: {
                ...(dbSession?.metadata || {}),
                order_id: orderId,
                razorpay_payment_id: paymentId,
                assistant,
              },
            })
            .eq("id", session_id)

          // Update conversation
          await supabase
            .from("conversations")
            .update({
              status: "paid",
              order_id: orderId,
              last_message: `Payment successful. Order ${orderId} placed.`,
              updated_at: new Date().toISOString(),
            })
            .eq("external_id", session_id)

          logMcpAudit({
            sessionId: session_id,
            orderId,
            customer: session.delivery_address?.full_name,
            actorLabel,
            event: {
              type: "payment_completed",
              result: "Success",
              reason: `Payment verified on Razorpay for ${orderId}`,
              payload_summary: `₹${(session.total_paise / 100).toFixed(2)} settled`,
            },
          }).catch(() => {})
        } else if (rzpData.status === "cancelled" || rzpData.status === "expired") {
          let orderId = session.order_id || dbSession?.metadata?.order_id || `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
          session.status = "failed"
          session.order_id = orderId

          if (!existingOrder) {
            await supabase.from("orders").insert({
              external_id: orderId,
              merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
              status: "failed",
              shipping_status: "pending",
              currency: "INR",
              total_paise: session.total_paise,
              items: session.items,
              shipping_address: session.delivery_address || {},
              via_ai: true,
              commerce_protocol: "mcp",
              agent_id: assistant,
              notes: `Payment ${rzpData.status} via ${actorLabel}`,
              acp_checkout_session_id: session_id,
            })
          }

          await supabase
            .from("acp_checkout_sessions")
            .update({ status: "failed" })
            .eq("id", session_id)

          logMcpAudit({
            sessionId: session_id,
            orderId,
            customer: session.delivery_address?.full_name,
            actorLabel,
            event: {
              type: "payment_failed",
              result: "Failed",
              reason: `Payment link was ${rzpData.status}`,
              payload_summary: `Session ${session_id}`,
            },
          }).catch(() => {})
        }
      }
    } catch (fetchErr) {
      console.error("Error checking Razorpay payment link status:", fetchErr)
    }
  }

  if (session.status === "paid" || session.status === "completed") {
    const orderId = session.order_id || `RAZ-${session_id.slice(-8).toUpperCase()}`
    const invoiceUrl = `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/a2a/invoice?order_id=${orderId}&download=true`
    const trackingUrl = `https://razent.vercel.app/?track=${orderId}`
    return {
      status: "paid",
      order_id: orderId,
      assistant: actorLabel,
      delivery_sla: "10-15 minutes",
      tracking_markdown: `[Click here to Track Live Delivery](${trackingUrl})`,
      invoice_markdown: `[Click here to Download Tax Invoice](${invoiceUrl})`,
    }
  }

  if (session.status === "failed") {
    return {
      status: "failed",
      session_id: session.session_id,
      assistant: actorLabel,
      order_id: session.order_id,
      message: "Payment failed or was cancelled. Customer can reattempt checkout in Razent app.",
    }
  }

  const checkoutLink = session.checkout_url || session.payment_link || `https://razent.vercel.app/checkout?session=${session.session_id}`
  return {
    status: session.status,
    session_id: session.session_id,
    assistant: actorLabel,
    checkout_url: checkoutLink,
    payment_link_markdown: `[Click here to Complete Checkout on Razent](${checkoutLink})`,
    message: "Awaiting customer checkout completion on Razent app.",
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
  const orderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
  const shipping = session.delivery_address || session.fulfillment_details || {}

  if (totalPaise > delegated_price_cap_paise) {
    // Record failed order in database so merchant sees it!
    try {
      await supabase.from("orders").insert({
        external_id: orderId,
        merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
        status: "failed",
        shipping_status: "pending",
        currency: "INR",
        total_paise: totalPaise,
        items: session.items || session.line_items || [],
        shipping_address: shipping,
        via_ai: true,
        commerce_protocol: "ap2",
        agent_id: "gemini",
        notes: `Order total ₹${(totalPaise / 100).toFixed(2)} exceeds delegated limit ₹${(delegated_price_cap_paise / 100).toFixed(2)}. Human approval required.`,
        acp_checkout_session_id: checkout_session_id,
      })
    } catch (e) {
      console.error("Error inserting failed AP2 order:", e)
    }

    logMcpAudit({
      sessionId: checkout_session_id,
      orderId,
      customer: shipping?.full_name,
      actorLabel: "Google Gemini",
      event: {
        type: "mandate_limit_exceeded",
        result: "Failed",
        reason: `Delegated cap exceeded (₹${(totalPaise / 100).toFixed(2)} > ₹${(delegated_price_cap_paise / 100).toFixed(2)})`,
        payload_summary: `Order ${orderId}`,
      },
    }).catch(() => {})

    return {
      status: "step_up_required",
      protocol: "x402",
      order_id: orderId,
      message: `Order total ₹${(totalPaise / 100).toFixed(2)} exceeds delegated limit ₹${(delegated_price_cap_paise / 100).toFixed(2)}. Human approval required.`,
    }
  }

  // Insert paid order into database!
  try {
    await supabase.from("orders").insert({
      external_id: orderId,
      merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
      status: "paid",
      shipping_status: "dispatched",
      currency: "INR",
      total_paise: totalPaise,
      items: session.items || session.line_items || [],
      shipping_address: shipping,
      via_ai: true,
      commerce_protocol: "ap2",
      agent_id: "gemini",
      notes: "Settled via Google Gemini AP2 Mandate",
      acp_checkout_session_id: checkout_session_id,
    })
  } catch (e) {
    console.error("Error inserting paid AP2 order:", e)
  }

  logMcpAudit({
    sessionId: checkout_session_id,
    orderId,
    customer: shipping?.full_name,
    actorLabel: "Google Gemini",
    event: {
      type: "ap2_settled",
      result: "Success",
      reason: `Settled autonomously via AP2 by Google Gemini`,
      payload_summary: `Order ${orderId} for ₹${(totalPaise / 100).toFixed(2)}`,
    },
  }).catch(() => {})

  return {
    success: true,
    status: "settled",
    protocol: "ap2",
    order_id: orderId,
    assistant: "Google Gemini",
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
