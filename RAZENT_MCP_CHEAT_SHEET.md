# ⚡ Razent Quick Commerce: MCP Connection Cheat Sheet

> [!IMPORTANT]
> **Production MCP Endpoint:** `https://razent.vercel.app/mcp`  
> **Direct Edge Gateway:** `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp`  
> **OpenAPI 3.1 Spec (ChatGPT / Grok):** `https://razent.vercel.app/.well-known/openapi.json`  
> **Customer Storefront & Wallet:** `https://razent.vercel.app` & `https://razent.vercel.app/wallet`  
> **Manifests:** `/.well-known/mcp.json` & `/.well-known/agent.json`  
> **Tools:** 7 Deterministic Tools | **Resources:** `razent://store/aisles` | **Prompts:** `shopping_assistant`

---

## 1. 🟣 Claude Desktop Setup

### Config File Location
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json` *(Press `Win + R`, paste, and press Enter)*
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Copy & Paste JSON
```json
{
  "mcpServers": {
    "razent-commerce": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@0.1.15",
        "https://razent.vercel.app/mcp"
      ],
      "env": {
        "RAZENT_CUSTOMER_TOKEN": "rz_agt_live_YOUR_TOKEN_FROM_WALLET_PAGE"
      }
    }
  }
}
```

> [!TIP]
> After saving, completely quit Claude Desktop (check system tray/menu bar) and restart it. You will see a 🔌 hammer/plug icon showing **7 Razent Tools** ready for use (including autonomous wallet purchases and live order tracking). The `RAZENT_CUSTOMER_TOKEN` is optional and allows autonomous wallet ordering.

---

## 2. ⚡ Claude Code CLI Setup

Run this single command in your terminal:

```bash
claude mcp add razent-commerce -- npx -y mcp-remote@0.1.15 https://razent.vercel.app/mcp
```

Verify connection:
```bash
claude mcp list
```

---

## 3. 🟢 ChatGPT (Custom GPT) Setup

### Step-by-Step Instructions
1. Open [ChatGPT GPT Builder](https://chatgpt.com/gpts/editor).
2. Go to the **Configure** tab.
3. Paste the following fields:

#### Name
```text
Razent Quick Commerce Assistant
```

#### Description
```text
10-15 minute grocery & essentials delivery from Razent Superstore with autonomous wallet purchasing.
```

#### Instructions
```text
You are Razent AI, the official shopping and checkout assistant for the Razent Storefront (https://razent.vercel.app).
Your job is to help customers discover products, compare options, check wallet balances, prepare checkout sessions, and track orders using the Razent API.

Core Protocols:
1. Always call search_catalog to check live stock and prices across the 10 store aisles before answering product queries.
2. NEVER ORDER WITHOUT ASKING: When customer wants to buy, first call get_customer_wallet_status to check their wallet balance and spend limit. Present the items and total clearly, then ask: "Would you like me to pay using your Razent Wallet (Balance: ₹X), or would you prefer a checkout link to pay yourself?"
3. AUTONOMOUS WALLET PURCHASING: If customer confirms wallet payment, call execute_autonomous_purchase. All automated purchases are capped at ₹15,000 per NPCI regulations. If limits are exceeded, present the Balise UX recovery options.
4. MANUAL CHECKOUT SESSIONS: If customer prefers to pay themselves or order exceeds limits, ask for their delivery address (full name, phone, line1, city, pincode) and call create_checkout_session.
5. Format links strictly as clean markdown buttons:
   [Click here to Pay on Razorpay](url)
   [Click here to Track Live Delivery](url)
6. Never show raw URLs.
```

#### Actions Configuration
1. Scroll down to **Actions** and click **Create new action**.
2. Click **Import from URL** and paste:
```text
https://razent.vercel.app/.well-known/openapi.json
```
3. Click **Import**.
4. Set **Authentication** to `None`.
5. In **Privacy Policy**, paste: `https://razent.vercel.app`.
6. Click **Save** / **Publish**.

---

## 4. 🔵 Google Gemini Setup

### Option A: Google Antigravity (AGY) SDK / Python Agent
```python
import asyncio
from google.antigravity import Agent, LocalAgentConfig, types

# Connect to Razent Streamable HTTP MCP Server
mcp_servers = [
    types.McpStreamableHttpServer(
        name="razent_commerce",
        url="https://razent.vercel.app/mcp",
    )
]

config = LocalAgentConfig(mcp_servers=mcp_servers)

async def main():
    async with Agent(config) as agent:
        response = await agent.chat("Search for Amul milk and prepare a checkout session.")
        print(await response.text())

if __name__ == "__main__":
    asyncio.run(main())
```

### Option B: Official `google-genai` Python SDK (Gemini 2.5 Flash)
```python
import requests
from google import genai
from google.genai import types

client = genai.Client()

def search_razent_catalog(query: str) -> dict:
    """Search products in the Razent quick commerce grocery catalog."""
    res = requests.post(
        "https://razent.vercel.app/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "search_catalog",
                "arguments": {"query": query},
                "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28"}
            }
        }
    )
    return res.json().get("result", {})

def create_razent_checkout(item_id: str, quantity: int = 1) -> dict:
    """Prepare a Razent instant checkout session with Razorpay payment link."""
    res = requests.post(
        "https://razent.vercel.app/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "create_checkout_session",
                "arguments": {"items": [{"id": item_id, "quantity": quantity}]},
                "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28"}
            }
        }
    )
    return res.json().get("result", {})

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Find Amul milk in Razent catalog and create a checkout link for 2 packets.",
    config=types.GenerateContentConfig(
        tools=[search_razent_catalog, create_razent_checkout],
        temperature=0.2,
    )
)

print(response.text)
```

---

## 5. 🔴 xAI Grok Setup

### Grok Python Script with Dynamic Tool Discovery
```python
import os
import requests
from openai import OpenAI

# Initialize xAI client
xai_client = OpenAI(
    api_key=os.getenv("XAI_API_KEY"),
    base_url="https://api.x.ai/v1",
)

# 1. Fetch live tools from Razent MCP
res = requests.post(
    "https://razent.vercel.app/mcp",
    json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {
            "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28"}
        }
    }
).json()

tools_raw = res.get("result", {}).get("tools", [])

grok_tools = [
    {
        "type": "function",
        "function": {
            "name": t["name"],
            "description": t["description"],
            "parameters": t.get("inputSchema", {"type": "object", "properties": {}})
        }
    }
    for t in tools_raw
]

# 2. Query Grok
completion = xai_client.chat.completions.create(
    model="grok-beta",
    messages=[
        {
            "role": "system",
            "content": "You are Razent AI. Use the provided tools to query catalog and prepare checkout."
        },
        {
            "role": "user",
            "content": "What milk options are available at Razent?"
        }
    ],
    tools=grok_tools,
)

print(completion.choices[0].message)
```

---

## 6. 💻 Cursor IDE / Windsurf Setup

Create or edit `.cursor/mcp.json` in the root of your project:

```json
{
  "mcpServers": {
    "razent-commerce": {
      "url": "https://razent.vercel.app/mcp"
    }
  }
}
```

---

## 7. 🔄 Local n8n Stdio MCP Server (`razent-n8n-mcp-server`)

For running an MCP server via stdio in local pipelines:

```json
{
  "mcpServers": {
    "razent-n8n": {
      "command": "node",
      "args": [
        "c:/Users/hemal/Ragent/razent-n8n-mcp-server/dist/index.js"
      ],
      "env": {
        "N8N_SUPABASE_KEY": "<YOUR_SUPABASE_SERVICE_ROLE_OR_ANON_KEY>"
      }
    }
  }
}
```

---

## 8. 🛡️ Merchant Protocol Manager Console

Store operators can monitor all live MCP tools, ACP checkout sessions, active ECDSA P-256 merchant signing JWKs, and test protocol requests live on the Merchant Console:
- **URL**: `https://merchant.razent.vercel.app/protocols` (or `http://localhost:8443/protocols`)

---

## 9. 🔑 Customer Agent Passkey & Regulatory Caps

Customers can generate agent passkeys and set spending caps at **`https://razent.vercel.app/wallet`**:
- **Agent Passkey Token**: e.g., `rz_agt_live_...`
- **Strict Regulatory Cap**: Hard-capped at **₹15,000** (`1,500,000 paise`) per NPCI automated e-Mandate rules.
- **Recovery Choices**: Balise UX guidelines provide 3 options if limits or balances are exceeded (adjust limit, top-up wallet, or pay via manual checkout).

---

## 10. 🧪 Terminal Test Commands

### 1. Health & Server Info
```bash
curl -s https://razent.vercel.app/mcp
```

### 2. Protocol Discovery (MCP 2026-07-28)
```bash
curl -s -X POST https://razent.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"server/discover","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}'
```

### 3. Search Catalog
```bash
curl -s -X POST https://razent.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_catalog","arguments":{"query":"milk"},"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}'
```

### 4. Create In-App Checkout Session (Requires Delivery Address)
```bash
curl -s -X POST https://razent.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_checkout_session","arguments":{"items":[{"id":"prod_milk_1l","quantity":1}],"delivery_address":{"full_name":"Rahul Sharma","phone":"9876543210","line1":"Flat 402, Green Heights","city":"Bengaluru","pincode":"560001"}},"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}'
```

### 5. Check Customer Wallet Status & Auto-Spend Limits
```bash
curl -s -X POST https://razent.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_customer_wallet_status","arguments":{"auth_token":"rz_agt_live_demo"},"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}'
```

### 6. Read Store Aisles Resource
```bash
curl -s -X POST https://razent.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"resources/read","params":{"uri":"razent://store/aisles","_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}'
```

### 7. Fetch Shopping Assistant System Prompt
```bash
curl -s -X POST https://razent.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":6,"method":"prompts/get","params":{"name":"shopping_assistant","_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}'
```
