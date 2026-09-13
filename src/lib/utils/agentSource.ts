import type { Order } from "@/lib/types/order"
import type { Conversation } from "@/lib/types/conversation"

export type AgentSourceType =
  | "claude"
  | "chatgpt"
  | "gemini"
  | "store_agent"
  | "external_agent"
  | "direct_customer"

export interface AgentSourceInfo {
  type: AgentSourceType
  name: string
  shortLabel: string
  badgeClass: string
  dotClass: string
  color: string
  isAi: boolean
}

export function formatAgentName(rawId: string): string {
  if (!rawId) return "External Agent"
  
  let cleaned = rawId
    .replace(/^agent[_-]/i, "")
    .replace(/[_-]agent$/i, "")
    .replace(/[_-]v\d+$/i, "")
    .replace(/[_-]/g, " ")
    .trim()

  if (!cleaned) return "External Agent"

  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export function getOrderAgentSource(order: Partial<Order> | any): AgentSourceInfo {
  const protocol = (order?.commerce_protocol || "").toLowerCase()
  const externalId = (order?.external_id || order?.id || "").toUpperCase()
  const notes = (order?.notes || "").toLowerCase()
  const agentId = (order?.agent_id || "").toLowerCase()
  const convId = (order?.conversation_id || "").toLowerCase()

  // 1. Claude
  if (
    protocol === "mcp" ||
    externalId.startsWith("RAZ-MCP") ||
    notes.includes("claude") ||
    agentId.includes("claude")
  ) {
    return {
      type: "claude",
      name: "Claude",
      shortLabel: "Claude",
      badgeClass:
        "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      dotClass: "bg-purple-500",
      color: "#8B5CF6",
      isAi: true,
    }
  }

  // 2. Google Gemini
  if (
    protocol === "ap2" ||
    order?.ap2_mandate_chain_id ||
    notes.includes("gemini") ||
    agentId.includes("gemini")
  ) {
    return {
      type: "gemini",
      name: "Google Gemini",
      shortLabel: "Gemini",
      badgeClass:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      dotClass: "bg-blue-500",
      color: "#3B82F6",
      isAi: true,
    }
  }

  // 3. ChatGPT
  if (
    (protocol === "acp" && !agentId && !notes) ||
    notes.includes("chatgpt") ||
    notes.includes("openai") ||
    agentId.includes("chatgpt") ||
    agentId.includes("openai")
  ) {
    return {
      type: "chatgpt",
      name: "ChatGPT",
      shortLabel: "ChatGPT",
      badgeClass:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      color: "#10B981",
      isAi: true,
    }
  }

  // 4. External Agent (with known name or generic fallback)
  if (
    agentId ||
    protocol === "ncpi_uap" ||
    protocol === "x402" ||
    (protocol === "acp" && agentId)
  ) {
    const rawName =
      agentId ||
      notes.match(/agent[:\s]+([a-zA-Z0-9_-]+)/i)?.[1] ||
      ""

    if (rawName && rawName !== "ncpi_uap" && rawName !== "acp") {
      const formatted = formatAgentName(rawName)
      return {
        type: "external_agent",
        name: `External Agent (${formatted})`,
        shortLabel: formatted,
        badgeClass:
          "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
        dotClass: "bg-cyan-500",
        color: "#06B6D4",
        isAi: true,
      }
    }

    return {
      type: "external_agent",
      name: "External Agent",
      shortLabel: "External",
      badgeClass:
        "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
      dotClass: "bg-cyan-500",
      color: "#06B6D4",
      isAi: true,
    }
  }

  // 5. Store Agent (In-App Storefront AI Assistant)
  if (order?.via_ai || convId || (protocol === "direct_web" && order?.via_ai)) {
    return {
      type: "store_agent",
      name: "Store Agent",
      shortLabel: "Store Agent",
      badgeClass:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      dotClass: "bg-amber-500",
      color: "#F59E0B",
      isAi: true,
    }
  }

  // 6. Direct Customer
  return {
    type: "direct_customer",
    name: "Direct Customer",
    shortLabel: "Customer",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    color: "#94A3B8",
    isAi: false,
  }
}

export function getConversationAgentSource(
  conv: Partial<Conversation> | any,
): AgentSourceInfo {
  const protocol = (conv?.protocol || "").toLowerCase()
  const agentId = (conv?.agent_id || "").toLowerCase()
  const convType = (conv?.type || "").toLowerCase()

  if (agentId.includes("claude") || protocol === "mcp") {
    return {
      type: "claude",
      name: "Claude",
      shortLabel: "Claude",
      badgeClass:
        "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
      dotClass: "bg-purple-500",
      color: "#8B5CF6",
      isAi: true,
    }
  }

  if (agentId.includes("gemini") || protocol === "ap2") {
    return {
      type: "gemini",
      name: "Google Gemini",
      shortLabel: "Gemini",
      badgeClass:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      dotClass: "bg-blue-500",
      color: "#3B82F6",
      isAi: true,
    }
  }

  if (
    agentId.includes("chatgpt") ||
    agentId.includes("openai") ||
    (protocol === "acp" && !agentId)
  ) {
    return {
      type: "chatgpt",
      name: "ChatGPT",
      shortLabel: "ChatGPT",
      badgeClass:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      color: "#10B981",
      isAi: true,
    }
  }

  if (
    agentId &&
    agentId !== "razent-ai-assistant" &&
    agentId !== "store-agent" &&
    agentId !== "direct_web"
  ) {
    const formatted = formatAgentName(conv.agent_id)
    return {
      type: "external_agent",
      name: `External Agent (${formatted})`,
      shortLabel: formatted,
      badgeClass:
        "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
      dotClass: "bg-cyan-500",
      color: "#06B6D4",
      isAi: true,
    }
  }

  if (convType === "agent_to_agent" || protocol === "x402" || protocol === "ncpi_uap") {
    return {
      type: "external_agent",
      name: "External Agent",
      shortLabel: "External",
      badgeClass:
        "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
      dotClass: "bg-cyan-500",
      color: "#06B6D4",
      isAi: true,
    }
  }

  return {
    type: "store_agent",
    name: "Store Agent",
    shortLabel: "Store Agent",
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dotClass: "bg-amber-500",
    color: "#F59E0B",
    isAi: true,
  }
}
