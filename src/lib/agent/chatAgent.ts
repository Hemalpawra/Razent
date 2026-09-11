// @ts-nocheck
import { streamText, tool, type CoreMessage } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { z } from "zod"
import { listProducts, getProduct, trackOrder } from "@/lib/api/client"
import { formatPrice, type Product } from "@/lib/types/product"
import { useCart } from "@/state/useCart"
import { useSettings } from "@/state/useSettings"
import { semanticVectorEngine } from "@/lib/agent/vectorSearch"

const apiKey =
  (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined) ||
  (import.meta.env.VITE_LLM_API_KEY as string | undefined) ||
  (import.meta.env.OPENROUTER_API_KEY as string | undefined)

const baseURL =
  (import.meta.env.VITE_LLM_BASE_URL as string | undefined) ??
  "https://openrouter.ai/api/v1"

const modelId =
  (import.meta.env.VITE_LLM_MODEL as string | undefined) ??
  "google/gemini-2.5-flash"

export const isOpenRouterConfigured = Boolean(apiKey && apiKey.startsWith("sk-or-v1-"))

const openrouter = createOpenAICompatible({
  name: "openrouter",
  apiKey: apiKey || "sk-dummy",
  baseURL,
})

export interface ChatAgentResult {
  text: string
  products: Product[]
  checkoutAction?: {
    title: string
    product: Product
  }
  toolCallsExecuted: string[]
}

/**
 * System prompt designed for real, conversational shopping intelligence.
 */
function buildSystemPrompt(): string {
  const store = useSettings.getState().storeProfile
  const merchantName = store.storeName || "Razent Store"

  return `You are Razent, the intelligent AI shopping assistant for ${merchantName} (multi-category instant retail & quick-commerce store).

Your job is to understand what the customer wants, find the best real products from the live catalog across our 10 store departments, suggest useful add-ons when they make sense, and guide customers through seamless ordering and tracking.

============================================================
STORE CATEGORIES & DEPARTMENTS (10 ACTIVE AISLES)
============================================================
1. Grocery & Staples
2. Beverages
3. Electronics
4. Beauty & Personal Care
5. Home Care
6. Home & Kitchen
7. Decor
8. Kids
9. Kitchen Appliances
10. Office & Stationery

============================================================
CORE GROUNDING RULES (ZERO HALLUCINATIONS)
============================================================
1. You DO NOT have an in-memory or static catalog. You MUST rely on data returned by 'search_catalog' or 'get_product_details'.
2. Use ONLY real product data from the live store database:
   - title, description, category, brand, price, stock, tags, features, specifications, unit, images
3. NEVER invent, hallucinate, or assume any product, brand, price, stock quantity, or discount.
4. If search_catalog returns 0 products:
   - Explicitly state that the store is currently out of stock for that item.
   - Suggest the closest available item within the relevant department.

============================================================
CRITICAL INTENT AWARENESS (RULE #0)
============================================================
- GREETINGS & CASUAL CHAT ("hi", "hello", "hey", "good morning"):
  Reply warmly and conversationally in text ONLY. DO NOT call search_catalog or track_order for casual greetings.
- COMPLIMENTS & CLOSINGS ("thank you", "great", "bye"):
  Respond politely with short helpful closing text.
- ONLY call 'search_catalog' when the customer is looking for products, recommendations, brands, features, or prices.
  * Argument format: {"query": "<search_term>"}.
- ONLY call 'track_order' when the customer provides an Order ID to track.
  * Argument format: {"order_id": "<order_id>"}.

============================================================
DOMAIN BOUNDARY
============================================================
You assist with shopping and order management across our 10 store departments.
If the customer asks about politics, political figures, software coding, homework, weather, or topics unrelated to shopping, politely refuse:
"I am Razent, your shopping assistant. I can help you discover products across our store (Groceries, Electronics, Home, Beauty, Kitchen, Stationery, Kids, and more) and track your orders. What can I find for you today?"

============================================================
MAIN SHOPPING GOAL & RECOMMENDATION RANKING
============================================================
Read the customer message and infer:
- need, budget, department, use case, brand preference, size/unit, quality level (cheap, best, premium, or value)

Rank products using this order:
1. Exact intent match
2. Budget match
3. Stock availability (never recommend out-of-stock items as top pick; note if stock is low)
4. Category match
5. Brand match
6. Feature / specification match
7. Useful add-on potential

- If the customer asks for “best”: choose the product that gives the best mix of fit, price, and quality.
- If the customer asks for “cheap”: choose the lowest-cost good option that still fits the need.
- If the customer asks for “premium”: choose the higher-tier item with superior features/materials.

============================================================
MULTI-CATEGORY UPSELL & CROSS-SELL RULES
============================================================
- UPSELL RULE: Suggest a higher-tier or larger-pack option ONLY when it genuinely benefits the customer (e.g., larger size, better specs, premium brand). Do not force it.
- CROSS-SELL RULE: Pair complementary items naturally across categories:
  * Electronics ➡️ Chargers, cables, laptop sleeves, earphones
  * Kitchen Appliances ➡️ Storage containers, dishwash cleaners, coffee/tea blends
  * Office & Stationery ➡️ Notebooks with pens, sticky notes, desk organizers
  * Grocery & Beverages ➡️ Tea with sugar/snacks, pasta with olive oil/sauce
  * Beauty & Personal Care ➡️ Face wash with moisturizer or sunscreen
  * Decor & Home ➡️ Vases with scented candles, fairy lights, cushions

============================================================
STYLE & CONVERSATION TONE (CRITICAL)
============================================================
- Be CONCISE, natural, and helpful — exactly like an expert in-store retail associate.
- Keep your replies short (2 to 4 sentences maximum).
- NEVER produce long multi-section essays, walls of text, or rigid comparison tables unless the customer explicitly asks to "compare".
- Greet warmly in 1 short sentence on greetings.
- When recommending items, highlight 1 to 3 best matches with exact title and price in ₹ (e.g. - **Amul Butter (500g)** — ₹285).
- When the customer says "prepare order", "place order", "checkout", or "buy this", confirm the item and price warmly in 1-2 sentences:
  "I've prepared your order summary for [Product] at ₹[Price]. Please review the details below and confirm to complete your order!"

============================================================
PAYMENT, REGULATORY & PROTOCOL SAFETY (NPCI / RBI)
============================================================
- NEVER ask for or accept sensitive payment credentials (CVV, full card numbers, PINs, or OTPs) in chat.
- NEVER provide a fake or simulated UPI ID. Direct all payments to the secure checkout drawer.`
}

