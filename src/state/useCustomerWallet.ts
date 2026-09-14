/**
 * useCustomerWallet - Reactive Hook & State Manager for Customer Wallet,
 * Delivery Address, and Autonomous Agent Purchasing Permissions.
 *
 * Adheres to RBI & NPCI regulatory frameworks for automated e-mandates:
 * - Spend limit strictly capped at ₹15,000 per automated transaction.
 * - Live synchronization with Supabase public.customer_wallets and Clerk user sessions.
 */

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/react"
import type { CustomerWallet, CustomerAddress } from "@/lib/types/wallet"
import {
  NPCI_TRANSACTION_LIMIT_PAISE,
  DEFAULT_SPEND_LIMIT_PAISE,
  DEFAULT_WALLET_BALANCE_PAISE,
} from "@/lib/types/wallet"
import {
  getOrCreateCustomerWallet,
  updateCustomerWallet,
  topUpCustomerWallet,
  regenerateAgentAuthToken,
} from "@/lib/api/client"
import { toast } from "sonner"

export function useCustomerWallet() {
  const { user, isSignedIn } = useUser()
  const [wallet, setWallet] = useState<CustomerWallet | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const customerId = user?.id || null
  const customerEmail = user?.primaryEmailAddress?.emailAddress || null
  const customerName = user?.fullName || null
  const customerPhone = user?.primaryPhoneNumber?.phoneNumber || null

  const fetchWallet = useCallback(async () => {
    if (!customerId) {
      setWallet(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const data = await getOrCreateCustomerWallet({
        customerId,
        customerEmail,
        customerName,
        customerPhone,
      })
      setWallet(data)
    } catch (err: any) {
      console.error("[useCustomerWallet] Error loading wallet:", err)
      toast.error("Failed to load wallet data")
    } finally {
      setIsLoading(false)
    }
  }, [customerId, customerEmail, customerName, customerPhone])

  useEffect(() => {
    fetchWallet()
  }, [fetchWallet])

  const topUp = useCallback(
    async (amountPaise: number) => {
      if (!customerId || !wallet) {
        toast.error("You must be signed in to add funds to your wallet.")
        return
      }
      try {
        const updated = await topUpCustomerWallet(customerId, amountPaise)
        setWallet(updated)
        toast.success(`Added ₹${(amountPaise / 100).toLocaleString("en-IN")} to your Razent Wallet!`)
        return updated
      } catch (err: any) {
        console.error("[useCustomerWallet] Top-up error:", err)
        toast.error(err.message || "Failed to top up wallet")
        throw err
      }
    },
    [customerId, wallet]
  )

  const updateSpendLimit = useCallback(
    async (limitPaise: number) => {
      if (!customerId || !wallet) return
      if (limitPaise > NPCI_TRANSACTION_LIMIT_PAISE) {
        toast.error(`NPCI Cap: Spend limit cannot exceed ₹${(NPCI_TRANSACTION_LIMIT_PAISE / 100).toLocaleString("en-IN")}`)
        return
      }
      try {
        const updated = await updateCustomerWallet(customerId, {
          spend_limit_paise: limitPaise,
        })
        setWallet(updated)
        toast.success(`AI agent spend limit updated to ₹${(limitPaise / 100).toLocaleString("en-IN")}`)
        return updated
      } catch (err: any) {
        console.error("[useCustomerWallet] Spend limit error:", err)
        toast.error(err.message || "Failed to update spend limit")
        throw err
      }
    },
    [customerId, wallet]
  )

  const toggleAIPurchasing = useCallback(async () => {
    if (!customerId || !wallet) return
    const nextValue = !wallet.ai_purchases_enabled
    try {
      const updated = await updateCustomerWallet(customerId, {
        ai_purchases_enabled: nextValue,
      })
      setWallet(updated)
      toast(
        nextValue
          ? "AI Agent purchasing enabled: Connected agents are authorized to place orders within limits."
          : "AI Agent purchasing disabled: Automated purchases are strictly blocked."
      )
      return updated
    } catch (err: any) {
      console.error("[useCustomerWallet] Toggle AI error:", err)
      toast.error(err.message || "Failed to update AI purchase setting")
      throw err
    }
  }, [customerId, wallet])

  const updateAddress = useCallback(
    async (address: Partial<CustomerAddress>) => {
      if (!customerId || !wallet) return
      try {
        const merged: CustomerAddress = {
          full_name: address.full_name || wallet.default_address?.full_name || customerName || "",
          phone: address.phone || wallet.default_address?.phone || customerPhone || "",
          line1: address.line1 || wallet.default_address?.line1 || "",
          city: address.city || wallet.default_address?.city || "",
          state: address.state || wallet.default_address?.state || "Karnataka",
          pincode: address.pincode || wallet.default_address?.pincode || "",
          country: address.country || wallet.default_address?.country || "India",
        }
        const updated = await updateCustomerWallet(customerId, {
          default_address: merged,
        })
        setWallet(updated)
        toast.success("Default delivery address saved successfully!")
        return updated
      } catch (err: any) {
        console.error("[useCustomerWallet] Update address error:", err)
        toast.error(err.message || "Failed to update delivery address")
        throw err
      }
    },
    [customerId, wallet, customerName, customerPhone]
  )

  const regenerateToken = useCallback(async () => {
    if (!customerId || !wallet) return
    try {
      const newToken = await regenerateAgentAuthToken(customerId)
      setWallet((prev) => (prev ? { ...prev, agent_auth_token: newToken } : null))
      toast.success("New Agent Authorization Passkey generated successfully!")
      return newToken
    } catch (err: any) {
      console.error("[useCustomerWallet] Regenerate token error:", err)
      toast.error(err.message || "Failed to regenerate passkey")
      throw err
    }
  }, [customerId, wallet])

  return {
    wallet,
    isLoading,
    isSignedIn: Boolean(isSignedIn),
    topUp,
    updateSpendLimit,
    toggleAIPurchasing,
    updateAddress,
    regenerateToken,
    refresh: fetchWallet,
  }
}
