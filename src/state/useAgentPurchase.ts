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
const AGENT_PURCHASE_EVENT = "razent-agent-purchase-change"

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

export function useAgentPurchase() {
  const { user } = useUser()
  const { profile, updateProfile } = useClerkCustomerProfile()

  const [enabled, setEnabled] = useState<boolean>(() => {
    if (profile?.metadata?.agentPurchaseEnabled !== undefined) {
      return Boolean(profile.metadata.agentPurchaseEnabled)
    }
    return getAgentPurchaseEnabled()
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
  }, [profile?.metadata?.agentPurchaseEnabled])

  // Listen to cross-component or cross-tab updates
  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>
      if (customEvent.detail?.enabled !== undefined) {
        setEnabled(customEvent.detail.enabled)
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === AGENT_PURCHASE_STORAGE_KEY && e.newValue !== null) {
        setEnabled(e.newValue === "true")
      }
    }

    window.addEventListener(AGENT_PURCHASE_EVENT, handleEvent)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(AGENT_PURCHASE_EVENT, handleEvent)
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

  const toggle = useCallback(async () => {
    const next = !enabled
    await setSetting(next)
    return next
  }, [enabled, setSetting])

  return {
    agentPurchaseEnabled: enabled,
    setAgentPurchaseEnabled: setSetting,
    toggle,
  }
}
