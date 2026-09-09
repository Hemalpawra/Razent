/**
 * useAIChat - shared hook for the AI Assistant.
 * - Maintains in-memory message list and streaming UI state
 * - Routes through n8n first (if configured), then falls back to chatAgent
 * - Persists conversation to Supabase `conversations` for signed-in customers
 */
import { useState, useCallback, useRef } from "react"
import { executeChatAgentTurn } from "@/lib/agent/chatAgent"
import { upsertConversation } from "@/lib/api/client"
import { useCustomerAuth } from "@/state/useCustomerAuth"
import { useSettings } from "@/state/useSettings"
import type { Product } from "@/lib/types/product"

export type ChatRole = "user" | "assistant" | "system"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: number
  toolCallsExecuted?: string[]
  products?: Product[]
  checkoutAction?: { title: string; product: Product }
}

function genId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export const CHAT_SUGGESTIONS = [
  "Show me grocery deals",
  "Best electronics under ₹5000",
  "Track my order",
  "Healthy snacks options",
  "Office stationery",
  "Beauty & skincare",
]

export function useAIChat(products: Product[] = [], externalConversationId?: string) {
  const convExtId = useRef(externalConversationId || `ai_conv_${Date.now()}`)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null)
  const abortRef = useRef(false)

  const persistConversation = useCallback(async (msgs: ChatMessage[]) => {
    if (msgs.length === 0) return
    const state = useCustomerAuth.getState()
    const { storeProfile } = useSettings.getState()
    const last = msgs[msgs.length - 1]
    await upsertConversation({
      external_id: convExtId.current,
      customer_name:
        state.profile?.full_name ||
        (state.user?.email ? state.user.email.split("@")[0] : "Guest"),
      customer_email: state.profile?.email || state.user?.email || undefined,
      type: "human_customer",
      protocol: "direct_web",
      status: "active",
      last_message: last.content.slice(0, 200),
      messages: msgs.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    })
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return
      abortRef.current = false

      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      }

      const updatedWithUser = [...messages, userMsg]
      setMessages(updatedWithUser)
      setIsLoading(true)
      setActiveToolCall(null)

      const historyForAI = updatedWithUser
        .filter((m) => m.role !== "system")
        .slice(-20)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

      try {
        const result = await executeChatAgentTurn({
          messages: historyForAI,
          catalog: products,
          onToolCall: (toolName) => {
            if (!abortRef.current) setActiveToolCall(toolName)
          },
        })

        if (abortRef.current) return

        const assistantMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: result.text,
          timestamp: Date.now(),
          toolCallsExecuted: result.toolCallsExecuted,
          products: result.products,
          checkoutAction: result.checkoutAction,
        }

        const finalMsgs = [...updatedWithUser, assistantMsg]
        setMessages(finalMsgs)
        persistConversation(finalMsgs).catch(() => {})
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
    [messages, isLoading, products, persistConversation],
  )

  const clearChat = useCallback(() => {
    setMessages([])
    setIsLoading(false)
    setActiveToolCall(null)
    abortRef.current = false
    convExtId.current = `ai_conv_${Date.now()}`
  }, [])

  const stopGeneration = useCallback(() => {
    abortRef.current = true
    setIsLoading(false)
    setActiveToolCall(null)
  }, [])

  const { user } = useCustomerAuth()
  const { storeProfile } = useSettings()

  return {
    messages,
    isLoading,
    activeToolCall,
    sendMessage,
    clearChat,
    stopGeneration,
    storeName: storeProfile.storeName || "Razent",
    isSignedIn: Boolean(user),
  }
}
