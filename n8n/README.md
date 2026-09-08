# Razent AI Assistant — n8n Workflow

This directory contains the ready-to-import **n8n AI Shopping Agent workflow** for the Razent platform.

---

## 📁 Files
- **[`razent-ai-assistant-workflow.json`](file:///c:/Users/hemal/Ragent/Razent/n8n/razent-ai-assistant-workflow.json)**: The complete n8n workflow definition with LangChain AI Agent, NPCI guardrails, session memory, Supabase search tools, and formatted HTTP responses.

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

### Step 4: Connect to Razent Frontend

Add the webhook URL to your Razent [`.env`](file:///c:/Users/hemal/Ragent/Razent/.env) file:

```env
VITE_N8N_CHAT_WEBHOOK_URL=https://your-n8n.com/webhook/razent-chat
```
