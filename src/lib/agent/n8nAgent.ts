import type { Product } from "@/lib/types/product"
import type { ChatAgentResult } from "./chatAgent"
import { supabase, isSupabaseConfigured } from "@/lib/api/supabase"

export const n8nWebhookUrl = import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL as string | undefined

const proxyDisabled =
  (import.meta.env.VITE_N8N_PROXY_DISABLED as string | undefined) === "1"

/** Proxy is the production path: browser -> Supabase Edge Function -> n8n. */
export const isN8nProxyEnabled = isSupabaseConfigured && !proxyDisabled

export const isN8nAgentEnabled = Boolean(
  isN8nProxyEnabled || (n8nWebhookUrl && n8nWebhookUrl.trim().length > 0),
)

type N8nPayload = {
  action: "sendMessage"
  sessionId: string
  session_id: string
  chatInput: string
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  surface: "store"
}

function normalizeN8nResult(data: any, catalog: Product[]): ChatAgentResult {
  let products: Product[] = []
  if (Array.isArray(data?.products) && data.products.length > 0) {
    products = data.products
  } else if (Array.isArray(data?.products_recommended) && data.products_recommended.length > 0) {
    products = data.products_recommended
  }

  const replyText =
    data?.text || data?.output || data?.last_message || data?.reply || "How can I assist you today?"
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
    checkoutAction: data?.checkoutAction,
    toolCallsExecuted: data?.toolCallsExecuted || ["n8n_chat_workflow"],
  }
}

async function callViaProxy(payload: N8nPayload): Promise<any | null> {
  if (!isN8nProxyEnabled) return null
  const { data, error } = await supabase.functions.invoke("n8n-chat-proxy", {
    body: payload,
  })
  if (error) {
    throw new Error(`n8n proxy unreachable: ${error.message}`)
  }
  if (data && typeof data === "object" && "error" in (data as any)) {
    const err = data as any
    // Proxy alive but n8n not configured upstream -> let direct URL / AI SDK take over
    if (err.error === "N8N_NOT_CONFIGURED") return null
    throw new Error(
      `n8n proxy: ${err.error}${err.status ? ` (upstream ${err.status})` : ""}${err.hint ? ` — ${err.hint}` : ""}`,
    )
  }
  return data
}

/** Direct browser -> n8n call. Local-dev fallback only (no secret, CORS applies). */
async function callDirect(targetUrl: string, payload: N8nPayload): Promise<Response> {
  // Never mangle Chat Trigger URLs (.../webhook/<uuid>/chat); they are valid as-is.
  const isChatTrigger = /\/webhook\/.+\/chat\/?$/.test(targetUrl)
  let url = targetUrl
  // Auto-correct if user pasted the n8n UI canvas URL
  if (url.includes("/workflow/")) {
    url = url.replace(/\/workflow\/.*$/, "/webhook/razent-chat")
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  // Production webhook 404 fallback only makes sense for Webhook nodes, not Chat Triggers.
  if (!isChatTrigger && response.status === 404 && url.includes("/webhook/")) {
    const testUrl = url.replace("/webhook/", "/webhook-test/")
    try {
      const testRes = await fetch(url.replace("/webhook/", "/webhook-test/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (testRes.ok) {
        return testRes
      }
    } catch {
      // Ignore test fallback error and throw the original response status below
    }
    void testUrl
  }
  return response
}

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
  if (!n8nWebhookUrl && !isN8nProxyEnabled) {
    throw new Error("n8n Webhook URL is not configured.")
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || ""
  const activeSessionId = sessionId || "razent-session"

  const payload: N8nPayload = {
    action: "sendMessage",
    sessionId: activeSessionId,
    chatInput: lastUserMsg,
    messages,
    session_id: activeSessionId,
    surface: "store",
  }

  onToolCall?.("n8n_ai_workflow")

  // Tier 0: backend proxy (production path — holds the shared secret, no CORS issues).
  if (isN8nProxyEnabled) {
    try {
      const viaProxy = await callViaProxy(payload)
      if (viaProxy) {
        return normalizeN8nResult(viaProxy, catalog)
      }
    } catch (proxyErr: any) {
      console.warn("[n8nAgent] proxy failed, trying direct/AI SDK:", proxyErr?.message)
      // If there is no direct URL configured, surface the proxy error so the
      // AI SDK fallback in chatAgent can take over with context.
      if (!n8nWebhookUrl) throw proxyErr
    }
  }

  if (!n8nWebhookUrl) {
    throw new Error("n8n proxy unavailable and no direct webhook URL configured.")
  }

  let response = await callDirect(n8nWebhookUrl, payload)

  if (!response.ok) {
    const hint =
      response.status === 404 && /\/webhook\/.+\/chat\/?$/.test(n8nWebhookUrl)
        ? " — Chat Trigger test URL? Activate the workflow or use its Production URL."
        : response.status === 404
          ? " — wrong path or workflow Inactive (use the Webhook node's Production URL)."
          : ""
    throw new Error(`n8n webhook responded with status ${response.status}${hint}`)
  }

  const data = await response.json()

  return normalizeN8nResult(data, catalog)
}
