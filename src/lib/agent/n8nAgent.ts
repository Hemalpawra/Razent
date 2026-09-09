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

  let targetUrl = n8nWebhookUrl
  // Auto-correct if user pasted the n8n UI canvas URL
  if (targetUrl.includes("/workflow/")) {
    targetUrl = targetUrl.replace(/\/workflow\/.*$/, "/webhook/razent-chat")
  }

  onToolCall?.("n8n_ai_workflow")

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || ""
  const activeSessionId = sessionId || "razent-session"

  const payload = {
    action: "sendMessage",
    sessionId: activeSessionId,
    chatInput: lastUserMsg,
    messages,
    session_id: activeSessionId,
    surface: "store",
  }

  let response = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  // If production webhook returned 404, try the n8n test webhook in case canvas test is running
  if (response.status === 404 && targetUrl.includes("/webhook/")) {
    const testUrl = targetUrl.replace("/webhook/", "/webhook-test/")
    try {
      const testRes = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (testRes.ok) {
        response = testRes
      }
    } catch {
      // Ignore test fallback error and throw the original response status below
    }
  }

  if (!response.ok) {
    throw new Error(`n8n webhook responded with status ${response.status}`)
  }

  const data = await response.json()

  // Match returned product IDs or keywords to local catalog objects if provided
  let products: Product[] = []
  if (Array.isArray(data.products) && data.products.length > 0) {
    products = data.products
  } else if (Array.isArray(data.products_recommended) && data.products_recommended.length > 0) {
    products = data.products_recommended
  }

  // If n8n output mentioned catalog items in text, auto-attach their rich product cards
  const replyText = data.text || data.output || data.last_message || data.reply || "How can I assist you today?"
  if (products.length === 0 && catalog.length > 0 && typeof replyText === "string") {
    const textLower = replyText.toLowerCase()
    const detected = catalog.filter((p) => textLower.includes(p.title.toLowerCase()))
    if (detected.length > 0) {
      products = detected.slice(0, 4)
    }
  }

  return {
    text: replyText,
    products,
    checkoutAction: data.checkoutAction,
    toolCallsExecuted: data.toolCallsExecuted || ["n8n_chat_workflow"],
  }
}
