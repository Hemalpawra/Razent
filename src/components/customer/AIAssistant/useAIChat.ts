/**
 * useAIChat - Shared hook for the AI Assistant.
 * - Maintains active message list and session ID
 * - Preserves conversation memory across turns
 * - Fetches & manages conversation history for logged-in users from Supabase
 * - Persists conversation transcripts tied to the customer's email / account
 * - Detects checkout & purchase intents to initiate human-in-the-loop orders
 */
import { useState, useCallback, useRef, useEffect } from "react"
import { executeChatAgentTurn } from "@/lib/agent/chatAgent"
import {
  upsertConversation,
  listCustomerConversations,
  logAuditEvent,
} from "@/lib/api/client"
import { useCustomerAuth } from "@/state/useCustomerAuth"
import { useUser } from "@clerk/react"
import { useSettings } from "@/state/useSettings"
import type { Product } from "@/lib/types/product"
import type { Conversation } from "@/lib/types/conversation"
import { useCart } from "@/state/useCart"
import { toast } from "sonner"

export type ChatRole = "user" | "assistant" | "system"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: number
  toolCallsExecuted?: string[]
  products?: Product[]
  checkoutAction?: { title: string; product: Product }
  orderCheckout?: {
    products: Product[]
    totalPaise: number
    orderId?: string
  }
}

function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function getStoredConversationId(): string {
  if (typeof window === "undefined") return `conv_${Date.now()}`
  const key = "razent_ai_conversation_id"
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const created = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  window.sessionStorage.setItem(key, created)
  return created
}

export const CHAT_SUGGESTIONS = [
  "Show me grocery deals",
  "Best electronics under ₹5000",
  "Track my order",
  "Healthy snacks options",
  "Office stationery",
  "Beauty & skincare",
]

const CHECKOUT_INTENT_REGEX =
  /\b(checkout|place order|prepare order|buy this|order now|proceed to checkout|take my order)\b/i

function syncCartFromUserIntent(
  text: string,
  recentProducts: Product[],
  catalog: Product[]
): { added: { product: Product; qty: number }[] } {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()

  const isAddToCartPhrase =
    /\b(add\s+(?:it|this|them|both|all)?\s*to\s*(?:my\s*)?cart|add\s+(?:both|all|them)|put\s+(?:it|this|them|both|all)?\s*in\s*(?:my\s*)?cart|add\s+to\s+cart)\b/i.test(
      lower
    ) || /^add\s+/i.test(lower)

  if (!isAddToCartPhrase) return { added: [] }

  // Extract optional quantity (e.g. "add 2", "2 packs of", etc.)
  const qtyMatch = lower.match(/\b(?:add\s+)?(\d+)\s*(?:x|units?|packs?|of\s+)?/i)
  const qty = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1

  const added: { product: Product; qty: number }[] = []

  // Check if referring to "both" or "all"
  if (/\b(both|all|them|everything)\b/i.test(lower)) {
    if (recentProducts.length > 0) {
      recentProducts.forEach((p) => {
        useCart.getState().addToCart(p, qty)
        added.push({ product: p, qty })
      })
      return { added }
    }
  }

  // Check if a specific product title or brand was mentioned in the user's text
  const pool = [...recentProducts, ...catalog]
  const matched = pool.find((p) => {
    const title = p.title.toLowerCase()
    const cleanTitle = title.replace(/\(.*?\)/g, "").trim().toLowerCase()
    return (
      lower.includes(cleanTitle) ||
      cleanTitle.split(/\s+/).every((w) => w.length > 2 && lower.includes(w))
    )
  })

  if (matched) {
    useCart.getState().addToCart(matched, qty)
    added.push({ product: matched, qty })
    return { added }
  }

  // If no specific product mentioned but recent products exist and user said "add to cart" / "add this"
  if (recentProducts.length > 0) {
    if (recentProducts.length === 1) {
      useCart.getState().addToCart(recentProducts[0], qty)
      added.push({ product: recentProducts[0], qty })
    } else {
      recentProducts.forEach((p) => {
        useCart.getState().addToCart(p, qty)
        added.push({ product: p, qty })
      })
    }
    return { added }
  }

  return { added }
}

