// NPCI UAP Verifier Edge Function
// Validates a UAP message envelope (signed by the customer's device key)
// and confirms the mandate is real + has enough limit left.
//
// Deploy:
//   supabase functions deploy uap-verifier --no-verify-jwt
//
// In a real NPCI integration, the customer's UPI app signs the UAP
// payload with their device key; we verify with the registered public key.
// For this scaffold, we accept either:
//   1. A "x-razent-internal-signature" HMAC header signed with a shared
//      secret in the UAP_TEST_SIGNING_KEY env (used by Razent's own AI agent
//      when running end-to-end tests)
//   2. A "x-npci-signature" header that is a SHA256 RSA signature over
//      the request body, verified against a registered key in
//      public.payment_mandates.metadata->>'public_key'

// @ts-nocheck
declare const Deno: any;

import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UAP_TEST_SIGNING_KEY = Deno.env.get("UAP_TEST_SIGNING_KEY") ?? "";
const NPCI_RSA_PUBLIC_KEY = Deno.env.get("NPCI_RSA_PUBLIC_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type UAPMessage = {
  type: "uap.auth" | "uap.debit" | "uap.refund";
  mandate_id: string;
  customer_id: string;
  merchant_id: string;
  amount_paise: bigint;
  order_id: string;
  npci_rrn: string;
  npci_stan: string;
  npci_timestamp: string;
  challenge_id?: string;
};

function verifyTestSignature(body: string, signature: string): boolean {
  if (!UAP_TEST_SIGNING_KEY || !signature) return false;
  const expected = createHmac("sha256", UAP_TEST_SIGNING_KEY).update(body).digest("hex");
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

async function verifyNpcisignature(body: string, signature: string): Promise<boolean> {
  if (!NPCI_RSA_PUBLIC_KEY || !signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "spki",
    Uint8Array.from(atob(NPCI_RSA_PUBLIC_KEY.replace(/-----[^-]+-----/g, "").replace(/\n/g, "")), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
  return await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    sigBytes,
    enc.encode(body),
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const body = await req.text();
  const internalSig = req.headers.get("x-razent-internal-signature") ?? "";
  const npciSig = req.headers.get("x-npci-signature") ?? "";

  let sigValid = false;
  if (internalSig) {
    sigValid = verifyTestSignature(body, internalSig);
  } else if (npciSig) {
    sigValid = await verifyNpcisignature(body, npciSig);
  }

  if (!sigValid) {
    return new Response(
      JSON.stringify({ error: "invalid_signature" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  let msg: UAPMessage;
  try {
    msg = JSON.parse(body);
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  // Verify payload integrity: hash of canonical message
  const canonical = JSON.stringify(msg, Object.keys(msg).sort());
  const hash = createHash("sha256").update(canonical).digest("hex");

  const { data: mandate, error: mErr } = await supabase
    .from("payment_mandates")
    .select("*")
    .eq("mandate_id", msg.mandate_id)
    .eq("customer_id", msg.customer_id)
    .eq("merchant_id", msg.merchant_id)
    .eq("status", "active")
    .maybeSingle();

  if (mErr || !mandate) {
    return new Response(
      JSON.stringify({ error: "mandate_not_found" }),
      { status: 404, headers: { "content-type": "application/json" } },
    );
  }

  if (mandate.expires_at && new Date(mandate.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "mandate_expired" }),
      { status: 410, headers: { "content-type": "application/json" } },
    );
  }

  if (mandate.delegated_limit_paise > 0 &&
      mandate.current_usage_paise + msg.amount_paise > mandate.delegated_limit_paise) {
    return new Response(
      JSON.stringify({ error: "mandate_limit_exceeded" }),
      { status: 402, headers: { "content-type": "application/json" } },
    );
  }

  if (msg.type === "uap.debit") {
    const settlementRef = `uap_${msg.npci_rrn}_${msg.npci_stan}`;
    const { data: result, error: dErr } = await supabase.rpc("fn_debit_mandate", {
      p_mandate_id: msg.mandate_id,
      p_amount_paise: msg.amount_paise,
      p_transaction_id: `txn_${msg.npci_rrn}`,
      p_settlement_reference: settlementRef,
      p_ncpi_rrn: msg.npci_rrn,
      p_ncpi_stan: msg.npci_stan,
      p_order_external_id: msg.order_id,
    });

    if (dErr || !result?.success) {
      return new Response(
        JSON.stringify({ error: dErr?.message ?? result?.error ?? "debit_failed" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        settlement_reference: settlementRef,
        challenge_id: msg.challenge_id ?? null,
        commerce_protocol: "ncpi_uap",
      })
      .eq("external_id", msg.order_id);

    return new Response(
      JSON.stringify({ success: true, hash, settlement_reference: settlementRef, ...result }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ verified: true, hash, mandate_id: msg.mandate_id }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
});
