/**
 * Razent — create-merchant Edge Function (Q12-C)
 *
 * Admin-issued invite. An existing super_admin (or the bootstrap operator)
 * calls this with { email, full_name, business_name } + a shared secret in
 * the X-Admin-Secret header. The function:
 *   1. Creates a new auth.users row (admin API, bypasses RLS)
 *   2. The handle_new_user trigger auto-creates a profiles row with role
 *      'customer' by default
 *   3. We then UPDATE profiles.role to 'merchant' + add delivery_promise
 *   4. Returns the user_id so the admin can hand it off
 *
 * The merchant then signs in via magic link (Supabase signInWithOtp) and
 * lands on /admin with full merchant permissions.
 *
 * Deploy:
 *   supabase functions deploy create-merchant --no-verify-jwt
 *   supabase secrets set RAZENT_ADMIN_SECRET=***
 */
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RAZENT_ADMIN_SECRET = Deno.env.get("RAZENT_ADMIN_SECRET") ?? ""

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 })
  }

  // Verify the admin secret header
  const provided = req.headers.get("X-Admin-Secret") ?? ""
  if (!RAZENT_ADMIN_SECRET || provided !== RAZENT_ADMIN_SECRET) {
    return new Response(
      JSON.stringify({ error: "forbidden", reason: "invalid_admin_secret" }),
      { status: 401, headers: { "content-type": "application/json" } },
    )
  }

  let body: { email?: string; full_name?: string; business_name?: string }
  try {
    body = await req.json()
  } catch {
    return new Response("invalid json", { status: 400 })
  }

  const email = (body.email ?? "").trim().toLowerCase()
  const full_name = (body.full_name ?? "").trim()
  const business_name = (body.business_name ?? "").trim()

  if (!email || !full_name) {
    return new Response(
      JSON.stringify({ error: "missing_fields", required: ["email", "full_name"] }),
      { status: 400, headers: { "content-type": "application/json" } },
    )
  }

  // Step 1: create the auth.users row via the admin API.
  // We use generateLink instead of createUser so we don't have to set a
  // password — the user clicks a magic link and sets it themselves.
  const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      data: { full_name, role: "merchant", business_name },
      redirectTo: `${req.headers.get("origin") ?? "http://localhost:8443"}/admin`,
    },
  })

  if (linkErr || !link?.user) {
    return new Response(
      JSON.stringify({ error: "auth_create_failed", detail: linkErr?.message }),
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }

  const userId = link.user.id

  // Step 2: update profile to merchant role + business name.
  // The handle_new_user trigger created a 'customer' row; we patch it.
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      role: "merchant",
      full_name,
      email,
      metadata: { business_name },
    })
    .eq("user_id", userId)

  if (profileErr) {
    return new Response(
      JSON.stringify({ error: "profile_update_failed", detail: profileErr.message }),
      { status: 500, headers: { "content-type": "application/json" } },
    )
  }

  return new Response(
    JSON.stringify({
      ok: true,
      user_id: userId,
      email,
      full_name,
      business_name,
      // The magic link URL Razent should email to the new merchant
      action_link: link.properties?.action_link ?? null,
    }),
    { headers: { "content-type": "application/json" } },
  )
})
