/**
 * Supabase client (lazy). Env vars:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * If env is missing, `supabase` is `null` and the API client falls back
 * to in-memory storage (see lib/storage/*). Never throws at import time.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null

export const isSupabaseEnabled = () => supabase !== null