import { isN8nAgentEnabled, executeN8nAgentTurn } from "./n8nAgent"

/**
 * Execute real Agentic stream with Vercel AI SDK or n8n Workflow.
 * n8n is the production source of truth for assistant responses.
 */
export async function executeChatAgentTurn({
  messages,
  sessionId,
  catalog,
  onToolCall,
}: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  sessionId?: string
  catalog: Product[]
  onToolCall?: (toolName: string) => void
}): Promise<ChatAgentResult> {
  // Tier 1: Try n8n Agent Workflow (if configured and reachable)
  if (isN8nAgentEnabled) {
    try {
      const n8nResult = await executeN8nAgentTurn({ messages, sessionId, catalog, onToolCall })
      return n8nResult
    } catch (n8nErr: any) {
      console.error("[chatAgent] n8n workflow failed:", n8nErr?.message)
      throw n8nErr
    }
  }

  const toolCallsExecuted: string[] = []
  let returnedProducts: Product[] = []
  let checkoutAction: { title: string; product: Product } | undefined

  try {
    const result = streamText({
      model: openrouter(modelId),
      system: buildSystemPrompt(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })) as CoreMessage[],
      maxSteps: 5,
      tools: {
        search_catalog: tool({
          description:
            "Search products in the catalog using semantic vector search, keywords, and price ceiling filters. Only use when customer wants products or recommendations.",
          parameters: z.object({
            query: z.string().describe("Search keywords or product intent (e.g. 'healthy snacks', 'running shoes')"),
            maxPricePaise: z.number().optional().describe("Price ceiling in paise (e.g. 50000 for ₹500)"),
            category: z.string().optional().describe("Category filter"),
          }),
          execute: async ({ query, maxPricePaise, category }) => {
            onToolCall?.("search_catalog")
            toolCallsExecuted.push("search_catalog")

            // 1. Run RAG Vector Engine
            const vectorResults = await semanticVectorEngine.search(query, {
              maxPricePaise,
              category,
              limit: 4,
            })

            let matches = vectorResults.map((r) => r.product)

            // Fallback keyword search if vector engine has no matches
            if (matches.length === 0) {
              const qLower = query.toLowerCase()
              matches = catalog.filter((p) => {
                const matchTitle = p.title.toLowerCase().includes(qLower)
                const matchDesc = p.description.toLowerCase().includes(qLower)
                const matchCategory = p.category.toLowerCase().includes(qLower)
                const matchPrice = maxPricePaise ? p.price_paise <= maxPricePaise : true
                return (matchTitle || matchDesc || matchCategory) && matchPrice
              }).slice(0, 4)
            }

            returnedProducts = matches

            return {
              count: matches.length,
              products: matches.map((p) => ({
                id: p.id,
                title: p.title,
                price: formatPrice(p.price_paise, p.currency),
                category: p.category,
                stock: p.stock,
                image_url: p.image_url,
              })),
            }
          },
        }),

        get_product_details: tool({
          description: "Get full specifications and details for a specific product ID.",
          parameters: z.object({
            productId: z.string().describe("The product ID"),
          }),
          execute: async ({ productId }) => {
            onToolCall?.("get_product_details")
            toolCallsExecuted.push("get_product_details")
            const p = catalog.find((item) => item.id === productId) || (await getProduct(productId))
            if (!p) return { found: false, productId }
            return {
              found: true,
              product: {
                id: p.id,
                title: p.title,
                description: p.description,
                price: formatPrice(p.price_paise, p.currency),
                category: p.category,
                stock: p.stock,
              },
            }
          },
        }),

        add_to_cart: tool({
          description: "Add a specific product to the customer's cart.",
          parameters: z.object({
            productId: z.string().describe("Product ID to add"),
            quantity: z.number().default(1),
          }),
          execute: async ({ productId, quantity }) => {
            onToolCall?.("add_to_cart")
            toolCallsExecuted.push("add_to_cart")
            const product = catalog.find((p) => p.id === productId)
            if (product) {
              useCart.getState().addToCart(product, quantity)
              return {
                success: true,
                productId,
                productTitle: product.title,
                quantity,
                message: `Added ${quantity}× ${product.title} to cart.`,
              }
            }
            return { success: false, error: "Product not found in active catalog." }
          },
        }),

        prepare_checkout: tool({
          description: "Directly prepare checkout for an item or current cart.",
          parameters: z.object({
            productId: z.string().optional().describe("Product ID if buying a specific item immediately"),
            quantity: z.number().default(1),
          }),
          execute: async ({ productId, quantity }) => {
            onToolCall?.("prepare_checkout")
            toolCallsExecuted.push("prepare_checkout")
            if (productId) {
              const product = catalog.find((p) => p.id === productId)
              if (product) {
                useCart.getState().prepareCheckout(product, quantity)
                checkoutAction = {
                  title: "Go to Checkout →",
                  product,
                }
                return {
                  success: true,
                  productTitle: product.title,
                  redirectUrl: "/?view=checkout",
                }
              }
            }
            return { success: true, redirectUrl: "/?view=checkout" }
          },
        }),

        get_cart_summary: tool({
          description: "Retrieve current contents and total of the user's shopping cart.",
          parameters: z.object({}),
          execute: async () => {
            onToolCall?.("get_cart_summary")
            toolCallsExecuted.push("get_cart_summary")
            const items = useCart.getState().items
            const totalPaise = items.reduce((acc, i) => acc + i.product.price_paise * i.qty, 0)
            return {
              itemCount: items.length,
              totalFormatted: formatPrice(totalPaise, "INR"),
              items: items.map((i) => ({
                id: i.product.id,
                title: i.product.title,
                qty: i.qty,
                price: formatPrice(i.product.price_paise * i.qty, "INR"),
              })),
            }
          },
        }),

        track_order: tool({
          description: "Look up order tracking information using order ID.",
          parameters: z.object({
            orderId: z.string().describe("Order ID, e.g. RAZ-12345"),
          }),
          execute: async ({ orderId }) => {
            onToolCall?.("track_order")
            toolCallsExecuted.push("track_order")
            const order = await trackOrder({ orderId, mobile: "", email: "" })
            if (!order) return { found: false, orderId }
            return {
              found: true,
              id: order.id,
              status: order.status,
              shipping_status: order.shipping_status,
              total: formatPrice(order.total_paise, order.currency),
              items: order.items.map((i) => ({
                title: i.title,
                qty: i.qty,
              })),
            }
          },
        }),
      },
    })

    // Consume the text stream from the ReAct loop
    const fullText = await result.text

    return {
      text: fullText,
      products: returnedProducts,
      checkoutAction,
      toolCallsExecuted,
    }
  } catch (error: any) {
    console.warn("LLM API execution error, falling back to local intent resolver:", error)
    return executeLocalIntentFallback(messages[messages.length - 1].content, catalog)
  }
}

