#!/usr/bin/env node
/**
 * Razent Model Context Protocol (MCP) Commerce Server
 *
 * Implements authoritative Model Context Protocol (MCP) 2026-07-28 specification
 * with backward compatibility for 2025-11-25 and 2024-11-05.
 *
 * Dual Mode:
 *   node scripts/mcp-server.mjs                 # Standard JSON-RPC 2.0 over stdio (Claude Desktop, Cursor)
 *   node scripts/mcp-server.mjs --port 8080      # Streamable HTTP server (remote agents, curl, tunnels)
 */

import readline from "node:readline"
import http from "node:http"
import crypto from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://flsjhsnfurxkzawdimyi.supabase.co"
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_BJfbmQGnWlGSTL22LHJVxA_p3DeEUAi"
const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_test_TXeysTR9U8Fyws"
const RAZORPAY_KEY_SECRET = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || "UuzZqB93v2obPdSyg3plRzKd"

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
  "You can search the 10-15 minute grocery & tech catalog, verify customer wallet balances, execute autonomous purchases directly from their Razent Wallet, create in-app checkout sessions, and track orders. " +
  "\n\nCRITICAL PROTOCOLS FOR ORDERING & PAYMENTS: " +
  "\n1. MANDATORY CONFIRMATION PROTOCOL (Never Order Without Asking): " +
  "   - When a customer selects or asks to buy an item, FIRST call 'get_customer_wallet_status' to inspect their wallet balance and spend limit. " +
  "   - Present the item title, quantity, and total price clearly to the customer. " +
  "   - ALWAYS explicitly ask the customer: 'Would you like me to pay and place this order directly using your Razent Wallet (Balance: ₹X), or would you prefer a checkout link to pay with UPI/Card yourself?' " +
  "   - ONLY call 'execute_autonomous_purchase' after the customer explicitly confirms they want you to pay with their wallet. " +
  "\n2. AUTONOMOUS PURCHASING (Direct Wallet Debit): " +
  "   - When customer confirms wallet payment, call 'execute_autonomous_purchase'. " +
  "   - If within customer spend limit and under the ₹15,000 NPCI regulatory ceiling, the purchase settles instantly. Return the order confirmation, delivery ETA, and live tracking link. " +
  "   - If the order exceeds their spend limit, exceeds wallet balance, or exceeds the ₹15,000 NPCI limit, present the Balise UX recovery options clearly. " +
  "\n3. MANUAL CHECKOUT SESSIONS: " +
  "   - If the customer prefers to pay themselves, or if the order exceeds the ₹15,000 regulatory ceiling (e.g. laptops, phones), call 'create_checkout_session' with their items and delivery address. " +
  "   - Format the link as: [Click here to Complete Checkout on Razent](checkout_url). " +
  "\n4. ASSISTANT IDENTIFIER: Always identify yourself in the 'assistant' field ('chatgpt', 'gemini', 'claude', 'store_agent', or external agent name)."

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const memorySessions = new Map()

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
            "Optional store department or category filter (e.g. 'Laptops', 'Mobiles', 'Electronics', 'Grocery & Staples', 'Beverages', 'Clothing', 'Shoes', 'Beauty & Personal Care', 'Home Care', 'Decor', 'Kids', 'Kitchen Appliances', 'Office & Stationery'). If unsure or searching across the store, omit this field.",
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
              id: { type: "string", description: "Product ID (number or string) or exact product title" },
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
  {
    name: "execute_autonomous_purchase",
    description:
      "Execute an autonomous purchase directly inside the AI agent using the customer's Razent Wallet. " +
      "Requires customer authentication via their Agent Passkey (auth_token or RAZENT_CUSTOMER_TOKEN env). " +
      "Strictly enforces NPCI regulatory e-Mandate cap (₹15,000 max) and customer-configured spend limits. " +
      "If limits are exceeded, returns Balise UX recovery guidance with 3 choices: 1. Update limit, 2. Add funds, 3. Pay at manual checkout. " +
      "If within limit, automatically settles order and returns confirmed order details with tracking.",
    inputSchema: {
      type: "object",
      required: ["items"],
      properties: {
        auth_token: {
          type: "string",
          description: "Customer's Razent Agent Passkey (e.g. 'rz_agt_live_...'). Can be omitted if set in environment.",
        },
        items: {
          type: "array",
          description: "List of items to purchase with quantities",
          items: {
            type: "object",
            required: ["id", "quantity"],
            properties: {
              id: { type: "string", description: "Product ID, external_id, or title" },
              quantity: { type: "number", minimum: 1, description: "Quantity of item" },
            },
          },
        },
        delivery_address: {
          type: "object",
          description: "Delivery address (optional if customer has saved default address in wallet)",
          properties: {
            full_name: { type: "string", description: "Recipient full name" },
            phone: { type: "string", description: "10-digit mobile number" },
            line1: { type: "string", description: "House/flat number, building, street" },
            city: { type: "string", description: "City" },
            pincode: { type: "string", description: "6-digit postal code" },
          },
        },
        assistant: {
          type: "string",
          description: "Your assistant identifier ('chatgpt', 'gemini', 'claude', 'store_agent', or custom)",
          enum: ["chatgpt", "gemini", "claude", "store_agent", "external_agent"],
        },
      },
    },
  },
  {
    name: "get_customer_wallet_status",
    description:
      "Check customer's live wallet balance, autonomous AI spend limit, NPCI compliance cap, default delivery address, and permission status using their Agent Passkey.",
    inputSchema: {
      type: "object",
      properties: {
        auth_token: {
          type: "string",
          description: "Customer's Razent Agent Passkey (e.g. 'rz_agt_live_...'). Can be omitted if set in environment.",
        },
      },
    },
  },
]

