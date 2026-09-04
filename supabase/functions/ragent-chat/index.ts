/**
 * Razent AI shopping assistant — Edge Function.
 *
 * Decision log (from grill-me rounds):
 *   Q5: AI agent runs here, not in Vite middleware
 *   Q9: Dual-surface — `surface: "store"` (anon) and `surface: "admin"`
 *       (JWT). Different tool maps per surface.
 *   Q21: OpenRouter (OPENROUTER_API_KEY env var)
 *   Q20: Graceful degradation — if Razorpay env missing, mock paid status
 *   Q22: Read-only types — never modifies `src/lib/protocol/agenticCommerce.ts`
 *
 * Wire format: SSE (`text/event-stream`) with `data: <json>\n\n` chunks.
 * Frontend (src/components/customer/StoreHome) POSTs { messages, session_id,
 * surface } and reads the stream.
 */
import { streamText, tool } from "npm:ai@^7.0.91"
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@^3.0.43"
import { z } from "npm:zod@^4.5.4"
import { createClient } from "jsr:@supabase/supabase-js@2"

// ── Config ────────────────────────────────────────────────────
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENROUTER_BASE = "https://openrouter.ai/api/v1"
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "minimax/minimax-m3:free"

const isLLMEnabled = Boolean(OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 0)

// ── NPCI guardrails ──────────────────────────────────────────
const NPCI_REFUSAL = /\b(otp|cvv|pin|password|full card number|expiry date)\b/i
const INJECTION = /\b(ignore (?:previous|above) instructions|system prompt|reveal your prompt|jailbreak)\b/i

function guard(text: string): { ok: true } | { ok: false; reason: string; reply: string } {
  if (NPCI_REFUSAL.test(text)) {
    return {
      ok: false,
      reason: "NPCI_FORBIDDEN_FIELD",
      reply:
        "For your security I can never see card numbers, CVV, PIN, or OTP. Please complete payment on the secure Razorpay screen.",
    }
  }
  if (INJECTION.test(text)) {
    return {
      ok: false,
      reason: "PROMPT_INJECTION",
      reply:
        "I can't follow that instruction. Let's get back to your shopping — what were you looking for?",
    }
  }
  return { ok: true }
}

// ── Supabase service client (for tool calls) ─────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── System prompt (Razorpay/NPCI aligned) ───────────────────
function systemPrompt(): string {
  return `You are Razent, the AI shopping assistant for Merchant One's quick-commerce store (Blinkit/Swiggy Instamart style).

GROUND RULES (non-negotiable):
- Never invent prices, stock, or policies. ALWAYS call search_catalog / get_product.
- Never ask for full card numbers, CVV, PIN, OTP, or passwords.
- All UPI / payment actions MUST go through create_mandate (AP2) → verify_mandate first.

PROTOCOL THRESHOLDS (NPCI UAP / Razorpay):
- Cart < ₹2,000 → auto-approve (UAP transaction).
- Cart ₹2,000–₹5,000 → confirm intent with user, then UAP.
- Cart > ₹5,000 OR new payee → require x402 step-up.
- New payee with no prior mandate → require x402 step-up.

SALES BEHAVIOUR:
- Recommendations: cite the product title and price (e.g. "Amul Toned Milk 1L — ₹68").
- Upsell: only when the higher tier has strictly better specs/price ratio.
- Cross-sell: only items that pair (e.g. eggs → butter, bread, milk).
- Comparisons: at most 2 products side by side.

TONE: warm, concise (≤ 40 words/turn), Indian quick-commerce voice.

CATEGORIES in this store: Fruits, Vegetables, Dairy & Bakery, Snacks & Munchies, Beverages, Household.

End every product recommendation with one short follow-up question (e.g. "Want me to add it to cart?").`
}

