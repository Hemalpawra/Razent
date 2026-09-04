import { create } from "zustand"
import { supabase, getSession, signInWithOtp, signOut, onAuthStateChange } from "@/lib/api/supabase"
import type { User } from "@supabase/supabase-js"

export type MerchantProfile = {
  id: string
  user_id: string
  role: "super_admin" | "merchant"
  email: string
  store_name?: string
  business_name?: string
  merchant_id: string
}

type MerchantState = {
  user: User | null
  profile: MerchantProfile | null
  isLoading: boolean
  isAdmin: boolean
  signIn: (email: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

export const useMerchant = create<MerchantState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAdmin: false,

  signIn: async (email) => {
    await signInWithOtp(email)
    // After signIn, refresh picks up new session
    await get().refresh()
  },

  signOut: async () => {
    await signOut()
    set({ user: null, profile: null, isAdmin: false })
  },

  refresh: async () => {
    set({ isLoading: true })
    try {
      const session = await getSession()
      const user = session?.user ?? null
      if (!user) {
        set({ user: null, profile: null, isAdmin: false, isLoading: false })
        return
      }
      // Fetch profile from DB
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
      const profile = (data as MerchantProfile) ?? null
      set({
        user,
        profile,
        isAdmin: profile?.role === "super_admin",
        isLoading: false,
      })
    } catch {
      set({ user: null, profile: null, isAdmin: false, isLoading: false })
    }
  },
}))

// Initialize: subscribe to auth changes and load session
let initDone = false
export function initMerchantAuth() {
  if (initDone) return
  initDone = true
  useMerchant.getState().refresh()
  onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      useMerchant.getState().refresh()
    } else if (event === "SIGNED_OUT") {
      useMerchant.setState({ user: null, profile: null, isAdmin: false, isLoading: false })
    }
  })
}
