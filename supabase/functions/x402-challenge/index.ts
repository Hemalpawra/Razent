// x402 Challenge Edge Function
// Returns an HTTP 402 Payment Required response with the challenge payload.
// Other agents / clients see a `WWW-Authenticate: x402` header and
// pay-mandate sign-challenge auth flow.
//
// Deploy:
//   supabase functions deploy x402-challenge --no-verify-jwt
//
// Usage from Razent client:
//   fetch("/functions/v1/x402-challenge?order=ord_2026_0012")
//     returns 402 with { challenge_id, payment_url, amount_paise, ... }

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order");
  if (!orderId) {
    return new Response(
      JSON.stringify({ error: "missing ?order=" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("external_id, total_paise, currency, mandate_id, merchant_id, customer_id, status")
    .eq("external_id", orderId)
    .maybeSingle();

  if (error || !order) {
    return new Response(
      JSON.stringify({ error: "order_not_found" }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  const { data: challenge, error: chErr } = await supabase.rpc(
    "fn_create_x402_challenge",
    { p_order_external_id: order.external_id, p_mandate_id: order.mandate_id },
  );

  if (chErr || !challenge?.success) {
    return new Response(
      JSON.stringify({ error: chErr?.message ?? "challenge_failed" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const baseUrl = Deno.env.get("RAZENT_PUBLIC_URL") ?? new URL(req.url).origin;
  const wwwAuth =
    `x402 realm="razent", ` +
    `as_uri="${baseUrl}/functions/v1/x402-challenge", ` +
    `payment_url="${baseUrl}${challenge.payment_url}", ` +
    `challenge_id="${challenge.challenge_id}", ` +
    `amount_paise="${challenge.amount_paise}", currency="INR", protocol="x402"`;

  const responsePayload = {
    ...challenge,
    accepts: ["x402", "ncpi_uap", "razorpay"],
    realm: "razent",
  };

  return new Response(JSON.stringify(responsePayload), {
    status: 402,
    headers: {
      "content-type": "application/json",
      "www-authenticate": wwwAuth,
    },
  });
});
