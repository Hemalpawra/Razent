// Razorpay Webhook Edge Function
// Receives payment.authorized / payment.captured / payment.failed events,
// verifies the HMAC signature using the Razorpay webhook secret, then
// updates the corresponding order in public.orders + writes a
// public.payment_transactions row.
//
// Deploy:
//   supabase functions deploy razorpay-webhook --no-verify-jwt
//   supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=...
//
// Razent env (client):
//   VITE_RAZORPAY_WEBHOOK_URL = <function URL>

import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function verifySignature(rawBody: string, signature: string): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(
      new TextEncoder().encode(expected),
      new TextEncoder().encode(signature),
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return new Response(
      JSON.stringify({ error: "invalid signature" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const order = event.payload?.order?.entity;
  if (!payment && !order) {
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const razorpayOrderId = (payment?.order_id ?? order?.id) as string | undefined;
  if (!razorpayOrderId) {
    return new Response(JSON.stringify({ error: "missing order id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let newStatus: "paid" | "failed" | "refunded" = "paid";
  let reason: string | null = null;
  if (event.event === "payment.failed") {
    newStatus = "failed";
    reason = payment?.error_description ?? "payment failed";
  } else if (event.event === "refund.processed") {
    newStatus = "refunded";
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      status: newStatus,
      razorpay_payment_id: payment?.id,
      razorpay_signature: signature,
      paid_at: newStatus === "paid" ? new Date().toISOString() : null,
      settlement_reference: payment?.id,
    })
    .eq("razorpay_order_id", razorpayOrderId)
    .select("id, external_id, merchant_id, customer_id, total_paise, mandate_id, commerce_protocol")
    .maybeSingle();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  if (updated) {
    await supabase.from("payment_transactions").insert({
      transaction_id: payment?.id ?? "rzp_" + crypto.randomUUID(),
      order_id: updated.external_id,
      merchant_id: updated.merchant_id,
      customer_id: updated.customer_id,
      mandate_id: updated.mandate_id,
      protocol: "razorpay",
      direction: newStatus === "refunded" ? "refund" : "debit",
      amount_paise: updated.total_paise,
      settlement_ref: payment?.id,
      npci_rrn: null,
      npci_stan: null,
      status: newStatus === "paid" ? "settled" : newStatus === "failed" ? "failed" : "refunded",
      failure_reason: reason,
      raw_payload: event.payload,
    });
  }

  return new Response(
    JSON.stringify({ received: true, updated: !!updated }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
});

interface RazorpayEvent {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; error_description?: string } };
    order?: { entity: { id: string; amount: number } };
  };
}
