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
} from "@/lib/api/client"
import { useCustomerAuth } from "@/state/useCustomerAuth"
import { useUser } from "@clerk/react"
import { useSettings } from "@/state/useSettings"
import type { Product } from "@/lib/types/product"
import type { Conversation } from "@/lib/types/conversation"
import { useCart } from "@/state/useCart"

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

        // Check if order checkout card should be attached
        let orderCheckout: ChatMessage["orderCheckout"] = undefined
        const candidateProducts =
          result.products && result.products.length > 0
            ? result.products
            : cartItems.map((ci) => ci.product)

        if (
          isCheckoutIntent ||
          result.checkoutAction ||
          /order summary|proceed to checkout|prepared your order/i.test(result.text)
        ) {
          if (candidateProducts.length > 0) {
            orderCheckout = {
              products: candidateProducts.slice(0, 4),
              totalPaise: candidateProducts.reduce((sum, p) => sum + (p.price_paise || 0), 0),
            }
          }
        }

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
