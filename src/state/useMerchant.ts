import { create } from "zustand"
import { supabase, getSession, signInWithOtp, signOut as supabaseSignOut, onAuthStateChange } from "@/lib/api/supabase"
import type { User } from "@supabase/supabase-js"

export type Permission =
  | "view_products"
  | "edit_products"
  | "delete_products"
  | "import_products"
  | "export_data"
  | "view_orders"
  | "refund_orders"
  | "view_ai_agent"
  | "edit_ai_settings"
  | "view_audit_trail"
  | "export_audit"
  | "view_analytics"
  | "edit_settings"

export type MerchantRole = "view_only" | "admin"

export const ROLE_PERMISSIONS: Record<MerchantRole, Record<Permission, boolean>> = {
  view_only: {
    view_products: true,
    edit_products: false,
    delete_products: false,
    import_products: false,
    export_data: false,
    view_orders: true,
    refund_orders: false,
    view_ai_agent: true,
    edit_ai_settings: false,
    view_audit_trail: true,
    export_audit: false,
    view_analytics: true,
    edit_settings: false,
  },
  admin: {
    view_products: true,
    edit_products: true,
    delete_products: true,
    import_products: true,
    export_data: true,
    view_orders: true,
    refund_orders: true,
    view_ai_agent: true,
    edit_ai_settings: true,
    view_audit_trail: true,
    export_audit: true,
    view_analytics: true,
    edit_settings: true,
  },
}

export type MerchantProfile = {
  id: string
  user_id: string
  role: "super_admin" | "merchant" | "view_only"
  merchant_role: MerchantRole
  email: string
  store_name?: string
  business_name?: string
  merchant_id: string
}

export const SEEDED_MERCHANT_ID = "b57fec42-c785-466e-b225-3f7a27edcccb"

const SESSION_STORAGE_KEY = "razent_merchant_auth_role"

type MerchantState = {
  user: User | null
  profile: MerchantProfile | null
  role: MerchantRole
  isLoading: boolean
  isAdmin: boolean
  hasPermission: (permission: Permission) => boolean
  signInViewOnly: () => void
  signInAdmin: (email: string, pass: string) => { success: boolean; error?: string }
  signIn: (email: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

function getStoredRole(): MerchantRole | null {
  try {
    return (localStorage.getItem(SESSION_STORAGE_KEY) as MerchantRole) || null
  } catch {
    return null
  }
}

function storeRole(role: MerchantRole | null) {
  try {
    if (role) localStorage.setItem(SESSION_STORAGE_KEY, role)
    else localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Ignore storage issues
  }
}

export const useMerchant = create<MerchantState>((set, get) => {
  const initialRole = getStoredRole() || "view_only"

  return {
    user: null,
    profile: null,
    role: initialRole,
    isLoading: true,
    isAdmin: initialRole === "admin",

    hasPermission: (permission: Permission) => {
      const currentRole = get().role
      return Boolean(ROLE_PERMISSIONS[currentRole]?.[permission])
    },

    signInViewOnly: () => {
      storeRole("view_only")
      const demoUser = {
        id: SEEDED_MERCHANT_ID,
        email: "viewonly@merchant.razent.com",
        app_metadata: {},
        user_metadata: { role: "view_only" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User

      const demoProfile: MerchantProfile = {
        id: "prof_view_only",
        user_id: SEEDED_MERCHANT_ID,
        role: "merchant",
        merchant_role: "view_only",
        email: "viewonly@merchant.razent.com",
        store_name: "Razent Supermarket",
        business_name: "Razent Instant Commerce",
        merchant_id: SEEDED_MERCHANT_ID,
      }

      set({
        user: demoUser,
        profile: demoProfile,
        role: "view_only",
        isAdmin: false,
        isLoading: false,
      })
    },

    signInAdmin: (email: string, pass: string) => {
      const trimmedEmail = email.trim().toLowerCase()
      if (trimmedEmail === "admin@merchant.razent.com" && pass === "Razent@628355") {
        storeRole("admin")
        const adminUser = {
          id: SEEDED_MERCHANT_ID,
          email: "admin@merchant.Razent.com",
          app_metadata: {},
          user_metadata: { role: "admin" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as unknown as User

        const adminProfile: MerchantProfile = {
          id: "prof_admin_primary",
          user_id: SEEDED_MERCHANT_ID,
          role: "super_admin",
          merchant_role: "admin",
          email: "admin@merchant.Razent.com",
          store_name: "Razent Supermarket",
          business_name: "Razent Instant Commerce",
          merchant_id: SEEDED_MERCHANT_ID,
        }

        set({
          user: adminUser,
          profile: adminProfile,
          role: "admin",
          isAdmin: true,
          isLoading: false,
        })
        return { success: true }
      }
      return { success: false, error: "Invalid admin credentials." }
    },

    signIn: async (email) => {
      await signInWithOtp(email)
      await get().refresh()
    },

    signOut: async () => {
      storeRole(null)
      try {
        await supabaseSignOut()
      } catch {
        // Continue
      }
      set({
        user: null,
        profile: null,
        role: "view_only",
        isAdmin: false,
        isLoading: false,
      })
    },

    refresh: async () => {
      const storedRole = getStoredRole()
      if (storedRole === "admin") {
        get().signInAdmin("admin@merchant.Razent.com", "Razent@628355")
        return
      } else if (storedRole === "view_only") {
        get().signInViewOnly()
        return
      }

      set({ isLoading: true })
      try {
        const session = await getSession()
        const user = session?.user ?? null
        if (!user) {
          // Default to View-only merchant mode so live DB data loads immediately
          get().signInViewOnly()
          return
        }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        const profile = (data as MerchantProfile) ?? null
        const isSuper = profile?.role === "super_admin"
        const assignedRole: MerchantRole = isSuper ? "admin" : "view_only"

        set({
          user,
          profile,
          role: assignedRole,
          isAdmin: isSuper,
          isLoading: false,
        })
      } catch {
        get().signInViewOnly()
      }
    },
  }
})

let initDone = false
export function initMerchantAuth() {
  if (initDone) return
  initDone = true
  useMerchant.getState().refresh()
  onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      useMerchant.getState().refresh()
    } else if (event === "SIGNED_OUT") {
      useMerchant.getState().signOut()
    }
  })
}
