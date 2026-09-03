/**
 * In-memory conversation store. Seeded from mockConversations. New AI
 * sessions created via executeAgentCheckout land here so the merchant
 * AIAgent live table reflects them in-session.
 */
import { mockConversations } from "@/lib/mock/conversations"
import type { Conversation } from "@/lib/types/conversation"

const store = new Map<string, Conversation>(
  mockConversations.map((c) => [c.id, c]),
)

export const conversationStore = {
  list(): Conversation[] {
    return Array.from(store.values()).sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    )
  },
  get(id: string): Conversation | null {
    return store.get(id) ?? null
  },
  upsert(input: Conversation): Conversation {
    store.set(input.id, input)
    return input
  },
  appendMessage(conversationId: string, message: Conversation["messages"][number]): Conversation | null {
    const c = store.get(conversationId)
    if (!c) return null
    c.messages = [...c.messages, message]
    c.last_message = message.text
    c.updated_at = message.at
    store.set(c.id, c)
    return c
  },
}
