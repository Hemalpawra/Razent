# Razent AI Assistant — n8n Workflow

This directory contains the ready-to-import **n8n AI Shopping Agent workflow** for the Razent platform.

---

## 📁 Files
- **[`razent-ai-assistant-workflow.json`](file:///c:/Users/hemal/Ragent/Razent/n8n/razent-ai-assistant-workflow.json)**: The complete n8n workflow definition with LangChain AI Agent, NPCI guardrails, session memory, Supabase search tools, and formatted HTTP responses (dev version, no auth).
- **[`razent-ai-assistant-webhook.json`](file:///c:/Users/hemal/Ragent/Razent/n8n/razent-ai-assistant-webhook.json)**: Production version — same flow, but the Webhook trigger is preset to **Header Auth** (`X-Razent-Token`). Import this one for production.

---

## ⚠️ Chat Trigger vs Webhook — pick Webhook for the app

If your Cloud workflow URL looks like `.../webhook/<uuid>/chat`, it uses a **Chat Trigger** node (built for n8n's hosted chat widget). It works when you click Test inside n8n, but it is the wrong trigger for the app. The app needs a **Webhook** node (`.../webhook/razent-chat`).

**Migrate in the canvas (2 min, no re-import needed):**
1. Delete the **Chat Trigger** node.
2. Add **Webhook** → Method `POST`, Path `razent-chat`, Respond `Using 'Respond to Webhook' Node`.
3. Set **Authentication** → `Header Auth` (create credential below), then wire Webhook → `NPCI Guardrails & Sanitizer` (same edge the Chat Trigger had).
4. Save, toggle **Active**, copy the **Production URL**.

Or fresh-import `razent-ai-assistant-webhook.json` instead (already wired this way).

---

## 🚀 How to Import and Setup in n8n

### Step 1: Import Workflow into n8n
1. Open your **n8n instance** (e.g. `http://localhost:5678` or n8n Cloud).
2. Click **Workflows** in the sidebar.
3. Click the **`...` (Options menu)** in the top right and select **Import from File...**.
4. Select `razent-ai-assistant-workflow.json`.

---

### Step 2: Configure Credentials in n8n

1. **LLM Chat Model (OpenAI / OpenRouter / Anthropic / Gemini)**:
   - Double-click the **`OpenAI Chat Model`** node.
   - Add or select your OpenAI API Key (or swap this node for Anthropic / Gemini / DeepSeek / Ollama).

2. **Supabase HTTP Request Tools**:
   - Double-click **`Tool: Search Catalog`** and **`Tool: Track Order`**.
   - Update the URL with your Supabase Project ID:
     ```
     https://<YOUR_SUPABASE_PROJECT_ID>.supabase.co/rest/v1/products...
     ```
   - In **Generic Auth / Header Auth**, provide your Supabase `apikey` header and `Authorization: Bearer <SUPABASE_ANON_KEY>`.

---

### Step 3: Activate the Workflow and Copy Webhook URL

1. Toggle the workflow status in n8n from **Inactive** to **Active**.
2. Double-click the **`Razent Webhook Trigger`** node and copy the **Production URL** (e.g. `https://your-n8n.com/webhook/razent-chat`).

---

### Step 4: Lock the webhook with a shared secret (real protection)

The endpoint is public on the internet, so it needs authentication. Because the storefront is a browser app (any secret shipped in JS is visible to users), the secret must live **server-side**:

1. Generate a secret: `openssl rand -hex 32` (or any long random string).
2. In n8n, create **Credentials → Header Auth** → Name `X-Razent-Token`, Value `<secret>` → select it in the **Webhook** node's Authentication field.
3. Store the same values as Supabase function secrets (never in `VITE_` vars):
   ```bash
   supabase secrets set N8N_WEBHOOK_URL=https://<you>.app.n8n.cloud/webhook/razent-chat
   supabase secrets set N8N_SHARED_SECRET=<secret>
   supabase functions deploy n8n-chat-proxy --no-verify-jwt
   ```
   (`--no-verify-jwt` because guest shoppers have no login; the shared secret proxy → n8n is the real gate.)
4. Request path is now: **browser → `n8n-chat-proxy` (Supabase Auth gateway) → n8n (+ secret header)**. The browser never sees the secret, and CORS is a non-issue (browser only talks to Supabase).

> Direct browser → n8n (`VITE_N8N_CHAT_WEBHOOK_URL`) remains only as a local-dev fallback. Browser-held Basic Auth is NOT real protection — anyone can read it in DevTools.

---

### Step 5: Fix the "Offline" badge in production

The header badge shows `Offline` when **neither** the proxy **nor** a direct webhook URL is visible to the built app. `VITE_` vars are baked in at **build time**, so setting them after deploy does nothing until you rebuild:

1. Ensure the proxy is deployed (Step 4) — the app now prefers it automatically, no frontend env needed.
2. If you still want the direct fallback / AI SDK tier in production, set these in your host (e.g. Vercel → Project → Environment Variables) and **redeploy**:
   ```env
   VITE_N8N_CHAT_WEBHOOK_URL=https://<you>.app.n8n.cloud/webhook/razent-chat
   VITE_OPENROUTER_API_KEY=sk-or-v1-...
   VITE_LLM_MODEL=google/gemini-2.5-flash
   ```
3. Expected badge: `n8n Live` (proxy reachable) → `AI SDK` (proxy down, OpenRouter key set) → `Offline` (neither). If you see `Offline` after deploy, the build didn't include the env vars — rebuild.

---

### Step 6: Verify end-to-end

1. n8n → **Executions**: hit Send in the app, confirm a green production execution (not a manual/test one).
2. App DevTools → Network → `n8n-chat-proxy`: expect 200 with `{ text, products }`. A 502 tells you which hop failed (`N8N_UNREACHABLE` / `N8N_UPSTREAM_ERROR` + hint).
3. Supabase tool URLs: `Tool: Search Catalog` / `Track Order` must use your real `<PROJECT_ID>.supabase.co` URL (not the `YOUR_SUPABASE_PROJECT_ID` placeholder) or the agent answers without products.