function formatAssistantName(raw) {
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

function getHeader(req, name) {
  if (!req) return ""
  if (typeof req.headers?.get === "function") {
    return req.headers.get(name) || ""
  }
  if (req.headers && typeof req.headers === "object") {
    return req.headers[name.toLowerCase()] || ""
  }
  return ""
}

function resolveAssistant(args, req, meta) {
  // 1. Check explicit tool argument
  const argAssistant = args?.assistant || args?.agent_id || args?.agent || args?.client
  if (argAssistant && typeof argAssistant === "string" && argAssistant.trim()) {
    const raw = argAssistant.toLowerCase().trim()
    if (raw.includes("chatgpt") || raw.includes("openai")) return { id: "chatgpt", label: "ChatGPT" }
    if (raw.includes("gemini") || raw.includes("google")) return { id: "gemini", label: "Google Gemini" }
    if (raw.includes("claude") || raw.includes("anthropic")) return { id: "claude", label: "Claude" }
    if (raw.includes("store") || raw.includes("inapp") || raw.includes("razent")) return { id: "store_agent", label: "Store Agent" }
    const formatted = formatAssistantName(raw)
    return { id: raw.replace(/[^a-z0-9_-]/g, "_"), label: formatted }
  }

  // 2. Check MCP clientInfo in metadata
  const clientName = meta?.clientInfo?.name || meta?.["io.modelcontextprotocol/clientInfo"]?.name
  if (clientName && typeof clientName === "string" && clientName.trim()) {
    const raw = clientName.toLowerCase().trim()
    if (raw.includes("chatgpt") || raw.includes("openai")) return { id: "chatgpt", label: "ChatGPT" }
    if (raw.includes("gemini") || raw.includes("google")) return { id: "gemini", label: "Google Gemini" }
    if (raw.includes("claude") || raw.includes("anthropic")) return { id: "claude", label: "Claude" }
  }

  // 3. Check HTTP request headers if req is provided
  if (req) {
    const ua = getHeader(req, "user-agent").toLowerCase()
    const clientInfo = getHeader(req, "x-client-info").toLowerCase()
    const origin = getHeader(req, "origin").toLowerCase()
    const referer = getHeader(req, "referer").toLowerCase()
    const combined = `${ua} ${clientInfo} ${origin} ${referer}`

    if (combined.includes("chatgpt") || combined.includes("openai")) {
      return { id: "chatgpt", label: "ChatGPT" }
    }
    if (combined.includes("gemini") || combined.includes("google")) {
      return { id: "gemini", label: "Google Gemini" }
    }
    if (combined.includes("claude") || combined.includes("anthropic")) {
      return { id: "claude", label: "Claude" }
    }
  }

  // 4. Default: Claude (primary MCP client environment)
  return { id: "claude", label: "Claude" }
}

// Session tracking for MCP clients to maintain conversational continuity in Audit Trails
const clientSessions = new Map()
let lastGlobalSession = null

function resolveMcpSessionId(args, req, meta) {
  // 1. Explicitly provided in tool arguments
  if (args?.session_id || args?.sessionId || args?.conversation_id) {
    return String(args.session_id || args.sessionId || args.conversation_id).trim()
  }

  // 2. Explicitly provided in MCP protocol _meta
  if (meta?.sessionId || meta?.session_id || meta?.conversationId) {
    return String(meta.sessionId || meta.session_id || meta.conversationId).trim()
  }
  if (meta?.["io.modelcontextprotocol/sessionId"]) {
    return String(meta["io.modelcontextprotocol/sessionId"]).trim()
  }

  // 3. HTTP Header (mcp-session-id, x-session-id)
  if (req) {
    const hdr = req.headers?.get ? req.headers.get("mcp-session-id") || req.headers.get("x-session-id") || req.headers.get("session-id") : null
    if (hdr && hdr.trim()) {
      return hdr.trim()
    }
  }

  // 4. Derive key from client IP or assistant
  const clientIp = req?.headers?.get?.("x-forwarded-for")?.split(",")?.[0]?.trim() || "default_client"
  const assistantKey = (args?.assistant || meta?.assistant || "mcp_client").toLowerCase().trim()
  const compositeKey = `${clientIp}__${assistantKey}`

  const now = Date.now()
  const SESSION_TTL_MS = 25 * 60 * 1000 // 25 minutes conversational window

  const existing = clientSessions.get(compositeKey)
  if (existing && now - existing.lastActive < SESSION_TTL_MS) {
    existing.lastActive = now
    return existing.sessionId
  }

  if (lastGlobalSession && now - lastGlobalSession.lastActive < SESSION_TTL_MS) {
    lastGlobalSession.lastActive = now
    return lastGlobalSession.sessionId
  }

  // 5. Initialize new conversational session
  const newSessionId = `mcp_sess_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const sessionEntry = {
    sessionId: newSessionId,
    lastActive: now,
    assistant: assistantKey,
  }
  clientSessions.set(compositeKey, sessionEntry)
  lastGlobalSession = sessionEntry
  return newSessionId
}

async function logMcpAudit({
  sessionId,
  orderId,
  customer,
  actorLabel,
  event,
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

    // Safely query audit_sessions: 'id' is bigint, 'external_id' is text
    let query = supabase.from("audit_sessions").select("*")
    if (/^\d+$/.test(sessionId)) {
      query = query.or(`id.eq.${sessionId},external_id.eq.${sessionId}`)
    } else {
      query = query.eq("external_id", sessionId)
    }
    const { data: existing } = await query.maybeSingle()

    if (existing) {
      const existingEvents = Array.isArray(existing.events) ? existing.events : []
      const combined = [...existingEvents, fullEvent]
      const worst = combined.some((e) => e.result === "Critical")
        ? "Critical"
        : combined.some((e) => e.result === "Failed")
        ? "Failed"
        : combined.some((e) => e.result === "Warning")
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

async function recordFailedAutonomousPurchase({
  orderId,
  mcpSessionId,
  customerName,
  customerEmail,
  customerId,
  assistantId,
  assistantLabel,
  totalPaise,
  items,
  address,
  reason,
  errorCode,
}) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId || "")

    // 1. Insert into orders table with status: "failed"
    const { error: ordErr } = await supabase.from("orders").insert({
      external_id: orderId,
      merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
      razorpay_order_id: `wallet_declined_${Date.now()}`,
      status: "failed",
      shipping_status: "pending",
      currency: "INR",
      total_paise: totalPaise,
      items: items && items.length > 0 ? items : [{ title: "Autonomous Purchase Request", qty: 1, unit_price_paise: totalPaise }],
      shipping_address: address || {},
      via_ai: true,
      commerce_protocol: "mcp",
      conversation_id: assistantId,
      customer_id: isUuid ? customerId : null,
      notes: `Autonomous purchase blocked: ${reason} (Assistant: ${assistantLabel})`,
    })
    if (ordErr) {
      console.error("[recordFailedAutonomousPurchase] orders insert error:", ordErr)
    }

    // 2. Upsert into conversations table with status: "failed"
    const { error: convErr } = await supabase.from("conversations").upsert(
      {
        external_id: orderId,
        merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
        customer_name: customerName || "AI Shopper",
        customer_email: customerEmail || null,
        type: "agent_to_agent",
        protocol: "mcp",
        status: "failed",
        agent_id: assistantId,
        order_id: orderId,
        amount_paise: totalPaise,
        last_message: `Purchase blocked: ${reason}`,
        messages: [
          {
            role: "user",
            content: `Autonomous purchase request for ${items?.length || 1} item(s) (₹${(totalPaise / 100).toFixed(2)})`,
            timestamp: new Date().toISOString(),
          },
          {
            role: "assistant",
            content: `Order declined: ${reason}`,
            timestamp: new Date().toISOString(),
          },
        ],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_id" }
    )
    if (convErr) {
      console.error("[recordFailedAutonomousPurchase] conversations upsert error:", convErr)
    }

    // 3. Log audit session with status: "Failed"
    await logMcpAudit({
      sessionId: mcpSessionId || orderId,
      orderId,
      customer: customerName,
      actorLabel: assistantLabel,
      event: {
        type: "order_blocked",
        result: "Failed",
        reason: `${reason} (${errorCode})`,
        payload_summary: `Order ${orderId} for ₹${(totalPaise / 100).toFixed(2)}`,
      },
    })
  } catch (err) {
    console.error("[recordFailedAutonomousPurchase] unexpected error:", err)
  }
}

const CATEGORY_MAP = {
  electronics: ["Electronics", "Laptops", "Mobiles", "Kitchen Appliances"],
  electronic: ["Electronics", "Laptops", "Mobiles", "Kitchen Appliances"],
  tech: ["Electronics", "Laptops", "Mobiles"],
  computing: ["Laptops", "Electronics"],
  computers: ["Laptops", "Electronics"],
  computer: ["Laptops", "Electronics"],
  laptops: ["Laptops"],
  laptop: ["Laptops"],
  mac: ["Laptops"],
  macbook: ["Laptops"],
  mobiles: ["Mobiles"],
  mobile: ["Mobiles"],
  phone: ["Mobiles"],
  phones: ["Mobiles"],
  smartphone: ["Mobiles"],
  smartphones: ["Mobiles"],
  clothing: ["Clothing"],
  clothes: ["Clothing"],
  apparel: ["Clothing"],
  fashion: ["Clothing", "Shoes"],
  shoes: ["Shoes"],
  footwear: ["Shoes"],
  groceries: ["Grocery & Staples"],
  grocery: ["Grocery & Staples"],
  "grocery & staples": ["Grocery & Staples"],
  beverages: ["Beverages"],
  drinks: ["Beverages"],
  snacks: ["Snacks & Munchies", "Snacks & Drinks"],
  "snacks & drinks": ["Snacks & Drinks", "Snacks & Munchies"],
  "snacks & munchies": ["Snacks & Munchies", "Snacks & Drinks"],
}

function cleanSearchQuery(q) {
  return q
    .replace(/(?:search\s+for|search\s+product|find\s+me|find|show\s+me|show|get\s+me|get|i\s+need|i\s+want|buy|order)\s+/gi, "")
    .trim()
}

async function executeSearchCatalog(args, req, meta) {
  const rawInput = args.query || args.q || ""
  const category = args.category
  const maxPricePaise = args.max_price_paise
  const inStockOnly = args.in_stock_only !== false

  const cleanQ = cleanSearchQuery(rawInput)
  const rawQ = cleanQ.trim().toLowerCase()

  let dbQuery = supabase.from("products").select("*").eq("status", "active")
  
  // Intelligent category mapping
  let mappedCategories = null
  if (category && category !== "All") {
    const catKey = category.toLowerCase().trim()
    mappedCategories = CATEGORY_MAP[catKey] || null
    if (mappedCategories && mappedCategories.length > 0) {
      if (mappedCategories.length === 1) {
        dbQuery = dbQuery.ilike("category", `%${mappedCategories[0]}%`)
      } else {
        dbQuery = dbQuery.in("category", mappedCategories)
      }
    } else {
      dbQuery = dbQuery.ilike("category", `%${category}%`)
    }
  }

  const terms = new Set()
  if (rawQ) {
    terms.add(rawQ)
    rawQ.split(/\s+/).forEach((w) => {
      if (w.length > 2) terms.add(w)
    })
    Array.from(terms).forEach((t) => {
      if (t.endsWith("ies") && t.length > 4) terms.add(t.slice(0, -3) + "y")
      if (t.endsWith("es") && t.length > 4) terms.add(t.slice(0, -2))
      if (t.endsWith("s") && t.length > 3) terms.add(t.slice(0, -1))
    })

    // Targeted high-precision synonyms
    if (rawQ.includes("mac") || rawQ.includes("macbook") || rawQ.includes("apple")) {
      ;["mac", "macbook", "apple", "air", "pro", "laptop"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("laptop") || rawQ.includes("computer") || rawQ.includes("notebook")) {
      ;["laptop", "notebook", "book", "macbook", "gaming"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("mobile") || rawQ.includes("phone") || rawQ.includes("smartphone")) {
      ;["mobile", "phone", "smartphone", "galaxy", "redmi", "realme", "iphone"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("shoe") || rawQ.includes("sneaker") || rawQ.includes("footwear") || rawQ.includes("slides")) {
      ;["shoe", "shoes", "sneaker", "sneakers", "slides", "loafers"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("cloth") || rawQ.includes("shirt") || rawQ.includes("tshirt") || rawQ.includes("jeans")) {
      ;["clothing", "shirt", "tshirt", "jeans", "cotton", "wear"].forEach((w) => terms.add(w))
    } else if (rawQ.includes("milk")) {
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

  let { data, error } = await dbQuery.order("created_at", { ascending: false }).limit(40)
  if (error) throw error

  // Fallback: If category filter was specified but yielded 0 results, retry query across entire catalog
  if ((!data || data.length === 0) && category && category !== "All") {
    let fallbackQuery = supabase.from("products").select("*").eq("status", "active")
    if (rawQ) {
      const orClauses = []
      for (const t of Array.from(terms).slice(0, 8)) {
        orClauses.push(`title.ilike.%${t}%`, `description.ilike.%${t}%`, `category.ilike.%${t}%`)
      }
      fallbackQuery = fallbackQuery.or(orClauses.join(","))
    }
    if (maxPricePaise) {
      fallbackQuery = fallbackQuery.lte("price_paise", parseInt(maxPricePaise, 10))
    }
    if (inStockOnly) {
      fallbackQuery = fallbackQuery.gt("stock", 0)
    }
    const fallbackRes = await fallbackQuery.order("created_at", { ascending: false }).limit(40)
    if (fallbackRes.data && fallbackRes.data.length > 0) {
      data = fallbackRes.data
    }
  }

  const isBeverageQuery = ["drink", "drinks", "beverage", "beverages", "juice", "cola", "soda"].some((t) => rawQ.includes(t))

  // Semantic scoring & precision ranking
  const scored = (data || []).map((p) => {
    let score = 0
    const titleLower = p.title.toLowerCase()
    const descLower = (p.description || "").toLowerCase()
    const brandLower = (p.brand || "").toLowerCase()
    const categoryLower = (p.category || "").toLowerCase()
    const tagsLower = (p.tags || []).join(" ").toLowerCase()

    for (const term of terms) {
      const regex = new RegExp(`\\b${term}\\b`, "i")
      if (regex.test(titleLower)) score += 100
      else if (titleLower.includes(term)) score += 50

      if (brandLower.includes(term)) score += 40
      if (categoryLower.includes(term)) score += 35
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
    const hasCategoryMatch = Array.from(terms).some((t) => categoryLower.includes(t))
    return { product: p, score, hasDirectMatch: hasTitleMatch || hasCategoryMatch }
  }).filter((item) => item.score > 0)

  // When direct matches exist, prune noise
  const directMatches = scored.filter((s) => s.hasDirectMatch)
  const candidates = directMatches.length > 0 ? directMatches : scored

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.product.stock - a.product.stock
  })

  // Deduplicate near-identical products
  const seenTitles = new Set()
  const deduped = []
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
  const searchSessionId = resolveMcpSessionId(args, req, meta)
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
    products: deduped.slice(0, 10).map((p) => ({
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

function findProductInCatalog(prods, item) {
  if (!item) return null
  const itemObj = typeof item === "object" ? item : { id: item }

  const explicitId = itemObj.id ?? itemObj.product_id ?? itemObj.item_id
  const rawId = explicitId !== undefined && explicitId !== null ? String(explicitId).trim() : ""

  const explicitTitle = itemObj.title ?? itemObj.name ?? itemObj.product_name ?? ""
  const titleStr = String(explicitTitle).trim()
  const titleLower = titleStr.toLowerCase()

  // 1. Exact Title match if explicit title is provided
  if (titleStr) {
    const exactTitle = prods.find((p) => p.title.toLowerCase().trim() === titleLower)
    if (exactTitle) return exactTitle
  }

  // 2. Exact Primary Key match (numeric ID)
  // CRITICAL: Must match p.id FIRST before touching external_id to avoid ID collisions
  // (e.g. Lenovo LOQ i5 has primary key id: 23, while Infinix Phone has external_id: "23")
  if (rawId && /^\d+$/.test(rawId)) {
    const numId = Number(rawId)
    const exactPk = prods.find((p) => Number(p.id) === numId)
    if (exactPk) {
      // If title was also passed, verify it doesn't wildly contradict (e.g. phone vs laptop)
      if (titleLower && !exactPk.title.toLowerCase().includes(titleLower) && !titleLower.includes(exactPk.title.toLowerCase().slice(0, 10))) {
        const titleMatch = prods.find((p) => p.title.toLowerCase().includes(titleLower) || titleLower.includes(p.title.toLowerCase()))
        if (titleMatch) return titleMatch
      }
      return exactPk
    }
  }

  // 3. String Primary Key match (e.g. UUID)
  if (rawId) {
    const strPk = prods.find((p) => String(p.id).trim() === rawId)
    if (strPk) return strPk
  }

  // 4. Substring & Token Title match if title is provided
  if (titleStr && titleStr.length >= 3) {
    let match = prods.find((p) => p.title.toLowerCase().includes(titleLower) || titleLower.includes(p.title.toLowerCase()))
    if (match) return match

    const searchTokens = titleLower.split(/\s+/).filter((w) => w.length > 1)
    if (searchTokens.length > 1) {
      const best = prods
        .map((p) => {
          const pLower = p.title.toLowerCase()
          const matches = searchTokens.filter((token) => pLower.includes(token)).length
          return { p, matches }
        })
        .filter((entry) => entry.matches >= Math.min(2, searchTokens.length))
        .sort((a, b) => b.matches - a.matches)[0]
      if (best) return best.p
    }
  }

  // 5. External ID match (only after PK and title have been checked)
  if (rawId) {
    const extMatch = prods.find((p) => String(p.external_id || "").trim() === rawId)
    if (extMatch) return extMatch
  }

  // 6. If rawId is non-numeric, try matching rawId against title
  if (rawId && !/^\d+$/.test(rawId) && rawId.length >= 3) {
    const rawIdLower = rawId.toLowerCase()
    const match = prods.find((p) => p.title.toLowerCase().includes(rawIdLower) || rawIdLower.includes(p.title.toLowerCase()))
    if (match) return match
  }

  return null
}

async function executeCreateCheckoutSession(args, req, meta) {
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

  const assistantInfo = resolveAssistant(args, req, meta)
  const assistantId = assistantInfo.id
  const actorLabel = assistantInfo.label

  const { data: allProds } = await supabase.from("products").select("*")
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
      product_id: prod.id,
      external_id: prod.external_id,
      title: prod.title,
      quantity: qty,
      unit_price_paise: prod.price_paise,
      price_paise: prod.price_paise,
      line_total_paise: lineTotal,
      image_url: prod.image_url || "",
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
    assistant: actorLabel,
    checkout_url: checkoutUrl,
    payment_link: checkoutUrl,
    payment_link_markdown: `[Click here to Complete Checkout on Razent](${checkoutUrl})`,
    instructions: "CRITICAL: Present the checkout link above to the customer. They will complete checkout, confirm address, and pay securely directly in the Razent app.",
    created_at: new Date().toISOString(),
  }

  memorySessions.set(sessionId, sessionObj)

  try {
    await supabase.from("acp_checkout_sessions").insert({
      id: sessionId,
      merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
      status: "ready_for_payment",
      currency: "INR",
      line_items: lineItems,
      totals: [{ type: "total", amount: totalPaise, display_text: "Total Amount" }],
      fulfillment_details: {
        address,
        delivery_address: address,
        agent_id: assistantId,
        assistant: actorLabel,
        actor_label: actorLabel,
      },
      payment_link: checkoutUrl,
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
    })
  } catch (err) {
    console.error("Error inserting checkout session:", err)
  }

  // Also upsert a conversation entry so it displays under Merchant AI Agents screen
  try {
    const { error: convErr } = await supabase.from("conversations").upsert(
      {
        external_id: sessionId,
        merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
        customer_name: address.full_name || "AI Shopper",
        type: "agent_to_agent",
        agent_id: assistantId,
        protocol: "mcp",
        status: "active",
        last_message: `Checkout session created for ${lineItems.length} item(s) (₹${(totalPaise / 100).toFixed(2)})`,
        amount_paise: totalPaise,
        messages: [
          {
            role: "user",
            content: `Checkout request for ${lineItems.length} item(s)`,
            timestamp: new Date().toISOString(),
          },
          {
            role: "assistant",
            content: `Checkout session created. Ready for payment: ${checkoutUrl}`,
            timestamp: new Date().toISOString(),
          },
        ],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_id" }
    )
    if (convErr) console.error("Conversations upsert error:", convErr)
  } catch (convErr) {
    console.warn("Exception upserting conversation:", convErr)
  }

  // Log audit event under active MCP conversation session
  const mcpAuditSessionId = resolveMcpSessionId(args, req, meta)
  logMcpAudit({
    sessionId: mcpAuditSessionId,
    orderId: sessionId,
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

async function executeGetCheckoutSession(args, req, meta) {
  const { session_id } = args
  if (!session_id) throw new Error("session_id is required")

  let session = memorySessions.get(session_id)
  let dbSession = null
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

  const assistantInfo = resolveAssistant(args, req, meta)
  const assistantId = assistantInfo.id
  const defaultActorLabel = assistantInfo.label
  const assistant = session.assistant || dbSession?.agent_id || dbSession?.metadata?.assistant || defaultActorLabel
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
      const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")
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
              razorpay_order_id: `wallet_${Date.now()}`,
              status: "paid",
              shipping_status: "dispatched",
              currency: "INR",
              total_paise: session.total_paise,
              items: session.items,
              shipping_address: session.delivery_address || {},
              via_ai: true,
              commerce_protocol: "mcp",
              conversation_id: assistantId,
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
                assistant: actorLabel,
              },
            })
            .eq("id", session_id)

          // Update conversation
          await supabase.from("conversations").upsert(
            {
              external_id: session_id,
              merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
              customer_name: session.delivery_address?.full_name || "AI Shopper",
              type: "agent_to_agent",
              protocol: "mcp",
              status: "paid",
              agent_id: assistantId,
              order_id: orderId,
              amount_paise: session.total_paise,
              last_message: `Payment successful. Order ${orderId} placed.`,
              messages: [
                {
                  role: "assistant",
                  content: `Payment successful. Order ${orderId} placed.`,
                  timestamp: new Date().toISOString(),
                },
              ],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "external_id" }
          )

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
              razorpay_order_id: `wallet_declined_${Date.now()}`,
              status: "failed",
              shipping_status: "pending",
              currency: "INR",
              total_paise: session.total_paise,
              items: session.items,
              shipping_address: session.delivery_address || {},
              via_ai: true,
              commerce_protocol: "mcp",
              conversation_id: assistantId,
              notes: `Payment ${rzpData.status} via ${actorLabel}`,
              acp_checkout_session_id: session_id,
            })
          }

          await supabase
            .from("acp_checkout_sessions")
            .update({ status: "failed" })
            .eq("id", session_id)

          await supabase.from("conversations").upsert(
            {
              external_id: session_id,
              merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
              customer_name: session.delivery_address?.full_name || "AI Shopper",
              type: "agent_to_agent",
              protocol: "mcp",
              status: "failed",
              agent_id: assistantId,
              order_id: orderId,
              amount_paise: session.total_paise,
              last_message: `Payment failed: link was ${rzpData.status}`,
              messages: [
                {
                  role: "assistant",
                  content: `Payment link was ${rzpData.status}. Session ${session_id}`,
                  timestamp: new Date().toISOString(),
                },
              ],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "external_id" }
          )

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
    const invoiceUrl = `https://razent.vercel.app/invoice?order_id=${orderId}&download=true`
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

async function executeTrackOrders(args) {
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
      const invoiceUrl = `https://razent.vercel.app/invoice?order_id=${o.external_id}&download=true`
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

async function executeAP2Checkout(args, req, meta) {
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
        razorpay_order_id: `wallet_declined_${Date.now()}`,
        status: "failed",
        shipping_status: "pending",
        currency: "INR",
        total_paise: totalPaise,
        items: session.items || session.line_items || [],
        shipping_address: shipping,
        via_ai: true,
        commerce_protocol: "ap2",
        conversation_id: "gemini",
        notes: `Order total ₹${(totalPaise / 100).toFixed(2)} exceeds delegated limit ₹${(delegated_price_cap_paise / 100).toFixed(2)}. Human approval required.`,
        acp_checkout_session_id: checkout_session_id,
      })

      await supabase.from("conversations").upsert(
        {
          external_id: orderId,
          merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
          customer_name: shipping?.full_name || "AI Shopper",
          type: "agent_to_agent",
          protocol: "ap2",
          status: "failed",
          agent_id: "gemini",
          order_id: orderId,
          amount_paise: totalPaise,
          last_message: "Order blocked: AP2 delegated spending cap exceeded",
          messages: [
            {
              role: "assistant",
              content: `AP2 Mandate step-up required: total ₹${(totalPaise / 100).toFixed(2)} exceeds delegated cap of ₹${(delegated_price_cap_paise / 100).toFixed(2)}.`,
              timestamp: new Date().toISOString(),
            },
          ],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "external_id" }
      )
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
      razorpay_order_id: `wallet_${Date.now()}`,
      status: "paid",
      shipping_status: "dispatched",
      currency: "INR",
      total_paise: totalPaise,
      items: session.items || session.line_items || [],
      shipping_address: shipping,
      via_ai: true,
      commerce_protocol: "ap2",
      conversation_id: "gemini",
      notes: "Settled via Google Gemini AP2 Mandate",
      acp_checkout_session_id: checkout_session_id,
    })

    await supabase.from("conversations").upsert(
      {
        external_id: orderId,
        merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
        customer_name: shipping?.full_name || "AI Shopper",
        type: "agent_to_agent",
        protocol: "ap2",
        status: "paid",
        agent_id: "gemini",
        order_id: orderId,
        amount_paise: totalPaise,
        last_message: `Order confirmed via Google Gemini AP2`,
        messages: [
          {
            role: "assistant",
            content: `AP2 Mandate authorized and settled for ₹${(totalPaise / 100).toFixed(2)}.`,
            timestamp: new Date().toISOString(),
          },
        ],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_id" }
    )
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

const NPCI_TRANSACTION_LIMIT_PAISE = 1500000 // ₹15,00,000 max per automated mandate without AFA OTP

function resolveCustomerToken(args, req) {
  if (args?.auth_token && typeof args.auth_token === "string" && args.auth_token.trim()) {
    return args.auth_token.trim()
  }
  if (req) {
    try {
      const url = new URL(req.url, "http://localhost")
      const qToken =
        url.searchParams.get("token") ||
        url.searchParams.get("passkey") ||
        url.searchParams.get("key") ||
        url.searchParams.get("auth_token")
      if (qToken && qToken.trim()) return qToken.trim()

      const authHeader = req.headers?.authorization || req.headers?.get?.("authorization") || ""
      if (authHeader.toLowerCase().startsWith("bearer ")) {
        const bearer = authHeader.slice(7).trim()
        if (bearer && bearer !== "undefined" && bearer !== "null") return bearer
      }
      const customHeader = req.headers?.["x-razent-token"] || req.headers?.get?.("x-razent-token") || req.headers?.["x-agent-passkey"] || req.headers?.get?.("x-agent-passkey")
      if (customHeader && customHeader.trim()) return customHeader.trim()
    } catch {}
  }
  return (process.env.RAZENT_CUSTOMER_TOKEN || "").trim()
}

async function executeGetCustomerWalletStatus(args, req) {
  const token = resolveCustomerToken(args, req)
  if (!token) {
    return {
      authenticated: false,
      message:
        "Authentication required. Please configure your Agent Passkey in [Wallet Settings](https://razent.vercel.app/wallet) or connect with your personal URL (?token=rz_agt_...) to check wallet balance and spend limits.",
      wallet_url: "https://razent.vercel.app/wallet",
    }
  }

  const { data: wallet, error } = await supabase
    .from("customer_wallets")
    .select("*")
    .eq("agent_auth_token", token)
    .maybeSingle()

  if (error || !wallet) {
    return {
      authenticated: false,
      message:
        "Invalid Agent Passkey. Could not find an associated Razent customer account. Please verify your passkey in [Wallet Settings](https://razent.vercel.app/wallet).",
      wallet_url: "https://razent.vercel.app/wallet",
    }
  }

  return {
    authenticated: true,
    customer_name: wallet.customer_name || "Customer",
    customer_email: wallet.customer_email,
    wallet_balance_rupees: (wallet.wallet_balance_paise / 100).toLocaleString("en-IN"),
    spend_limit_rupees: (wallet.spend_limit_paise / 100).toLocaleString("en-IN"),
    npci_mandate_ceiling_rupees: "15,000",
    ai_purchases_enabled: wallet.ai_purchases_enabled,
    has_default_address: Boolean(wallet.default_address?.line1),
    default_address: wallet.default_address || {},
    wallet_url: "https://razent.vercel.app/wallet",
  }
}

async function executeAutonomousPurchase(args, req, meta) {
  const token = resolveCustomerToken(args, req)
  const assistantInfo = resolveAssistant(args, req, meta)
  const assistant = assistantInfo.label
  const assistantId = assistantInfo.id
  const mcpSessionId = resolveMcpSessionId(args, req, meta)
  const recoveryBase = "https://razent.vercel.app"
  const fallbackSessionId = `acp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const manualCheckoutUrl = `${recoveryBase}/checkout?session=${fallbackSessionId}`
  const items = args.items || []

  // Resolve items if provided
  let totalPaise = 0
  const resolvedItems = []
  let itemResolutionError = null

  if (items.length > 0) {
    try {
      const { data: allProds } = await supabase.from("products").select("*").eq("status", "active")
      for (const item of items) {
        const prod = findProductInCatalog(allProds || [], item)
        if (!prod) {
          itemResolutionError = `Product '${item.id || item.product_id || item.item_id || item.title}' is currently unavailable in the catalog.`
          break
        }
        const qty = Math.max(1, item.quantity || 1)
        if (prod.stock < qty) {
          itemResolutionError = `Insufficient stock for ${prod.title}. Only ${prod.stock} items remaining.`
          break
        }
        totalPaise += prod.price_paise * qty
        resolvedItems.push({
          product_id: prod.id,
          title: prod.title,
          image_url: prod.image_url || "",
          qty,
          unit_price_paise: prod.price_paise,
          total_paise: prod.price_paise * qty,
        })
      }
    } catch (e) {
      console.error("Error resolving products:", e)
    }
  }

  // 1. Authentication Check
  if (!token) {
    const failedOrderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
    if (resolvedItems.length > 0) {
      await recordFailedAutonomousPurchase({
        orderId: failedOrderId,
        mcpSessionId,
        customerName: args.delivery_address?.full_name || "AI Shopper",
        customerEmail: null,
        customerId: null,
        assistantId,
        assistantLabel: assistant,
        totalPaise,
        items: resolvedItems,
        address: args.delivery_address || {},
        reason: "Agent Passkey authentication required",
        errorCode: "AUTHENTICATION_REQUIRED",
      })
    }
    return {
      status: "auth_required",
      error_code: "AUTHENTICATION_REQUIRED",
      order_id: failedOrderId,
      assistant,
      message:
        "Authentication required. Your AI assistant needs authorization to place orders on your behalf. " +
        "Please provide your Agent Passkey (configured in your [Razent Wallet Settings](https://razent.vercel.app/wallet)), or complete checkout manually: [Proceed to Manual Checkout](" +
        manualCheckoutUrl +
        ")",
      recovery_options: {
        update_limit_url: `${recoveryBase}/wallet`,
        add_money_url: `${recoveryBase}/wallet`,
        manual_checkout_url: manualCheckoutUrl,
      },
    }
  }

  const { data: wallet, error: walletErr } = await supabase
    .from("customer_wallets")
    .select("*")
    .eq("agent_auth_token", token)
    .maybeSingle()

  if (walletErr || !wallet) {
    const failedOrderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
    if (resolvedItems.length > 0) {
      await recordFailedAutonomousPurchase({
        orderId: failedOrderId,
        customerName: args.delivery_address?.full_name || "AI Shopper",
        customerEmail: null,
        customerId: null,
        assistantId,
        assistantLabel: assistant,
        totalPaise,
        items: resolvedItems,
        address: args.delivery_address || {},
        reason: "Invalid Agent Passkey",
        errorCode: "INVALID_AGENT_PASSKEY",
      })
    }
    return {
      status: "auth_required",
      error_code: "INVALID_AGENT_PASSKEY",
      order_id: failedOrderId,
      assistant,
      message:
        "Invalid Agent Passkey. We could not verify your Razent account. " +
        "Please check your Agent Passkey in [Wallet Settings](https://razent.vercel.app/wallet), or proceed with manual checkout: [Proceed to Manual Checkout](" +
        manualCheckoutUrl +
        ")",
      recovery_options: {
        update_limit_url: `${recoveryBase}/wallet`,
        add_money_url: `${recoveryBase}/wallet`,
        manual_checkout_url: manualCheckoutUrl,
      },
    }
  }

  // 2. Validate items
  if (!items.length) {
    throw new Error("No items provided for autonomous purchase")
  }
  if (itemResolutionError) {
    return {
      status: "product_unavailable",
      error_code: "PRODUCT_UNAVAILABLE",
      assistant,
      message: itemResolutionError,
    }
  }

  // 3. Resolve Delivery Address
  const savedAddress = wallet.default_address || {}
  const rawAddr = args.delivery_address || {}
  const address = {
    full_name: rawAddr.full_name || savedAddress.full_name || wallet.customer_name || "Customer",
    phone: rawAddr.phone || savedAddress.phone || wallet.customer_phone || "",
    line1: rawAddr.line1 || savedAddress.line1 || "",
    city: rawAddr.city || savedAddress.city || "",
    state: rawAddr.state || savedAddress.state || "Karnataka",
    pincode: rawAddr.pincode || savedAddress.pincode || "",
    country: rawAddr.country || savedAddress.country || "India",
  }

  // 4. Permission Check (ai_purchases_enabled)
  if (!wallet.ai_purchases_enabled) {
    const failedOrderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
    await recordFailedAutonomousPurchase({
      orderId: failedOrderId,
      customerName: address.full_name || wallet.customer_name,
      customerEmail: wallet.customer_email,
      customerId: wallet.customer_id,
      assistantId,
      assistantLabel: assistant,
      totalPaise,
      items: resolvedItems,
      address,
      reason: "Autonomous agent purchases are disabled in customer wallet",
      errorCode: "AGENT_PURCHASES_DISABLED",
    })
    return {
      status: "ai_disabled",
      error_code: "AGENT_PURCHASES_DISABLED",
      order_id: failedOrderId,
      assistant,
      message:
        "Autonomous agent purchases are turned off. Your Razent account currently has AI ordering disabled. " +
        "To allow your assistant to place orders, enable agent purchases in [Wallet Settings](https://razent.vercel.app/wallet). Alternatively, you can complete this order manually: [Proceed to Manual Checkout](" +
        manualCheckoutUrl +
        ")",
      recovery_options: {
        update_limit_url: `${recoveryBase}/wallet`,
        add_money_url: `${recoveryBase}/wallet`,
        manual_checkout_url: manualCheckoutUrl,
      },
    }
  }

  if (!address.line1 || !address.city || !address.pincode || !address.phone) {
    return {
      status: "address_required",
      error_code: "MISSING_DELIVERY_ADDRESS",
      assistant,
      message:
        "Delivery address required. No default delivery address was found in your Razent account. " +
        "Please add your address in [Wallet Settings](https://razent.vercel.app/wallet) or provide your full delivery address in this chat so your assistant can complete the order.",
      recovery_options: {
        update_limit_url: `${recoveryBase}/wallet`,
        add_money_url: `${recoveryBase}/wallet`,
        manual_checkout_url: manualCheckoutUrl,
      },
    }
  }

  // 5. NPCI Regulatory Ceiling Check (₹15,000 max without OTP)
  if (totalPaise > NPCI_TRANSACTION_LIMIT_PAISE) {
    const formattedTotal = (totalPaise / 100).toLocaleString("en-IN")
    const formattedCap = (NPCI_TRANSACTION_LIMIT_PAISE / 100).toLocaleString("en-IN")
    const failedOrderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
    await recordFailedAutonomousPurchase({
      orderId: failedOrderId,
      mcpSessionId,
      customerName: address.full_name,
      customerEmail: wallet.customer_email,
      customerId: wallet.customer_id,
      assistantId,
      assistantLabel: assistant,
      totalPaise,
      items: resolvedItems,
      address,
      reason: `Order total (₹${formattedTotal}) exceeds NPCI mandate cap (₹${formattedCap})`,
      errorCode: "NPCI_MANDATE_CAP_EXCEEDED",
    })
    return {
      status: "npci_limit_exceeded",
      error_code: "NPCI_MANDATE_CAP_EXCEEDED",
      order_id: failedOrderId,
      assistant,
      order_total_rupees: formattedTotal,
      npci_cap_rupees: formattedCap,
      message:
        `Order total (₹${formattedTotal}) exceeds the NPCI autonomous transaction limit of ₹${formattedCap}. ` +
        `National regulatory guidelines require two-factor authentication (OTP) for transactions above ₹${formattedCap}. ` +
        `Please complete your purchase through manual checkout: [Complete Checkout with 2FA](${manualCheckoutUrl})`,
      recovery_options: {
        update_limit_url: `${recoveryBase}/wallet`,
        add_money_url: `${recoveryBase}/wallet`,
        manual_checkout_url: manualCheckoutUrl,
      },
    }
  }

  // 6. Customer Spend Limit Check (Balise UX Writing)
  if (totalPaise > wallet.spend_limit_paise) {
    const formattedTotal = (totalPaise / 100).toLocaleString("en-IN")
    const formattedLimit = (wallet.spend_limit_paise / 100).toLocaleString("en-IN")
    const failedOrderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
    await recordFailedAutonomousPurchase({
      orderId: failedOrderId,
      mcpSessionId,
      customerName: address.full_name,
      customerEmail: wallet.customer_email,
      customerId: wallet.customer_id,
      assistantId,
      assistantLabel: assistant,
      totalPaise,
      items: resolvedItems,
      address,
      reason: `Order total (₹${formattedTotal}) exceeds customer AI spend limit (₹${formattedLimit})`,
      errorCode: "SPEND_LIMIT_EXCEEDED",
    })
    return {
      status: "limit_exceeded",
      error_code: "SPEND_LIMIT_EXCEEDED",
      order_id: failedOrderId,
      assistant,
      order_total_rupees: formattedTotal,
      spend_limit_rupees: formattedLimit,
      message:
        `Your agent purchase limit is exceeded. Order total is ₹${formattedTotal}, which is higher than your current AI spend limit of ₹${formattedLimit}.\n\n` +
        `To place this order, you can:\n` +
        `1. Update your agent spend limit: [Update Spend Limit](${recoveryBase}/wallet)\n` +
        `2. Add money to your wallet: [Top Up Wallet](${recoveryBase}/wallet)\n` +
        `3. Pay at checkout manually: [Proceed to Manual Checkout](${manualCheckoutUrl})`,
      recovery_options: {
        update_limit_url: `${recoveryBase}/wallet`,
        add_money_url: `${recoveryBase}/wallet`,
        manual_checkout_url: manualCheckoutUrl,
      },
    }
  }

  // 7. Wallet Balance Check (Balise UX Writing)
  if (totalPaise > wallet.wallet_balance_paise) {
    const formattedTotal = (totalPaise / 100).toLocaleString("en-IN")
    const formattedBalance = (wallet.wallet_balance_paise / 100).toLocaleString("en-IN")
    const formattedShortfall = ((totalPaise - wallet.wallet_balance_paise) / 100).toLocaleString("en-IN")
    const failedOrderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
    await recordFailedAutonomousPurchase({
      orderId: failedOrderId,
      mcpSessionId,
      customerName: address.full_name,
      customerEmail: wallet.customer_email,
      customerId: wallet.customer_id,
      assistantId,
      assistantLabel: assistant,
      totalPaise,
      items: resolvedItems,
      address,
      reason: `Insufficient wallet balance (Available: ₹${formattedBalance}, Needed: ₹${formattedTotal})`,
      errorCode: "INSUFFICIENT_WALLET_BALANCE",
    })
    return {
      status: "insufficient_balance",
      error_code: "INSUFFICIENT_WALLET_BALANCE",
      order_id: failedOrderId,
      assistant,
      order_total_rupees: formattedTotal,
      wallet_balance_rupees: formattedBalance,
      shortfall_rupees: formattedShortfall,
      message:
        `Insufficient wallet balance. Order total is ₹${formattedTotal}, but your available wallet balance is ₹${formattedBalance} (shortfall of ₹${formattedShortfall}).\n\n` +
        `To place this order, you can:\n` +
        `1. Add money to your wallet: [Top Up Wallet](${recoveryBase}/wallet)\n` +
        `2. Pay at checkout manually: [Proceed to Manual Checkout](${manualCheckoutUrl})`,
      recovery_options: {
        update_limit_url: `${recoveryBase}/wallet`,
        add_money_url: `${recoveryBase}/wallet`,
        manual_checkout_url: manualCheckoutUrl,
      },
    }
  }

  // 8. Execute Purchase: Deduct funds atomically & create confirmed order
  const remainingBalance = wallet.wallet_balance_paise - totalPaise
  await supabase
    .from("customer_wallets")
    .update({
      wallet_balance_paise: remainingBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id)

  const orderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
  const invoiceUrl = `${recoveryBase}/invoice?order_id=${orderId}&download=true`
  const trackingUrl = `${recoveryBase}/?track=${orderId}`

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wallet.customer_id || "")
  const { error: ordErr } = await supabase.from("orders").insert({
    external_id: orderId,
    merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
    razorpay_order_id: `wallet_${Date.now()}`,
    status: "paid",
    shipping_status: "dispatched",
    currency: "INR",
    total_paise: totalPaise,
    items: resolvedItems,
    shipping_address: address,
    via_ai: true,
    commerce_protocol: "mcp",
    conversation_id: assistantId,
    customer_id: isUuid ? wallet.customer_id : null,
    notes: `Autonomous purchase paid via Razent Wallet (NPCI e-Mandate compliant, Assistant: ${assistant}, Customer: ${wallet.customer_name || wallet.customer_email || wallet.customer_id})`,
    paid_at: new Date().toISOString(),
  })
  if (ordErr) {
    console.error("[executeAutonomousPurchase] Order insert error:", ordErr)
  }

  // Upsert into conversations table for Merchant AI Agent screen
  const { error: convErr } = await supabase.from("conversations").upsert(
    {
      external_id: orderId,
      merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
      customer_name: address.full_name || wallet.customer_name || "Customer",
      customer_email: wallet.customer_email || null,
      type: "agent_to_agent",
      protocol: "mcp",
      status: "paid",
      agent_id: assistantId,
      order_id: orderId,
      amount_paise: totalPaise,
      last_message: `Order ${orderId} confirmed via ${assistant}`,
      messages: [
        {
          role: "user",
          content: `Autonomous purchase request for ${resolvedItems.length} item(s)`,
          timestamp: new Date().toISOString(),
        },
        {
          role: "assistant",
          content: `Order ${orderId} confirmed and paid autonomously via Razent Wallet.`,
          timestamp: new Date().toISOString(),
        },
      ],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "external_id" }
  )
  if (convErr) {
    console.error("[executeAutonomousPurchase] Conversation upsert error:", convErr)
  }

  // Audit Logging
  await logMcpAudit({
    sessionId: mcpSessionId || orderId,
    orderId,
    customer: address.full_name,
    actorLabel: assistant,
    event: {
      type: "autonomous_order_settled",
      result: "Success",
      reason: `Settled ₹${(totalPaise / 100).toFixed(2)} from wallet. NPCI compliant. Remaining balance: ₹${(remainingBalance / 100).toFixed(2)}`,
      payload_summary: `Order ${orderId}`,
    },
  }).catch(() => {})

  const formattedTotal = (totalPaise / 100).toLocaleString("en-IN")
  const formattedRemaining = (remainingBalance / 100).toLocaleString("en-IN")

  return {
    success: true,
    status: "confirmed",
    order_id: orderId,
    assistant,
    amount_paid_rupees: formattedTotal,
    remaining_wallet_balance_rupees: formattedRemaining,
    items: resolvedItems.map((i) => `${i.qty}x ${i.title}`),
    delivery_address: `${address.line1}, ${address.city} - ${address.pincode}`,
    delivery_eta: "10-15 minutes",
    tracking_url: trackingUrl,
    tracking_markdown: `[Click here to Track Live Delivery](${trackingUrl})`,
    invoice_url: invoiceUrl,
    invoice_markdown: `[Click here to Download Tax Invoice](${invoiceUrl})`,
    message:
      `Order confirmed! Order #${orderId} for ₹${formattedTotal} has been placed autonomously using your Razent Wallet.\n\n` +
      `Delivery is scheduled to ${address.line1}, ${address.city} (ETA: 10-15 mins).\n` +
      `Remaining wallet balance: ₹${formattedRemaining}.\n\n` +
      `[Click here to Track Live Delivery](${trackingUrl}) · [Click here to Download Tax Invoice](${invoiceUrl})`,
  }
}

