import { createClerkClient, verifyToken } from "npm:@clerk/backend@2"
import { createClient } from "jsr:@supabase/supabase-js@2"

const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY") || ""
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405)
  if (!clerkSecretKey) return response({ error: "CLERK_SECRET_KEY_NOT_CONFIGURED" }, 503)

  const authorization = req.headers.get("authorization") || ""
  const token = authorization.replace(/^Bearer\s+/i, "")
  if (!token) return response({ error: "missing_clerk_token" }, 401)

  try {
    const claims = await verifyToken(token, { secretKey: clerkSecretKey })
    const clerkUserId = String(claims.sub)
    const clerk = createClerkClient({ secretKey: clerkSecretKey })
    const clerkUser = await clerk.users.getUser(clerkUserId)
    const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress || null
    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null
    const body = await req.json().catch(() => ({}))

    const { data: existing } = await supabase
      .from("profiles")
      .select("metadata, phone")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle()

    const metadata = body.metadata && typeof body.metadata === "object"
      ? { ...(existing?.metadata || {}), ...body.metadata }
      : existing?.metadata || {}

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        clerk_user_id: clerkUserId,
        role: "customer",
        full_name: body.full_name || fullName,
        email: primaryEmail,
        phone: body.phone || existing?.phone || null,
        metadata,
        updated_at: new Date().toISOString(),
      }, { onConflict: "clerk_user_id" })
      .select("clerk_user_id, role, full_name, email, phone, metadata, created_at, updated_at")
      .single()

    if (error) return response({ error: error.message }, 400)
    return response({ profile: data })
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "invalid_clerk_token" }, 401)
  }
})