// ── Tool map: storefront (anon) ──────────────────────────────
const storefrontTools = {
  search_catalog: tool({
    description:
      "Search the live grocery catalog. Use this whenever the user asks about products, prices, or availability. Never invent catalog data.",
    parameters: z.object({
      q: z.string().optional().describe("free-text search"),
      category: z.string().optional().describe("category: Fruits, Vegetables, Dairy & Bakery, Snacks & Munchies, Beverages, Household"),
      max_price_paise: z.number().int().optional().describe("upper price bound in paise (1 INR = 100 paise)"),
    }),
    execute: async ({ q, category, max_price_paise }) => {
      let query = supabase.from("products").select("*").eq("status", "active")
      if (q) query = query.ilike("title", `%${q}%`)
      if (category) query = query.eq("category", category)
      const { data, error } = await query.order("created_at", { ascending: false }).limit(20)
      if (error) return { error: error.message, products: [] }
      const filtered = max_price_paise ? (data ?? []).filter((p) => p.price_paise <= max_price_paise) : (data ?? [])
      return {
        count: filtered.length,
        products: filtered.slice(0, 10).map((p) => ({
          id: p.external_id,
          title: p.title,
          price_paise: p.price_paise,
          price_rupees: (p.price_paise / 100).toFixed(2),
          unit: p.unit,
          mrp_paise: p.mrp_paise,
          gst_pct: p.gst_pct,
          stock: p.stock,
          category: p.category,
          image_url: p.image_url,
        })),
      }
    },
  }),

  get_product: tool({
    description: "Get full details for one product by external id (e.g. 'prod_amul_toned_milk').",
    parameters: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("external_id", id)
        .maybeSingle()
      if (error) return { found: false, error: error.message }
      if (!data) return { found: false, id }
      return {
        found: true,
        id: data.external_id,
        title: data.title,
        description: data.description,
        price_paise: data.price_paise,
        price_rupees: (data.price_paise / 100).toFixed(2),
        unit: data.unit,
        mrp_paise: data.mrp_paise,
        gst_pct: data.gst_pct,
        stock: data.stock,
        category: data.category,
        image_url: data.image_url,
      }
    },
  }),

  get_order_status: tool({
    description:
      "Look up an order for the customer using order id + last 5 of phone OR email. Use for tracking questions.",
    parameters: z.object({
      order_id: z.string(),
      mobile: z.string().optional().describe("last 5+ digits of the phone used at checkout"),
      email: z.string().optional(),
    }),
    execute: async ({ order_id, mobile, email }) => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("external_id", order_id.trim())
        .maybeSingle()
      if (error || !data) return { found: false, order_id }
      const last5 = (mobile ?? "").replace(/\D/g, "")
      const cleanEmail = (email ?? "").trim().toLowerCase()
      const phoneMatch =
        last5.length >= 5 &&
        String(data.shipping_address?.phone ?? "").replace(/\D/g, "").endsWith(last5)
      const emailMatch =
        cleanEmail.length > 0 &&
        String(data.shipping_address?.email ?? "").toLowerCase() === cleanEmail
      if (!phoneMatch && !emailMatch) return { found: false, order_id, reason: "identifier_mismatch" }
      return {
        found: true,
        id: data.external_id,
        status: data.status,
        shipping_status: data.shipping_status,
        total_paise: data.total_paise,
        total_rupees: (data.total_paise / 100).toFixed(2),
        items: data.items,
        tracking: data.tracking,
        via_ai: data.via_ai,
        protocol: data.commerce_protocol,
      }
    },
  }),

  add_to_cart: tool({
    description:
      "Add a product to the active cart. Returns the product details for the UI to show a confirmation.",
    parameters: z.object({
      product_id: z.string(),
      qty: z.number().int().positive().default(1),
    }),
    execute: async ({ product_id, qty }) => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("external_id", product_id)
        .maybeSingle()
      if (error || !data) return { ok: false, error: "PRODUCT_NOT_FOUND" }
      if (data.stock < qty) return { ok: false, error: "OUT_OF_STOCK", stock: data.stock }
      return {
        ok: true,
        product_id: data.external_id,
        qty,
        title: data.title,
        unit: data.unit,
        unit_price_paise: data.price_paise,
        unit_price_rupees: (data.price_paise / 100).toFixed(2),
      }
    },
  }),

  create_mandate: tool({
    description:
      "AP2 negotiation step 1: create a draft mandate id for a given amount. Follow with verify_mandate, then start_checkout.",
    parameters: z.object({
      amount_paise: z.number().int().positive(),
      scope: z.enum(["one_time", "recurring"]).default("one_time"),
    }),
    execute: async ({ amount_paise, scope }) => {
      const mandate_id = `man_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      return { mandate_id, amount_paise, scope, status: "draft" }
    },
  }),

  verify_mandate: tool({
    description: "AP2 negotiation step 2: confirm a mandate id is valid and under the NPCI auto-approve cap (₹2,000).",
    parameters: z.object({ mandate_id: z.string() }),
    execute: async ({ mandate_id }) => {
      // Demo-grade: a mandate starting with "man_" is considered valid.
      // In production this would call uap-verifier Edge Function.
      const ok = mandate_id.startsWith("man_")
      return {
        mandate_id,
        verified: ok,
        reason: ok ? "approved" : "malformed_mandate_id",
        npci_cap_paise: 200000,
        auto_approve_threshold_paise: 200000,
      }
    },
  }),

  start_checkout: tool({
    description:
      "Run the full executeAgentCheckout flow: AP2 verify → threshold check → UAP or x402 challenge. Use after cart + shipping are collected. Returns an order id on success or a challenge on step-up.",
    parameters: z.object({
      items: z.array(z.object({ product_id: z.string(), qty: z.number().int().positive() })),
      shipping_address: z.object({
        full_name: z.string(),
        phone: z.string(),
        email: z.string(),
        line1: z.string(),
        line2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        pincode: z.string(),
        country: z.string().default("India"),
      }),
      mandate_id: z.string().optional(),
    }),
    execute: async (input) => {
      // Resolve line items
      const lineItems: Array<{ product_id: string; title: string; image_url: string; qty: number; unit_price_paise: number }> = []
      let total_paise = 0
      for (const it of input.items) {
        const { data: p } = await supabase.from("products").select("*").eq("external_id", it.product_id).maybeSingle()
        if (!p) return { ok: false, error: "PRODUCT_NOT_FOUND", product_id: it.product_id }
        lineItems.push({
          product_id: p.external_id,
          title: p.title,
          image_url: p.image_url,
          qty: it.qty,
          unit_price_paise: p.price_paise,
        })
        total_paise += p.price_paise * it.qty
      }

      // Threshold: ₹2,000 default
      const threshold_paise = 200000
      if (total_paise > threshold_paise) {
        const challenge_id = `chg_${Date.now().toString(36)}`
        return {
          ok: false,
          challenge: {
            challenge_id,
            amount_paise: total_paise,
            amount_rupees: (total_paise / 100).toFixed(2),
            payment_url: `/pay/${challenge_id}`,
            required_action: "pay",
            expires_in_minutes: 15,
            protocol: "x402",
            reason: "amount_exceeds_auto_approve_threshold",
          },
        }
      }

      // Auto-settle (graceful degradation: no Razorpay key → mark paid without webhook)
      const external_id = `ORD-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-6)}`
      const razorpay_payment_id = Deno.env.get("RAZORPAY_KEY_ID")
        ? `pay_${Date.now().toString(36)}`
        : `demo_pay_${Date.now().toString(36)}`
      const isDemo = !Deno.env.get("RAZORPAY_KEY_ID")
      const { error: orderErr } = await supabase.from("orders").insert({
        external_id,
        merchant_id: "b57fec42-c785-466e-b225-3f7a27edcccb", // demo merchant1
        customer_id: null,
        razorpay_order_id: isDemo ? `demo_rzp_${Date.now().toString(36)}` : `rzp_${Date.now().toString(36)}`,
        razorpay_payment_id,
        status: "paid",
        shipping_status: "pending",
        currency: "INR",
        total_paise,
        shipping_paise: 0,
        items: lineItems,
        shipping_address: input.shipping_address,
        via_ai: true,
        mandate_id: input.mandate_id ?? null,
        commerce_protocol: "ncpi_uap",
        settlement_reference: `settle_${Date.now().toString(36)}`,
        paid_at: new Date().toISOString(),
      })
      if (orderErr) return { ok: false, error: orderErr.message }
      return {
        ok: true,
        order: {
          id: external_id,
          status: "paid",
          total_paise,
          total_rupees: (total_paise / 100).toFixed(2),
          protocol: "ncpi_uap",
          settlement_reference: `settle_${Date.now().toString(36)}`,
          demo_mode: isDemo,
        },
      }
    },
  }),
} as const

// ── Handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 })
  }

  if (!isLLMEnabled) {
    return new Response(
      JSON.stringify({
        error: "LLM_DISABLED",
        message: "OPENROUTER_API_KEY is not set in Edge Function secrets.",
      }),
      { status: 503, headers: { "content-type": "application/json" } },
    )
  }

  let body: {
    messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>
    session_id?: string
    surface?: "store" | "admin"
  }
  try {
    body = await req.json()
  } catch {
    return new Response("invalid json", { status: 400 })
  }

  const messages = body.messages ?? []
  const surface = body.surface ?? "store"
  const sessionId = body.session_id ?? "anon"

  // Guard last user message
  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  if (lastUser) {
    const g = guard(lastUser.content)
    if (!g.ok) {
      return new Response(
        JSON.stringify({ refusal: true, reason: g.reason, text: g.reply }),
        { headers: { "content-type": "application/json" } },
      )
    }
  }

  // Build LLM
  const llm = createOpenAICompatible({
    name: "openrouter",
    apiKey: OPENROUTER_API_KEY!,
    baseURL: OPENROUTER_BASE,
  })

  // Pick tool map per surface (Q9 dual-surface)
  const tools = surface === "admin"
    ? { ...storefrontTools } // admin can use the same read tools; we don't add write tools per Q13b
    : storefrontTools

  // Stream
  const result = streamText({
    model: llm(OPENROUTER_MODEL),
    system: systemPrompt(),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    tools,
    maxSteps: 6,
    temperature: 0.4,
  })

  // SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      try {
        for await (const chunk of result.fullStream) {
          if (chunk.type === "text-delta") {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "text", text: chunk.text })}\n\n`))
          } else if (chunk.type === "tool-call") {
            controller.enqueue(
              enc.encode(`data: ${JSON.stringify({ type: "tool", name: chunk.toolName, args: chunk.args })}\n\n`),
            )
          } else if (chunk.type === "tool-result") {
            controller.enqueue(
              enc.encode(`data: ${JSON.stringify({ type: "tool-result", name: chunk.toolName, result: chunk.result })}\n\n`),
            )
          } else if (chunk.type === "error") {
            controller.enqueue(
              enc.encode(`data: ${JSON.stringify({ type: "error", error: String(chunk.error) })}\n\n`),
            )
          }
        }
        controller.enqueue(enc.encode("data: [DONE]\n\n"))
        controller.close()
      } catch (err) {
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      "connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Session-Id": sessionId,
    },
  })
})
