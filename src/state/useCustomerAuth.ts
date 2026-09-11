import { create } from "zustand"
import { supabase } from "@/lib/api/supabase"
import type { User, Session, AuthError } from "@supabase/supabase-js"

export type CustomerProfile = {
  id?: number | string
  user_id: string
  role: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  metadata?: Record<string, any>
  created_at?: string
}

type CustomerAuthState = {
  user: User | null
  profile: CustomerProfile | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean
  signUp: (params: {
    email: string
    password: string
    fullName?: string
  }) => Promise<{ user: User | null; session: Session | null; error: AuthError | Error | null }>
  signIn: (params: {
    email: string
    password: string
  }) => Promise<{ user: User | null; session: Session | null; error: AuthError | Error | null }>
  signInWithOAuth: (
    provider: "google" | "apple",
  ) => Promise<{ error: AuthError | Error | null }>
  sendEmailOtp: (email: string) => Promise<{ error: AuthError | Error | null }>
  verifyEmailOtp: (params: {
    email: string
    token: string
  }) => Promise<{ user: User | null; session: Session | null; error: AuthError | Error | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>
  signOut: () => Promise<{ error: AuthError | Error | null }>
  fetchProfile: (userId: string) => Promise<CustomerProfile | null>
  updateProfile: (updates: {
    fullName?: string
    phone?: string
    metadata?: Record<string, any>
  }) => Promise<{ profile: CustomerProfile | null; error: Error | null }>
}

let isListenerAttached = false

export const useCustomerAuth = create<CustomerAuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isInitialized: false,

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (error) {
        console.warn("[useCustomerAuth] Failed to fetch profile:", error.message)
        return null
      }

      const prof = data as CustomerProfile | null
      set({ profile: prof })
      return prof
    } catch (err: any) {
      console.warn("[useCustomerAuth] Profile fetch exception:", err?.message)
      return null
    }
  },

  signUp: async ({ email, password, fullName }) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName?.trim() || splitEmailName(email),
          },
        },
      })

      if (error) {
        set({ isLoading: false })
        return { user: null, session: null, error }
      }

      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      })

      if (data.user) {
        await get().fetchProfile(data.user.id)
      }

      return { user: data.user, session: data.session, error: null }
    } catch (err: any) {
      set({ isLoading: false })
      return { user: null, session: null, error: err }
    }
  },

  signIn: async ({ email, password }) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        set({ isLoading: false })
        return { user: null, session: null, error }
      }

      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      })

      if (data.user) {
        await get().fetchProfile(data.user.id)
      }

      return { user: data.user, session: data.session, error: null }
    } catch (err: any) {
      set({ isLoading: false })
      return { user: null, session: null, error: err }
    }
  },

  signInWithOAuth: async (provider: "google" | "apple") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      })
      return { error }
    } catch (err: any) {
      return { error: err }
    }
  },

  sendEmailOtp: async (email: string) => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      })
      set({ isLoading: false })
      return { error }
    } catch (err: any) {
      set({ isLoading: false })
      return { error: err }
    }
  },

  verifyEmailOtp: async ({ email, token }: { email: string; token: string }) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: "email",
      })

      if (error) {
        set({ isLoading: false })
        return { user: null, session: null, error }
      }

      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      })

      if (data.user) {
        await get().fetchProfile(data.user.id)
      }

      return { user: data.user, session: data.session, error: null }
    } catch (err: any) {
      set({ isLoading: false })
      return { user: null, session: null, error: err }
    }
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })
      return { error }
    } catch (err: any) {
      return { error: err }
    }
  },

  signOut: async () => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.signOut()
      set({
        user: null,
        profile: null,
        session: null,
        isLoading: false,
      })
      return { error }
    } catch (err: any) {
      set({
        user: null,
        profile: null,
        session: null,
        isLoading: false,
      })
      return { error: err }
    }
  },

  updateProfile: async (updates) => {
    const user = get().user
    if (!user) {
      return { profile: null, error: new Error("Not logged in") }
    }

    try {
      const payload: any = { updated_at: new Date().toISOString() }
      if (updates.fullName !== undefined) payload.full_name = updates.fullName
      if (updates.phone !== undefined) payload.phone = updates.phone
      if (updates.metadata !== undefined) payload.metadata = updates.metadata

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", user.id)
        .select()
        .maybeSingle()

      if (error) {
        return { profile: null, error }
      }

      const updated = data as CustomerProfile
      set({ profile: updated })
      return { profile: updated, error: null }
    } catch (err: any) {
      return { profile: null, error: err }
    }
  },
}))

function splitEmailName(email: string): string {
  const local = email.split("@")[0] || "Customer"
  return local.charAt(0).toUpperCase() + local.slice(1)
}

/**
 * Initializes customer session once at app boot.
 */
export async function initCustomerAuth() {
  if (isListenerAttached) return
  isListenerAttached = true

  try {
    const { data, error } = await supabase.auth.getSession()
    if (!error && data.session?.user) {
      useCustomerAuth.setState({
        user: data.session.user,
        session: data.session,
        isLoading: false,
        isInitialized: true,
      })
      await useCustomerAuth.getState().fetchProfile(data.session.user.id)
    } else {
      useCustomerAuth.setState({
        user: null,
        profile: null,
        session: null,
        isLoading: false,
        isInitialized: true,
      })
    }
  } catch (err) {
    console.warn("[initCustomerAuth] Session recovery error:", err)
    useCustomerAuth.setState({
      user: null,
      profile: null,
      session: null,
      isLoading: false,
      isInitialized: true,
    })
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      useCustomerAuth.setState({
        user: session.user,
        session,
        isLoading: false,
        isInitialized: true,
      })
      await useCustomerAuth.getState().fetchProfile(session.user.id)
    } else {
      useCustomerAuth.setState({
        user: null,
        profile: null,
        session: null,
        isLoading: false,
        isInitialized: true,
      })
    }
  })
}
