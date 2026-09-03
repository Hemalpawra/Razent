// Execute Agent Checkout Edge Function
// The single entry point for AI agents / Razent UI to initiate a checkout.
// 1. Verifies AP2 / ACP mandate if provided
// 2. Decides auto-settle vs step-up based on merchant threshold
// 3. Routes to: NPCI UAP verifier (autonomous) or x402 challenge (step-up)
//
// Deploy:
//   supabase functions deploy execute-agent-checkout
//     (no --no-verify-jwt: requires a Supabase user JWT)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UAP_VERIFIER_URL = Deno.env.get("UAP_VERIFIER_URL") ?? "";
const X402_CHALLENGE_URL = Deno.env.get("X402_CHALLENGE_URL") ?? "";
const UAP_TEST_SIGNING_KEY = Deno.env.get("UAP_TEST_SIGNING_KEY") ?? "";

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

type CheckoutRequest = {
  order_id: string;
  protocol?: "ncpi_uap" | "acp" | "x402" | "direct_web";
  mandate?: {
    mandate_id: string;
    agent_name?: string;
    delegated_limit_paise?: number;
  };
  approval_threshold_rupees: number;
};

type CheckoutResult = {
  status: "settled" | "step_up" | "failed";
  protocol: "ncpi_uap" | "acp" | "x402" | "direct_web";
  settlement_reference?: string;
  challenge?: Record<string, unknown>;
  audit_session_id?: string;
  reason?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const userClient = createClient(
    SUPABASE_URL,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  let req_body: CheckoutRequest;
  try {
    req_body = (await req.json()) as CheckoutRequest;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const { order_id, mandate, approval_threshold_rupees, protocol = "ncpi_uap" } = req_body;
  const svc = createServiceClient();

  // 1. Load the order
  const { data: order, error: oErr } = await svc
    .from("orders")
    .select("*")
    .eq("external_id", order_id)
    .maybeSingle();

  if (oErr || !order) {
    return new Response(JSON.stringify({ error: "order_not_found" }), {
      status: 404, headers: { "content-type": "application/json" },
    });
  }

  // 2. AP2 / ACP mandate verification
  if (mandate) {
    const { data: mandateRow } = await svc
      .from("payment_mandates")
      .select("*")
      .eq("mandate_id", mandate.mandate_id)
      .eq("status", "active")
      .maybeSingle();

    if (!mandateRow) {
      await writeAudit(svc, order_id, "mandate", "Failed", "mandate not found or inactive");
      return jsonResponse({ status: "step_up", protocol: "x402", reason: "mandate_invalid" });
    }

    if (mandate.delegated_limit_paise &&
        mandateRow.current_usage_paise + order.total_paise > mandateRow.delegated_limit_paise) {
      await writeAudit(svc, order_id, "mandate", "Failed", "mandate_limit_exceeded");
      return jsonResponse({ status: "step_up", protocol: "x402", reason: "mandate_limit_exceeded" });
    }
  }

  // 3. Autonomous threshold check
  const thresholdPaise = approval_threshold_rupees * 100;
  if (order.total_paise > thresholdPaise) {
    await writeAudit(svc, order_id, "step_up", "Warning",
      `amount ${order.total_paise} > threshold ${thresholdPaise}`);
    const { data: challenge } = await svc.rpc("fn_create_x402_challenge", {
      p_order_external_id: order_id,
      p_mandate_id: mandate?.mandate_id ?? null,
    });
    return jsonResponse({
      status: "step_up",
      protocol: "x402",
      challenge,
    });
  }

  // 4. Autonomous settlement via NPCI UAP
  if (protocol === "ncpi_uap" && mandate && UAP_VERIFIER_URL) {
    const uapPayload = {
      type: "uap.debit",
      mandate_id: mandate.mandate_id,
      customer_id: order.customer_id,
      merchant_id: order.merchant_id,
      amount_paise: order.total_paise,
      order_id: order_id,
      npci_rrn: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      npci_stan: Math.floor(Math.random() * 999999).toString().padStart(6, "0"),
      npci_timestamp: new Date().toISOString(),
    };

    const uapRes = await fetch(UAP_VERIFIER_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(UAP_TEST_SIGNING_KEY
          ? { "x-razent-internal-signature": await hmac(JSON.stringify(uapPayload), UAP_TEST_SIGNING_KEY) }
          : {}),
      },
      body: JSON.stringify(uapPayload),
    });

    if (uapRes.ok) {
      const uapJson = await uapRes.json();
      await writeAudit(svc, order_id, "uap_settle", "Success", `rrn=${uapPayload.npci_rrn}`);
      return jsonResponse({
        status: "settled",
        protocol: "ncpi_uap",
        settlement_reference: uapJson.settlement_reference,
      });
    }
  }

  // 5. Fallback: x402 challenge (require human step-up)
  const { data: challenge } = await svc.rpc("fn_create_x402_challenge", {
    p_order_external_id: order_id,
    p_mandate_id: mandate?.mandate_id ?? null,
  });
  return jsonResponse({
    status: "step_up",
    protocol: "x402",
    challenge,
  });
});

async function writeAudit(
  svc: ReturnType<typeof createServiceClient>,
  orderId: string,
  type: string,
  result: "Success" | "Warning" | "Failed" | "Critical",
  reason?: string,
) {
  const event = {
    id: "audit-" + crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    actor: "AI Assistant",
    source: "Edge Function",
    result,
    reason,
    request_id: orderId,
    payload_summary: `protocol=execute-agent-checkout`,
  };
  const session_id = "sess-" + crypto.randomUUID();
  await svc.from("audit_sessions").insert({
    external_id: session_id,
    order_id: orderId,
    events: [event],
  });
}

async function hmac(body: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body: CheckoutResult): Response {
  return new Response(JSON.stringify(body), {
    status: 200, headers: { "content-type": "application/json" },
  });
}
