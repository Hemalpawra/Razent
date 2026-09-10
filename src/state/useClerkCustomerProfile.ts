import { useAuth, useUser } from "@clerk/react"
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/api/supabase"

export type ClerkCustomerProfile = {
  clerk_user_id: string
  role: "customer"
  full_name: string | null
  email: string | null
  phone: string | null
  metadata: Record<string, any>
}

export function useClerkCustomerProfile() {
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const [profile, setProfile] = useState<ClerkCustomerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(isSignedIn))

  const syncProfile = useCallback(async (updates: Record<string, unknown> = {}) => {
    if (!user) return { profile: null, error: new Error("Not signed in") }
    const token = await getToken()
    if (!token) return { profile: null, error: new Error("Clerk session token unavailable") }
    const { data, error } = await supabase.functions.invoke("clerk-profile", {
      body: updates,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (error) return { profile: null, error }
    setProfile(data.profile)
    return { profile: data.profile as ClerkCustomerProfile, error: null }
  }, [getToken, user])

  useEffect(() => {
    let mounted = true
    if (!isSignedIn || !user) {
      setProfile(null)
      setIsLoading(false)
      return () => { mounted = false }
    }
    setIsLoading(true)
    syncProfile().finally(() => {
      if (mounted) setIsLoading(false)
    })
    return () => { mounted = false }
  }, [isSignedIn, syncProfile, user])

  const updateProfile = useCallback(async (updates: { full_name?: string; phone?: string; metadata?: Record<string, unknown> }) => {
    return syncProfile(updates)
  }, [syncProfile])

  return { profile, isLoading, isSignedIn: Boolean(isSignedIn), updateProfile, syncProfile }
}
