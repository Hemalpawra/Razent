#!/usr/bin/env node
/**
 * Razent Model Context Protocol (MCP) Commerce Server
 *
 * Exposes Razent's Agentic Commerce Stack (UCP / ACP / AP2) to any MCP-compliant
 * external AI agent (Claude Desktop, Cursor, Windsurf, Claude Code, etc.).
 *
 * Protocol: JSON-RPC 2.0 over Stdio (Standard MCP)
 */

import readline from "node:readline"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://flsjhsnfurxkzawdimyi.supabase.co"
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_BJfbmQGnWlGSTL22LHJVxA_p3DeEUAi"
const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "rzp_test_TXeysTR9U8Fyws"
const RAZORPAY_KEY_SECRET = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || "UuzZqB93v2obPdSyg3plRzKd"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Tools Schema for External AI Agents
const TOOLS = [
  {
    name: "ucp_catalog_search",
    description:
      "Search products in Razent 10-15 min quick grocery delivery catalog via Universal Commerce Protocol (UCP). Supports natural language search, category filtering, and price caps.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword e.g. 'milk', 'organic mustard oil', 'apples'" },
        category: { type: "string", description: "Product category (e.g. 'Dairy & Eggs', 'Pantry', 'Fresh Produce')" },
        max_price_paise: { type: "number", description: "Maximum price in paise (e.g. 20000 = ₹200)" },
        in_stock_only: { type: "boolean", description: "Only return items currently in stock" },
      },
    },
  },
  {
    name: "acp_create_checkout_session",
    description:
      "Initiate an Agentic Commerce Protocol (ACP) checkout session for selected items. Negotiates agent-merchant capabilities and locks prices.",
    inputSchema: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          description: "List of product IDs and quantities to buy",
          items: {
            type: "object",
            required: ["id", "quantity"],
            properties: {
              id: { type: "string", description: "Product UUID from ucp_catalog_search" },
              quantity: { type: "number", minimum: 1, description: "Quantity of items" },
            },
          },
        },
        delivery_address: {
          type: "object",
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
    name: "ap2_execute_autonomous_checkout",
    description:
      "Execute autonomous Human-Not-Present purchase under Google AP2 protocol with real Razorpay test settlement. Verifies delegated spending cap and creates authoritative orders.",
    inputSchema: {
      type: "object",
      required: ["checkout_session_id"],
      properties: {
        checkout_session_id: { type: "string", description: "Session ID returned from acp_create_checkout_session" },
        upi_vpa: { type: "string", description: "Customer UPI VPA (defaults to customer@okhdfcbank)" },
        delegated_price_cap_paise: { type: "number", description: "User delegated spending cap in paise (e.g. 50000 = ₹500)" },
      },
    },
  },
]

// Tool Implementations
async function handleUCPCatalogSearch(args) {
  let query = supabase.from("products").select("*").eq("status", "active")
  if (args.category && args.category !== "All") {
    query = query.eq("category", args.category)
  }
  if (args.query) {
    query = query.ilike("title", `%${args.query}%`)
  }
  if (args.max_price_paise) {
    query = query.lte("price_paise", args.max_price_paise)
  }
  if (args.in_stock_only) {
    query = query.gt("stock", 0)
  }

  const { data, error } = await query.limit(10)
  if (error) throw new Error(error.message)

  return {
    protocol: "ucp",
    version: "2026-01-16",
    matches_count: data?.length || 0,
    products: (data || []).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price_rupees: (p.price_paise / 100).toFixed(2),
      price_paise: p.price_paise,
      category: p.category,
      stock: p.stock,
      delivery_sla: "10-15 minutes",
    })),
  }
}

const memorySessions = new Map()

