import { create } from "zustand"
import type { Product } from "@/lib/types/product"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  products?: Product[]
  checkoutAction?: {
    title: string
    product: Product
  }
  orderPlaced?: {
    orderId: string
    totalRupees: string
  }
  isStreaming?: boolean
  timestamp: string
}

interface ChatStateStore {
  messages: ChatMessage[]
  toolExecution: string | null
  isLoading: boolean
  setToolExecution: (tool: string | null) => void
  setIsLoading: (loading: boolean) => void
  addMessage: (msg: ChatMessage) => void
  updateMessage: (id: string, updater: Partial<ChatMessage> | ((prev: ChatMessage) => ChatMessage)) => void
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void
  resetConversation: () => void
}

const STORAGE_KEY = "razent_chat_conversation"

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: "msg_welcome",
  role: "assistant",
  text: "Hello! I'm your AI Shopping Assistant. I have live access to our store catalog. Ask me to find products, compare items, check stock, or manage your cart!",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
}

function loadSavedMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return [INITIAL_WELCOME_MESSAGE]
}

function saveMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  } catch {}
}

export const useChatState = create<ChatStateStore>((set) => ({
  messages: loadSavedMessages(),
  toolExecution: null,
  isLoading: false,

  setToolExecution: (tool) => set({ toolExecution: tool }),
  setIsLoading: (isLoading) => set({ isLoading }),

  addMessage: (msg) => {
    set((state) => {
      const newMessages = [...state.messages, msg]
      saveMessages(newMessages)
      return { messages: newMessages }
    })
  },

  updateMessage: (id, updater) => {
    set((state) => {
      const newMessages = state.messages.map((m) => {
        if (m.id !== id) return m
        return typeof updater === "function" ? updater(m) : { ...m, ...updater }
      })
      saveMessages(newMessages)
      return { messages: newMessages }
    })
  },

  setMessages: (updater) => {
    set((state) => {
      const newMessages = typeof updater === "function" ? updater(state.messages) : updater
      saveMessages(newMessages)
      return { messages: newMessages }
    })
  },

  resetConversation: () => {
    const newWelcome: ChatMessage = {
      ...INITIAL_WELCOME_MESSAGE,
      id: `msg_welcome_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    saveMessages([newWelcome])
    set({ messages: [newWelcome], toolExecution: null, isLoading: false })
  },
}))