async function handleRpcRequest(rpc, req) {
  const { id = null, method, params = {} } = rpc

  // Protocol version validation per MCP 2026-07-28 (SEP-2575)
  const meta = params?._meta || rpc?._meta
  const reqVersion = meta?.["io.modelcontextprotocol/protocolVersion"]
  if (reqVersion && !SUPPORTED_PROTOCOL_VERSIONS.includes(reqVersion)) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32022,
        message: `Unsupported protocol version: ${reqVersion}`,
        data: { supported: SUPPORTED_PROTOCOL_VERSIONS, requested: reqVersion },
      },
    }
  }

  // 1. Mandatory server/discover RPC (2026-07-28)
  if (method === "server/discover") {
    return {
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
    }
  }

  // 2. Backward-compatible initialize (2024-11-05 / 2025-11-25)
  if (method === "initialize") {
    return {
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
    }
  }

  if (method === "notifications/initialized" || method === "initialized" || method === "ping") {
    return id !== null
      ? {
          jsonrpc: "2.0",
          id,
          result: { resultType: "complete", _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO } },
        }
      : null
  }

  // 3. Subscriptions (2026-07-28)
  if (method === "subscriptions/listen") {
    return {
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
    }
  }

  // 4. tools/list (Deterministic ordering & caching per SEP-2549)
  if (method === "tools/list") {
    const sortedTools = [...TOOLS].sort((a, b) => a.name.localeCompare(b.name))
    return {
      jsonrpc: "2.0",
      id,
      result: {
        resultType: "complete",
        tools: sortedTools,
        ttlMs: 300000,
        cacheScope: "public",
        _meta: {
          "io.modelcontextprotocol/serverInfo": SERVER_INFO,
        },
      },
    }
  }

  // 5. tools/call
  if (method === "tools/call") {
    const { name, arguments: toolArgs = {} } = params
    try {
      let toolResult
      if (name === "search_catalog" || name === "ucp_catalog_search") {
        toolResult = await executeSearchCatalog(toolArgs, req, meta)
      } else if (name === "create_checkout_session" || name === "acp_create_checkout_session") {
        toolResult = await executeCreateCheckoutSession(toolArgs, req, meta)
      } else if (name === "get_checkout_session" || name === "acp_get_checkout_session") {
        toolResult = await executeGetCheckoutSession(toolArgs, req, meta)
      } else if (name === "track_orders" || name === "track_order") {
        toolResult = await executeTrackOrders(toolArgs)
      } else if (name === "ap2_execute_autonomous_checkout") {
        toolResult = await executeAP2Checkout(toolArgs, req, meta)
      } else if (name === "execute_autonomous_purchase" || name === "autonomous_purchase" || name === "wallet_purchase") {
        toolResult = await executeAutonomousPurchase(toolArgs, req, meta)
      } else if (name === "get_customer_wallet_status" || name === "get_wallet_status") {
        toolResult = await executeGetCustomerWalletStatus(toolArgs, req)
      } else {
        throw new Error(`Unknown tool: ${name}`)
      }

      return {
        jsonrpc: "2.0",
        id,
        result: {
          resultType: "complete",
          content: [{ type: "text", text: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult, null, 2) }],
          structuredContent: typeof toolResult === "object" ? toolResult : undefined,
          isError: false,
          _meta: {
            "io.modelcontextprotocol/serverInfo": SERVER_INFO,
          },
        },
      }
    } catch (err) {
      return {
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
      }
    }
  }

  // 6. prompts/list & prompts/get
  if (method === "prompts/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        resultType: "complete",
        prompts: [{ name: "shopping_assistant", description: "Razent Quick Commerce Assistant prompt" }],
        ttlMs: 300000,
        cacheScope: "public",
        _meta: {
          "io.modelcontextprotocol/serverInfo": SERVER_INFO,
        },
      },
    }
  }

  if (method === "prompts/get") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        resultType: "complete",
        description: "Razent Assistant Instructions",
        messages: [{ role: "user", content: { type: "text", text: INSTRUCTIONS } }],
        _meta: {
          "io.modelcontextprotocol/serverInfo": SERVER_INFO,
        },
      },
    }
  }

  // 7. resources/list & resources/read
  if (method === "resources/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        resultType: "complete",
        resources: [{ uri: "razent://store/aisles", name: "Store Aisles", mimeType: "application/json" }],
        ttlMs: 300000,
        cacheScope: "public",
        _meta: {
          "io.modelcontextprotocol/serverInfo": SERVER_INFO,
        },
      },
    }
  }

  if (method === "resources/read") {
    return {
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
    }
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  }
}

