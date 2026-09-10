// n8n-chat-proxy — backend proxy in front of the n8n AI workflow.
//
// Why this exists (per AGENTS.md §11 security rules):
// - The n8n webhook URL is public on the internet. A browser frontend
//   cannot hold a secret (Basic Auth / header token would be visible to
//   end users), so the ONLY genuine protection is a backend hop:
//   frontend -> this proxy (Supabase Auth gateway) -> n8n (shared secret).
// - This also fixes browser CORS: the browser only talks to Supabase
//   (which sends CORS headers), never to *.app.n8n.cloud directly.
//
// Deploy:
//   supabase secrets set N8N_WEBHOOK_URL=https://<you>.app.n8n.cloud/webhook/razent-chat
//   supabase secrets set N8N_SHARED_SECRET=<long-random-string>   # optional but recommended
//   supabase functions deploy n8n-chat-proxy --no-verify-jwt
//   (guest storefront has no login, so JWT verification stays OFF;
//   the shared secret between proxy -> n8n is the real gate.)
//
// n8n side: Webhook node POST path `razent-chat`, then a Code node that
// rejects requests whose `X-Razent-Token` header != your secret (401).

// @ts-nocheck
declare const Deno: any;

const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL") ?? "";
const N8N_SHARED_SECRET = Deno.env.get("N8N_SHARED_SECRET") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: CORS_HEADERS });
  }
  if (!N8N_WEBHOOK_URL) {
    return json(
      {
        error: "N8N_NOT_CONFIGURED",
        message: "N8N_WEBHOOK_URL secret is not set on the n8n-chat-proxy function.",
      },
      503,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const messages = (body.messages as Array<{ role: string; content: string }>) ?? [];
  const sessionId =
    (body.sessionId as string) || (body.session_id as string) || "razent-session";
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const n8nPayload = {
    action: "sendMessage",
    sessionId,
    session_id: sessionId,
    chatInput: (body.chatInput as string) || lastUser,
    messages,
    surface: (body.surface as string) || "store",
  };

  let n8nRes: Response;
  try {
    n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_SHARED_SECRET ? { "X-Razent-Token": N8N_SHARED_SECRET } : {}),
      },
      body: JSON.stringify(n8nPayload),
    });
  } catch (e) {
    return json(
      {
        error: "N8N_UNREACHABLE",
        message: `Proxy could not reach n8n: ${String(e?.message || e)}`,
        hint: "Check workflow is Active and N8N_WEBHOOK_URL is the Production URL.",
      },
      502,
    );
  }

  const rawText = await n8nRes.text();
  if (!n8nRes.ok) {
    return json(
      {
        error: "N8N_UPSTREAM_ERROR",
        status: n8nRes.status,
        body: rawText.slice(0, 500),
        hint:
          n8nRes.status === 404
            ? "n8n returned 404: wrong path (use the Webhook node's Production URL, path razent-chat) or workflow Inactive."
            : n8nRes.status === 401 || n8nRes.status === 403
              ? "n8n rejected auth: N8N_SHARED_SECRET mismatch."
              : "Check n8n Executions tab for the failed run.",
      },
      502,
    );
  }

  let upstreamData: any;
  try {
    upstreamData = JSON.parse(rawText);
  } catch {
    return json({ text: rawText, toolCallsExecuted: ["n8n_chat_workflow"] }, 200);
  }

  const upstreamText = String(
    upstreamData?.text || upstreamData?.output || upstreamData?.last_message || "",
  ).trim();
  const echoedInput = lastUser.trim().toLowerCase();

  if (!upstreamText || (echoedInput && upstreamText.toLowerCase() === echoedInput)) {
    const { data: savedConversation } = await supabase
      .from("conversations")
      .select("last_message, products_recommended, selected_product, status")
      .eq("external_id", sessionId)
      .maybeSingle();

    const savedText = String(savedConversation?.last_message || "").trim();
    if (savedText && savedText.toLowerCase() !== echoedInput) {
      return json(
        {
          text: savedText,
          output: savedText,
          products: savedConversation?.products_recommended || [],
          checkoutAction: savedConversation?.selected_product
            ? { product: savedConversation.selected_product }
            : null,
          status: savedConversation?.status || "active",
          toolCallsExecuted: ["n8n_chat_workflow", "conversation_readback"],
        },
        200,
      );
    }
  }

  return json(upstreamData, 200);
});
