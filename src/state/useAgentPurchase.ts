/**
 * useAgentPurchase - Global state management for autonomous AI Agent purchasing permissions.
 *
 * Enforces RBI & NPCI compliance guardrails:
 * - When enabled (true): The AI Assistant is authorized to prepare orders, apply tokens, and confirm purchases.
 * - When disabled (false): The AI Assistant is strictly blocked from placing orders.
 *
 * Persisted in localStorage and synced to Clerk profile metadata when signed in.
 */
import { useCallback, useEffect, useState } from "react"
import { useUser } from "@clerk/react"
import { useClerkCustomerProfile } from "./useClerkCustomerProfile"

const AGENT_PURCHASE_STORAGE_KEY = "razent_agent_purchase_enabled"
const AGENT_SPEND_LIMIT_STORAGE_KEY = "razent_agent_spend_limit_paise"
const AGENT_PURCHASE_EVENT = "razent-agent-purchase-change"
const AGENT_SPEND_LIMIT_EVENT = "razent-agent-spend-limit-change"

export const DEFAULT_SPEND_LIMIT_PAISE = 200000 // ₹2,000 default (NPCI auto-debit cap)

export function getAgentPurchaseEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = localStorage.getItem(AGENT_PURCHASE_STORAGE_KEY)
    if (raw !== null) {
      return raw === "true"
    }
  } catch {}
  return true // Default enabled for sandbox exploration
}

export function setAgentPurchaseEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(AGENT_PURCHASE_STORAGE_KEY, enabled ? "true" : "false")
    window.dispatchEvent(
      new CustomEvent(AGENT_PURCHASE_EVENT, { detail: { enabled } })
    )
  } catch {}
}

export function getAgentSpendLimitPaise(): number {
  if (typeof window === "undefined") return DEFAULT_SPEND_LIMIT_PAISE
  try {
    const raw = localStorage.getItem(AGENT_SPEND_LIMIT_STORAGE_KEY)
    if (raw !== null) {
      const parsed = parseInt(raw, 10)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
  } catch {}
  return DEFAULT_SPEND_LIMIT_PAISE
}

export function setAgentSpendLimitPaise(limitPaise: number): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(AGENT_SPEND_LIMIT_STORAGE_KEY, String(limitPaise))
    window.dispatchEvent(
      new CustomEvent(AGENT_SPEND_LIMIT_EVENT, { detail: { limitPaise } })
    )
  } catch {}
}

export function useAgentPurchase() {
  const { user } = useUser()
  const { profile, updateProfile } = useClerkCustomerProfile()

  const [enabled, setEnabled] = useState<boolean>(() => {
    if (profile?.metadata?.agentPurchaseEnabled !== undefined) {
      return Boolean(profile.metadata.agentPurchaseEnabled)
    }
    return getAgentPurchaseEnabled()
  })

  const [spendLimitPaise, setSpendLimit] = useState<number>(() => {
    if (profile?.metadata?.agentSpendLimitPaise !== undefined) {
      const val = Number(profile.metadata.agentSpendLimitPaise)
      if (!isNaN(val) && val > 0) return val
    }
    return getAgentSpendLimitPaise()
  })

  // Sync from Clerk profile metadata when available
  useEffect(() => {
    if (profile?.metadata?.agentPurchaseEnabled !== undefined) {
      const val = Boolean(profile.metadata.agentPurchaseEnabled)
      setEnabled(val)
      try {
        localStorage.setItem(AGENT_PURCHASE_STORAGE_KEY, val ? "true" : "false")
      } catch {}
    }
    if (profile?.metadata?.agentSpendLimitPaise !== undefined) {
      const val = Number(profile.metadata.agentSpendLimitPaise)
      if (!isNaN(val) && val > 0) {
        setSpendLimit(val)
        try {
          localStorage.setItem(AGENT_SPEND_LIMIT_STORAGE_KEY, String(val))
        } catch {}
      }
    }
  }, [profile?.metadata?.agentPurchaseEnabled, profile?.metadata?.agentSpendLimitPaise])

  // Listen to cross-component or cross-tab updates
  useEffect(() => {
    const handlePurchaseEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>
      if (customEvent.detail?.enabled !== undefined) {
        setEnabled(customEvent.detail.enabled)
      }
    }

    const handleSpendLimitEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ limitPaise: number }>
      if (customEvent.detail?.limitPaise !== undefined) {
        setSpendLimit(customEvent.detail.limitPaise)
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === AGENT_PURCHASE_STORAGE_KEY && e.newValue !== null) {
        setEnabled(e.newValue === "true")
      }
      if (e.key === AGENT_SPEND_LIMIT_STORAGE_KEY && e.newValue !== null) {
        const val = parseInt(e.newValue, 10)
        if (!isNaN(val) && val > 0) setSpendLimit(val)
      }
    }

    window.addEventListener(AGENT_PURCHASE_EVENT, handlePurchaseEvent)
    window.addEventListener(AGENT_SPEND_LIMIT_EVENT, handleSpendLimitEvent)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(AGENT_PURCHASE_EVENT, handlePurchaseEvent)
      window.removeEventListener(AGENT_SPEND_LIMIT_EVENT, handleSpendLimitEvent)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const setSetting = useCallback(
    async (nextValue: boolean) => {
      setEnabled(nextValue)
      setAgentPurchaseEnabled(nextValue)
      if (user) {
        await updateProfile({
          metadata: {
            ...(profile?.metadata || {}),
            agentPurchaseEnabled: nextValue,
          },
        })
      }
    },
    [user, profile, updateProfile]
  )

  const updateSpendLimit = useCallback(
    async (nextLimitPaise: number) => {
      setSpendLimit(nextLimitPaise)
      setAgentSpendLimitPaise(nextLimitPaise)
      if (user) {
        await updateProfile({
          metadata: {
            ...(profile?.metadata || {}),
            agentSpendLimitPaise: nextLimitPaise,
          },
        })
      }
    },
    [user, profile, updateProfile]
  )

  const toggle = useCallback(async () => {
    const next = !enabled
    await setSetting(next)
    return next
  }, [enabled, setSetting])

  return {
    agentPurchaseEnabled: enabled,
    spendLimitPaise,
    setAgentPurchaseEnabled: setSetting,
    setSpendLimitPaise: updateSpendLimit,
    toggle,
  }
}
