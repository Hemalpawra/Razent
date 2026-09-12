# ⚡ Razent Quick Commerce: MCP Connection Cheat Sheet

> [!IMPORTANT]
> **Production MCP Endpoint:** `https://razent.vercel.app/mcp`  
> **OpenAPI 3.1 Spec (ChatGPT / Grok):** `https://razent.vercel.app/.well-known/openapi.json`  
> **Customer Storefront:** `https://razent.vercel.app`  
> **Manifest:** `https://razent.vercel.app/.well-known/mcp.json`

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
        "mcp-remote",
        "https://razent.vercel.app/mcp"
      ]
    }
  }
}
```

> [!TIP]
> After saving, completely quit Claude Desktop (check system tray/menu bar) and restart it. You will see a 🔌 hammer/plug icon showing **5 Razent Tools** ready for use.

---

## 2. ⚡ Claude Code CLI Setup

Run this single command in your terminal:

```bash
claude mcp add razent-commerce -- npx -y mcp-remote https://razent.vercel.app/mcp
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
10-15 minute grocery & essentials delivery from Razent Superstore.
```

#### Instructions
```text
You are Razent AI, the official shopping and checkout assistant for the Razent Storefront (https://razent.vercel.app).
Your job is to help customers discover products, compare options, prepare checkout sessions, and track orders using the Razent API.

Rules:
1. Use searchUCPCatalog to check live stock and prices before answering product questions.
2. Use createACPSession to prepare checkout links with real Razorpay payments.
3. Never claim an order is placed or paid until payment is verified.
4. Format payment and tracking links strictly as clean markdown buttons:
   [Click here to Pay on Razorpay](url)
   [Click here to Track Live Delivery](url)
5. Never show raw URLs.
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

## 7. 🧪 Terminal Test Commands

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

### 4. Create Checkout Session
```bash
curl -s -X POST https://razent.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_checkout_session","arguments":{"items":[{"id":"milk","quantity":1}]},"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}'
```
