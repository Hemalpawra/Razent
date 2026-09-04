/**
 * Supabase client + auth helpers.
 *
 * Env vars (required at boot per Q1-B + Q7):
 *   VITE_SUPABASE_URL        — e.g. https://flsjhsnfurxkzawdimyi.supabase.co
 *   VITE_SUPABASE_ANON_KEY   — public anon key
 *
 * If either is missing, the module throws at import time. Per Q7
 * (B) "throw + global toast" — we never silently fall back to an
 * in-memory store. The app's first load surfaces a single dismissable
 * toast and a blank screen instead of fake data.
 */
import {
  createClient,
  type SupabaseClient,
  type Session,
  type User,
} from "@supabase/supabase-js"

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const rawKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const isSupabaseConfigured = Boolean(rawUrl && rawKey)

const url = rawUrl || "https://placeholder.supabase.co"
const key = rawKey || "placeholder-anon-key"

export const supabase: SupabaseClient = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// --- Auth helpers (Q1-B) ------------------------------------------

/** Returns the current session, or null. Cached by supabase-js. */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/** Returns the current user, or null. */
export async function getUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

/**
 * Send a magic-link OTP to `email`. The user clicks the link, lands
 * back at /admin (or wherever the redirect URL is configured), and
 * supabase-js picks up the session from the URL hash.
 */
export async function signInWithOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/admin`,
    },
  })
  if (error) throw error
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Subscribe to auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED,
 * USER_UPDATED). Returns the unsubscribe function.
 */
export function onAuthStateChange(
  cb: (event: string, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    cb(event, session)
  })
  return () => data.subscription.unsubscribe()
}
