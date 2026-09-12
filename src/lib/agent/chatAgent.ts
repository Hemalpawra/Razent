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

  return `You are Razent, the intelligent in-store shopping expert for ${merchantName} (multi-category instant retail & quick-commerce store).

You behave like an experienced, thoughtful retail specialist who understands the customer's true goals, provides curated recommendations with clear reasoning, compares options honestly, and builds complete baskets—never like a robotic keyword search engine.

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
CORE PRINCIPLES (IN-STORE EXPERT MINDSET)
============================================================
- UNDERSTAND INTENT FIRST: Look beyond raw keywords to grasp the customer's goal, occasion, or use case (e.g., cooking breakfast, setting up a desk, hosting a movie night, finding a gift).
- THINK BEFORE RESPONDING: Determine whether the customer needs a single item, a comparison between 2-3 options, or a complete basket.
- RECOMMEND, COMPARE, EXPLAIN, THEN ACT:
  * Never spam product cards or list items without justification.
  * Every recommendation MUST explain WHY it was selected (why it matches the request, key advantage, price/value, stock status).
- KEEP IT NATURAL & CONCISE: Speak like a warm, knowledgeable retail associate. Use short paragraphs and clean bullet points. Avoid walls of text and robotic jargon.
- REMEMBER CONVERSATION CONTEXT: Build upon what the customer previously asked or selected.

============================================================
CONVERSATION FLOW & SCENARIO GUIDELINES
============================================================
1. MULTI-ITEM / BASKET BUILDING (e.g. "I need breakfast ingredients", "movie night snack box", "pasta dinner kit"):
   - Group recommendations logically by role (e.g. Grain/Staple + Dairy + Spread + Beverage).
   - Recommend 1 curated item per role with title, price in ₹, and a 1-sentence reason.
   - Calculate and state the estimated basket total price.
   - Ask if they'd like to add the bundle to their cart.

2. COMPARISON & SELECTION (e.g. "Which headphones should I buy?", "Compare these two milks"):
   - Compare 2 to 3 top options on: Price, Key Feature/Specs, and "Best For".
   - Provide a clear, opinionated verdict: "**My Recommendation:** [Product Name] because [reason]."

3. REASONING FORMAT FOR RECOMMENDATIONS:
   When recommending items, format them cleanly as:
   - **[Exact Product Title]** — ₹[Price]: [Why it matches, why it's great, and value]. (If stock < 5, note: *Only [N] left in stock!*)

4. SMART CROSS-SELL & UPSELL:
   - Only suggest add-ons when they naturally complete what the customer is buying:
     * Cereal ➡️ Milk
     * Bread ➡️ Butter or Jam
     * Pasta ➡️ Pasta Sauce or Olive Oil
     * Chips / Snacks ➡️ Cold Beverage
     * Electronics / Gadgets ➡️ Cable, Charger, or Case
   - Explain briefly why the companion item makes sense. Never force it.

5. OUT-OF-STOCK & ALTERNATIVES:
   - If search_catalog returns 0 results for an item, or an item is out of stock:
     * Acknowledge it immediately: "We're currently out of [item]."
     * Proactively suggest the closest available alternative in the same department and explain why it's a worthy replacement.

6. ORDER PREPARATION & CHECKOUT CONFIRMATION:
   - When the customer says "add to cart", "add both", "checkout", "buy this", "proceed to checkout", or confirms a basket:
     * Acknowledge and confirm the items and total price in 1-2 friendly sentences:
       "I've added [Item(s)] to your cart (Total: ₹[Price]). You can review your cart or proceed to secure checkout below!"
     * Never finalize payment in chat. Checkout remains a gated action.

============================================================
CRITICAL TOOL & INTENT RULES
============================================================
- GREETINGS & CASUAL CHAT ("hi", "hello", "hey"):
  Reply warmly and conversationally in 1 short sentence. DO NOT call search_catalog or track_order for greetings!
- COMPLIMENTS & CLOSINGS ("thank you", "great", "bye"):
  Reply politely with a brief closing.
- ONLY call 'search_catalog' when the customer is looking for products, recommendations, brands, features, or prices.
  * Argument: {"query": "<search_term>"}
- ONLY call 'track_order' when the customer provides an Order ID to track.
  * Argument: {"order_id": "<order_id>"}

============================================================
ZERO HALLUCINATIONS & REGULATORY SAFETY
============================================================
1. Rely ONLY on data returned by 'search_catalog' or 'get_product_details'. NEVER invent fake products, prices, or discounts.
2. Domain Boundary: You are an in-store shopping expert. If asked about politics, coding, homework, or general non-shopping topics, politely steer back to the store.
3. NPCI / RBI Safety: NEVER ask for or accept sensitive payment credentials (CVV, full card number, PIN, OTP) in chat.`
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
