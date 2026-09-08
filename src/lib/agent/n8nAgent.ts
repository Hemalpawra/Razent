import type { Product } from "@/lib/types/product"
import type { ChatAgentResult } from "./chatAgent"

export const n8nWebhookUrl = import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL as string | undefined

export const isN8nAgentEnabled = Boolean(n8nWebhookUrl && n8nWebhookUrl.trim().length > 0)

/**
 * Execute chat agent turn by sending conversation history to the n8n workflow webhook.
 */
export async function executeN8nAgentTurn({
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
  if (!n8nWebhookUrl) {
    throw new Error("n8n Webhook URL is not configured.")
  }

  onToolCall?.("n8n_ai_workflow")

  const response = await fetch(n8nWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      session_id: sessionId || "razent-session",
      surface: "store",
    }),
  })

  if (!response.ok) {
    throw new Error(`n8n webhook responded with status ${response.status}`)
  }

  const data = await response.json()

  // Match returned product IDs or keywords to local catalog objects if provided
  let products: Product[] = []
  if (Array.isArray(data.products) && data.products.length > 0) {
    products = data.products
  }

  return {
    text: data.text || data.output || "I found what you were looking for.",
    products,
    checkoutAction: data.checkoutAction,
    toolCallsExecuted: data.toolCallsExecuted || ["n8n_agent_turn"],
  }
}