/**
 * High-accuracy local intent fallback (used strictly if OpenRouter network is unreachable)
 * Gated so it NEVER throws cards on chat, greetings, or questions!
 */
function executeLocalIntentFallback(query: string, catalog: Product[]): ChatAgentResult {
  const q = query.toLowerCase().trim()

  // 1. Casual Chat / Greeting Intent
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|who\s+are\s+you|what\s+can\s+you\s+do|how\s+are\s+you)/i.test(q)) {
    return {
      text: "Hi there! I'm your AI shopping assistant. I can help you find products, compare prices, check your cart, or track your orders. What are you looking for today?",
      products: [],
      toolCallsExecuted: [],
    }
  }

  // 2. Compliment / Acknowledgement
  if (/^(thanks|thank\s+you|ok|okay|cool|awesome|great|perfect|done)/i.test(q)) {
    return {
      text: "You're very welcome! Let me know if there's anything else I can help you find.",
      products: [],
      toolCallsExecuted: [],
    }
  }

  // 3. Cart View Intent
  if (/\b(what is in my cart|show cart|view cart|my cart|cart items)\b/i.test(q)) {
    const items = useCart.getState().items
    if (items.length === 0) {
      return {
        text: "Your cart is currently empty. Let me know what you'd like to find!",
        products: [],
        toolCallsExecuted: ["get_cart_summary"],
      }
    }
    const summary = items.map((i) => `• ${i.qty}× **${i.product.title}** (${formatPrice(i.product.price_paise * i.qty, "INR")})`).join("\n")
    return {
      text: `Here is what is in your cart (${items.length} items):\n\n${summary}`,
      products: [],
      toolCallsExecuted: ["get_cart_summary"],
    }
  }

  // 4. Product Search Intent
  const priceMatch = q.match(/(?:under|below|less than|within)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i)
  const maxPricePaise = priceMatch ? parseInt(priceMatch[1], 10) * 100 : undefined
  const cleanTerm = q.replace(/(?:find|show me|search|need|want|get|i need|looking for|under|below|less than|\d+|₹|rs\.?|inr)\s*/gi, "").trim()

  const matches = catalog.filter((p) => {
    const termMatch = cleanTerm ? p.title.toLowerCase().includes(cleanTerm) || p.description.toLowerCase().includes(cleanTerm) || p.category.toLowerCase().includes(cleanTerm) : true
    const priceLimit = maxPricePaise ? p.price_paise <= maxPricePaise : true
    return termMatch && priceLimit
  }).slice(0, 4)

  if (matches.length > 0 && cleanTerm.length > 1) {
    return {
      text: `Here are some matches for "${cleanTerm}"${maxPricePaise ? ` under ₹${maxPricePaise / 100}` : ""}:`,
      products: matches,
      toolCallsExecuted: ["search_catalog"],
    }
  }

  return {
    text: "I couldn't find specific products matching that description. Could you specify the brand, category, or price range?",
    products: [],
    toolCallsExecuted: [],
  }
}