export function useAIChat(products: Product[] = [], initialConversationId?: string) {
  const { user: clerkUser } = useUser()
  const { user: customAuthUser, profile: customAuthProfile } = useCustomerAuth()
  const { storeProfile } = useSettings()
  const cartItems = useCart((s) => s.items)

  const customerEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    customAuthProfile?.email ||
    customAuthUser?.email ||
    null

  const customerName =
    clerkUser?.fullName ||
    clerkUser?.firstName ||
    customAuthProfile?.full_name ||
    (customerEmail ? customerEmail.split("@")[0] : "Guest")

  const [activeSessionId, setActiveSessionId] = useState(
    initialConversationId || getStoredConversationId()
  )
  const convExtId = useRef(activeSessionId)
  convExtId.current = activeSessionId

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationsHistory, setConversationsHistory] = useState<Conversation[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null)
  const abortRef = useRef(false)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch past conversation sessions for logged-in customer
  const refreshHistory = useCallback(async () => {
    if (!customerEmail) {
      setConversationsHistory([])
      return
    }
    setIsLoadingHistory(true)
    try {
      const history = await listCustomerConversations(customerEmail)
      setConversationsHistory(history)
    } catch (err) {
      console.warn("[useAIChat] failed to list history:", err)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [customerEmail])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  // Persist conversation transcript to Supabase
  const persistConversation = useCallback(
    async (msgs: ChatMessage[], status: "active" | "inactive" | "checkout_ready" = "active") => {
      if (msgs.length === 0) return
      const last = msgs[msgs.length - 1]

      await upsertConversation({
        external_id: convExtId.current,
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        type: "human_customer",
        protocol: "direct_web",
        status,
        last_message: last.content.slice(0, 200),
        messages: msgs.map((m) => ({
          id: m.id,
          role: m.role === "user" ? "customer" : "ai",
          text: m.content,
          at: new Date(m.timestamp).toISOString(),
          products: m.products,
          orderCheckout: m.orderCheckout,
        })),
      })
    },
    [customerName, customerEmail]
  )

  const scheduleInactivity = useCallback(
    (msgs: ChatMessage[]) => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      inactivityTimer.current = setTimeout(() => {
        void persistConversation(msgs, "inactive")
      }, 60_000)
    },
    [persistConversation]
  )

  // Start a fresh chat session
  const startNewChat = useCallback(() => {
    const nextId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("razent_ai_conversation_id", nextId)
    }
    convExtId.current = nextId
    setActiveSessionId(nextId)
    setMessages([])
    setIsLoading(false)
    setActiveToolCall(null)
    abortRef.current = false
  }, [])

  // Load an existing past conversation
  const loadConversation = useCallback((conv: Conversation) => {
    convExtId.current = conv.id || (conv as any).external_id
    setActiveSessionId(convExtId.current)
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("razent_ai_conversation_id", convExtId.current)
    }

    if (Array.isArray(conv.messages) && conv.messages.length > 0) {
      const restoredMsgs: ChatMessage[] = conv.messages.map((m: any, idx) => ({
        id: m.id || `msg_hist_${idx}`,
        role: (m.role === "customer" || m.role === "user" ? "user" : "assistant") as ChatRole,
        content: m.text || m.content || "",
        timestamp: m.at ? new Date(m.at).getTime() : Date.now(),
        products: m.products,
        orderCheckout: m.orderCheckout,
      }))
      setMessages(restoredMsgs)
    } else {
      setMessages([])
    }
    setIsLoading(false)
    setActiveToolCall(null)
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return
      abortRef.current = false

      const trimmedText = text.trim()
      const isCheckoutIntent = CHECKOUT_INTENT_REGEX.test(trimmedText)

      // Find the most recent assistant message with recommended products
      const lastAssistantWithProducts = [...messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.products && m.products.length > 0)
      const recentProducts = lastAssistantWithProducts?.products || []

      // In-chat cart synchronization: Add items immediately when requested
      const { added } = syncCartFromUserIntent(trimmedText, recentProducts, products)
      if (added.length === 1) {
        toast.success(`Added ${added[0].qty > 1 ? `${added[0].qty}× ` : ""}${added[0].product.title} to cart!`)
      } else if (added.length > 1) {
        toast.success(`Added ${added.length} items to your cart!`)
      }

      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: trimmedText,
        timestamp: Date.now(),
      }

      const updatedWithUser = [...messages, userMsg]
      setMessages(updatedWithUser)
      void persistConversation(updatedWithUser, "active")
      setIsLoading(true)
      setActiveToolCall(null)

      const historyForAI = updatedWithUser
        .filter((m) => m.role !== "system")
        .slice(-20)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

      try {
        const result = await executeChatAgentTurn({
          messages: historyForAI,
          sessionId: convExtId.current,
          catalog: products,
          onToolCall: (toolName) => {
            if (!abortRef.current) setActiveToolCall(toolName)
          },
        })

        if (abortRef.current) return

        // If assistant triggered a checkoutAction product, ensure it's in the cart
        if (result.checkoutAction?.product) {
          const chkProduct = result.checkoutAction.product
          const alreadyInCart = useCart.getState().items.some((i) => i.product.id === chkProduct.id)
          if (!alreadyInCart) {
            useCart.getState().addToCart(chkProduct, 1)
          }
        }

        // Check if order checkout card should be attached
        let orderCheckout: ChatMessage["orderCheckout"] = undefined
        const currentCart = useCart.getState().items

        if (
          isCheckoutIntent ||
          result.checkoutAction ||
          /order summary|proceed to checkout|prepared your order/i.test(result.text)
        ) {
          if (currentCart.length > 0) {
            orderCheckout = {
              products: currentCart.map((ci) => ci.product),
              totalPaise: currentCart.reduce((sum, ci) => sum + (ci.product.price_paise || 0) * ci.qty, 0),
            }
          } else if (result.products && result.products.length > 0) {
            // If the cart was empty but the AI prepared an order for recommended items, add them to cart
            result.products.forEach((p) => useCart.getState().addToCart(p, 1))
            const freshCart = useCart.getState().items
            orderCheckout = {
              products: freshCart.map((ci) => ci.product),
              totalPaise: freshCart.reduce((sum, ci) => sum + (ci.product.price_paise || 0) * ci.qty, 0),
            }
          }
        }

        // Log customer_request to DB audit session
        logAuditEvent({
          session_id: convExtId.current,
          customer: customerName || customerEmail || "Online Customer",
          actor_label: "Customer",
          event: {
            id: `ev_${Date.now()}_req`,
            type: "customer_request",
            timestamp: new Date().toISOString(),
            actor: "Customer",
            source: "AI Agent",
            result: "Success",
            reason: `User inquiry: "${trimmedText.slice(0, 100)}"`,
            payload_summary: trimmedText,
            status_code: 200,
          },
        }).catch(() => {})

        const assistantMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: result.text,
          timestamp: Date.now(),
          toolCallsExecuted: result.toolCallsExecuted,
          products: result.products,
          checkoutAction: result.checkoutAction,
          orderCheckout,
        }

        // Log product_recommendation if recommendations were made
        if (result.products && result.products.length > 0) {
          logAuditEvent({
            session_id: convExtId.current,
            customer: customerName || customerEmail || "Online Customer",
            actor_label: "AI Assistant",
            event: {
              id: `ev_${Date.now()}_rec`,
              type: "product_recommendation",
              timestamp: new Date().toISOString(),
              actor: "AI Assistant",
              source: "AI Agent",
              result: "Success",
              reason: `AI suggested ${result.products.length} product(s)`,
              payload_summary: result.products.map((p) => p.title).join(", "),
              related_product: result.products[0]?.title,
              status_code: 200,
            },
          }).catch(() => {})
        }

        // Log order_review_shown if checkout card attached
        if (orderCheckout) {
          logAuditEvent({
            session_id: convExtId.current,
            customer: customerName || customerEmail || "Online Customer",
            actor_label: "AI Assistant",
            event: {
              id: `ev_${Date.now()}_rev`,
              type: "order_review_shown",
              timestamp: new Date().toISOString(),
              actor: "AI Assistant",
              source: "AI Agent",
              result: "Success",
              reason: `Checkout review card presented for ${orderCheckout.products.length} items`,
              payload_summary: `Estimated: ₹${((orderCheckout.totalPaise || 0) / 100).toFixed(2)}`,
              status_code: 200,
            },
          }).catch(() => {})
        }

        const finalMsgs = [...updatedWithUser, assistantMsg]
        setMessages(finalMsgs)
        persistConversation(finalMsgs, orderCheckout ? "checkout_ready" : "active").catch(() => {})
        scheduleInactivity(finalMsgs)
        refreshHistory()
      } catch (err: any) {
        console.warn("[useAIChat] turn error:", err)
        const errorMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: "Sorry, I ran into an issue. Please try again in a moment.",
          timestamp: Date.now(),
        }
        setMessages([...updatedWithUser, errorMsg])
      } finally {
        setActiveToolCall(null)
        setIsLoading(false)
      }
    },
    [
      messages,
      isLoading,
      products,
      cartItems,
      persistConversation,
      scheduleInactivity,
      refreshHistory,
    ]
  )

  const clearChat = useCallback(() => {
    startNewChat()
  }, [startNewChat])

  const stopGeneration = useCallback(() => {
    abortRef.current = true
    setIsLoading(false)
    setActiveToolCall(null)
  }, [])

  return {
    messages,
    isLoading,
    activeToolCall,
    activeSessionId,
    conversationsHistory,
    isLoadingHistory,
    sendMessage,
    clearChat,
    startNewChat,
    loadConversation,
    refreshHistory,
    stopGeneration,
    storeName: storeProfile.storeName || "Razent",
    customerName,
    customerEmail,
    isSignedIn: Boolean(clerkUser || customAuthUser),
  }
}