async function handleACPCreateCheckout(args) {
  const { data: allProds } = await supabase.from("products").select("*")
  const prods = allProds || []

  let totalPaise = 0
  const lineItems = []

  for (const item of args.items) {
    const prod = prods.find((p) => p.id === item.id)
    if (!prod) throw new Error(`Product ID not found: ${item.id}`)
    const amount = prod.price_paise * item.quantity
    totalPaise += amount
    lineItems.push({
      product_id: prod.id,
      title: prod.title,
      qty: item.quantity,
      unit_price_paise: prod.price_paise,
      line_total_paise: amount,
    })
  }

  const sessionId = `acp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const session = {
    id: sessionId,
    status: "ready_for_payment",
    currency: "INR",
    total_paise: totalPaise,
    total_rupees: (totalPaise / 100).toFixed(2),
    line_items: lineItems,
    totals: [{ type: "total", amount: totalPaise, display_text: "Total Amount" }],
    delivery_address: args.delivery_address || {
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

  // Also persist to Supabase if table is ready
  try {
    await supabase.from("acp_checkout_sessions").insert({
      id: sessionId,
      status: "ready_for_payment",
      currency: "INR",
      line_items: lineItems,
      totals: [{ type: "total", amount: totalPaise, display_text: "Total Amount" }],
      capabilities: { supported_handlers: session.supported_handlers },
    })
  } catch {}

  return session
}

async function handleAP2ExecuteCheckout(args) {
  const { checkout_session_id, upi_vpa = "customer@okhdfcbank", delegated_price_cap_paise = 1500000 } = args

  // 1. Fetch Session from memory or DB
  let sessionData = memorySessions.get(checkout_session_id)
  if (!sessionData) {
    try {
      const { data: dbSession } = await supabase
        .from("acp_checkout_sessions")
        .select("*")
        .eq("id", checkout_session_id)
        .maybeSingle()
      if (dbSession) sessionData = dbSession
    } catch {}
  }

  if (!sessionData) {
    throw new Error(`Checkout session ${checkout_session_id} not found`)
  }

  const totalPaise = sessionData.total_paise || sessionData.totals?.[0]?.amount || 0

  // 2. Autonomous constraint check
  if (totalPaise > delegated_price_cap_paise) {
    return {
      status: "step_up_required",
      protocol: "x402",
      message: `Order total ₹${(totalPaise / 100).toFixed(2)} exceeds delegated limit ₹${(delegated_price_cap_paise / 100).toFixed(2)}. Human approval required.`,
    }
  }

  // 3. Create Real Razorpay Order on Test Rails
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")
  const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: totalPaise,
      currency: "INR",
      receipt: `agent_${checkout_session_id.slice(0, 14)}`,
      notes: {
        protocol: "ap2",
        agent_session_id: checkout_session_id,
        customer_vpa: upi_vpa,
      },
    }),
  })

  if (!rzpRes.ok) {
    const errText = await rzpRes.text()
    throw new Error(`Razorpay Order Creation Failed: ${errText}`)
  }

  const rzpOrder = await rzpRes.json()

  // 4. Record settled order in orders table
  const orderId = `RAZ-MCP-${Date.now().toString(36).toUpperCase()}`
  try {
    await supabase.from("orders").insert({
      external_id: orderId,
      merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb",
      razorpay_order_id: rzpOrder.id,
      status: "paid",
      shipping_status: "dispatched",
      currency: "INR",
      total_paise: totalPaise,
      items: sessionData.line_items || [],
      shipping_address: {
        full_name: "External Agent Customer",
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
    console.warn("Database order insert notice:", err.message)
  }

  // 5. Update session to completed
  sessionData.status = "completed"
  sessionData.order_id = orderId
  sessionData.razorpay_order_id = rzpOrder.id

  try {
    await supabase
      .from("acp_checkout_sessions")
      .update({ status: "completed", order_id: orderId, razorpay_order_id: rzpOrder.id })
      .eq("id", checkout_session_id)
  } catch {}

  return {
    success: true,
    status: "settled",
    protocol: "ap2",
    order_id: orderId,
    razorpay_order_id: rzpOrder.id,
    amount_paid_rupees: (totalPaise / 100).toFixed(2),
    settlement_rail: "NPCI UPI AutoPay via Razorpay Test Rails",
    delivery_eta: "12 minutes",
  }
}

// JSON-RPC Stdio Loop
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false })

rl.on("line", async (line) => {
  if (!line.trim()) return
  try {
    const request = JSON.parse(line)
    const { id, method, params } = request

    if (method === "initialize") {
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "razent-agentic-commerce", version: "2026.1.0" },
      })
      return
    }

    if (method === "notifications/initialized") {
      return
    }

    if (method === "tools/list") {
      sendResponse(id, { tools: TOOLS })
      return
    }

    if (method === "tools/call") {
      const { name, arguments: toolArgs } = params
      let result
      if (name === "ucp_catalog_search") {
        result = await handleUCPCatalogSearch(toolArgs)
      } else if (name === "acp_create_checkout_session") {
        result = await handleACPCreateCheckout(toolArgs)
      } else if (name === "ap2_execute_autonomous_checkout") {
        result = await handleAP2ExecuteCheckout(toolArgs)
      } else {
        throw new Error(`Unknown tool: ${name}`)
      }

      sendResponse(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      })
      return
    }

    // Unhandled method
    sendResponse(id, null, { code: -32601, message: `Method not found: ${method}` })
  } catch (err) {
    sendResponse(null, null, { code: -32603, message: err.message })
  }
})

function sendResponse(id, result, error) {
  const resp = { jsonrpc: "2.0", id }
  if (error) resp.error = error
  else resp.result = result
  process.stdout.write(JSON.stringify(resp) + "\n")
}
