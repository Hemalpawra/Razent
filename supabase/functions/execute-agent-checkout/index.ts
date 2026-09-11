// Execute Agent Checkout Edge Function
// The single entry point for AI agents / Razent UI to initiate a checkout.
// 1. Verifies AP2 / ACP mandate if provided
// 2. Decides auto-settle vs step-up based on merchant threshold
// 3. Routes to: NPCI UAP verifier (autonomous) or x402 challenge (step-up)
//
// Deploy:
//   supabase functions deploy execute-agent-checkout
//     (no --no-verify-jwt: requires a Supabase user JWT)

// @ts-nocheck
declare const Deno: any;

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UAP_VERIFIER_URL = Deno.env.get("UAP_VERIFIER_URL") ?? "";
const X402_CHALLENGE_URL = Deno.env.get("X402_CHALLENGE_URL") ?? "";
const UAP_TEST_SIGNING_KEY = Deno.env.get("UAP_TEST_SIGNING_KEY") ?? "";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_TXeysTR9U8Fyws";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "UuzZqB93v2obPdSyg3plRzKd";

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

type CheckoutRequest = {
  order_id: string;
  protocol?: "ncpi_uap" | "acp" | "ap2" | "x402" | "direct_web";
  mandate?: {
    mandate_id: string;
    agent_name?: string;
    delegated_limit_paise?: number;
  };
  approval_threshold_rupees: number;
};

type CheckoutResult = {
  status: "settled" | "step_up" | "failed";
  protocol: "ncpi_uap" | "acp" | "ap2" | "x402" | "direct_web";
  settlement_reference?: string;
  razorpay_order_id?: string;
  challenge?: Record<string, unknown>;
  audit_session_id?: string;
  reason?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const svc = createServiceClient();

  const { data: userData } = await svc.auth.getUser(token);
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

  // 4. Real Razorpay Test Rail Settlement for Autonomous Orders
  try {
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(order.total_paise),
        currency: "INR",
        receipt: `rcpt_${order_id.slice(0, 16)}`,
        notes: {
          external_order_id: order_id,
          protocol,
          mandate_id: mandate?.mandate_id ?? "none",
        },
      }),
    });

    if (rzpRes.ok) {
      const rzpData = await rzpRes.json();
      const settlementRef = `rzp_settle_${rzpData.id}`;

      // Update database order
      await svc
        .from("orders")
        .update({
          status: "paid",
          razorpay_order_id: rzpData.id,
          settlement_reference: settlementRef,
          paid_at: new Date().toISOString(),
        })
        .eq("external_id", order_id);

      await writeAudit(svc, order_id, "order_settled", "Success", `Razorpay Order: ${rzpData.id}`);

      return jsonResponse({
        status: "settled",
        protocol: protocol as any,
        razorpay_order_id: rzpData.id,
        settlement_reference: settlementRef,
      });
    }
  } catch (err) {
    console.error("Razorpay order creation error:", err);
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