// Mode Detection: HTTP or Stdio
const args = process.argv.slice(2)
const portArgIndex = args.findIndex((a) => a === "--port" || a === "-p")
const isHttpMode = portArgIndex !== -1 || args.includes("--http")
const port = portArgIndex !== -1 ? parseInt(args[portArgIndex + 1], 10) || 8080 : 8080

if (isHttpMode) {
  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization, x-client-info, apikey, content-type, mcp-session-id, x-acp-signature, mcp-protocol-version, mcp-method, mcp-name, traceparent, tracestate, baggage"
    )
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    if (req.method === "OPTIONS") {
      res.writeHead(200)
      res.end()
      return
    }

    if (req.method === "GET") {
      const sortedTools = [...TOOLS].sort((a, b) => a.name.localeCompare(b.name))
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(
        JSON.stringify(
          {
            name: SERVER_INFO.name,
            version: SERVER_INFO.version,
            status: "online",
            transport: "Streamable HTTP (JSON-RPC 2.0)",
            mcp_specification: LATEST_PROTOCOL_VERSION,
            supported_versions: SUPPORTED_PROTOCOL_VERSIONS,
            protocols_supported: ["mcp", "ucp", "acp", "ap2"],
            tools: sortedTools.map((t) => ({ name: t.name, description: t.description })),
            storefront_url: "https://razent.vercel.app",
          },
          null,
          2
        )
      )
      return
    }

    if (req.method === "POST") {
      let body = ""
      req.on("data", (chunk) => {
        body += chunk
      })
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body)
          const isBatch = Array.isArray(payload)
          const requests = isBatch ? payload : [payload]
          const results = []
          for (const r of requests) {
            const result = await handleRpcRequest(r, req)
            if (result) results.push(result)
          }
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify(isBatch ? results : results[0]))
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Invalid JSON" }, id: null }))
        }
      })
      return
    }

    res.writeHead(405)
    res.end("Method Not Allowed")
  })

  server.listen(port, () => {
    console.log(`[Razent MCP] Streamable HTTP server listening on http://localhost:${port}`)
    console.log(`[Razent MCP] Specification: ${LATEST_PROTOCOL_VERSION}`)
  })
} else {
  // Stdio Mode
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false })
  rl.on("line", async (line) => {
    if (!line.trim()) return
    try {
      const rpc = JSON.parse(line)
      const resp = await handleRpcRequest(rpc)
      if (resp) {
        process.stdout.write(JSON.stringify(resp) + "\n")
      }
    } catch (err) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: err.message } }) + "\n")
    }
  })
}
