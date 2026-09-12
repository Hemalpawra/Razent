# 🔌 Razent Quick Commerce: Complete Multi-Platform MCP Connection Guide

This guide provides end-to-end instructions for connecting the **Razent Quick Commerce MCP Server** to all four major AI platforms:
1. **Claude (Anthropic)** — Claude Desktop, Claude Code, Claude API
2. **ChatGPT (OpenAI)** — Custom GPTs Actions, OpenAI API / Agents SDK
3. **Gemini (Google)** — Google Antigravity (AGY) SDK, Google GenAI SDK, Google AI Studio
4. **Grok (xAI)** — xAI API Function Calling & Agent Tooling

---

## 🌐 Public Endpoint & Discovery URLs

| Resource | URL |
|---|---|
| **Public MCP Server Endpoint** | `https://razent.vercel.app/mcp` |
| **Direct Edge Gateway** | `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp` |
| **MCP Specification Manifest** | `https://razent.vercel.app/.well-known/mcp.json` |
| **OpenAPI 3.1 Spec (For ChatGPT & Grok)** | `https://razent.vercel.app/.well-known/openapi.json` |
| **Agent Discovery Manifest** | `https://razent.vercel.app/.well-known/agent.json` |
| **Live Customer Storefront** | [https://razent.vercel.app](https://razent.vercel.app) |

---

## 1. 🤖 Claude (Anthropic) Connection

### A. Claude Desktop (macOS & Windows)

Claude Desktop natively supports Model Context Protocol. Because Razent operates over modern Streamable HTTP, we connect via the standard `mcp-remote` proxy wrapper.

#### Step 1: Locate your configuration file
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
  *(Press `Win + R`, paste `%APPDATA%\Claude`, press Enter)*
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Step 2: Add the Razent MCP configuration
Open or create `claude_desktop_config.json` and paste:

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

#### Step 3: Restart Claude Desktop
1. Completely quit Claude Desktop (check system tray / menu bar).
2. Relaunch Claude Desktop.
3. Click the 🔌 hammer/plug icon at the bottom right of the chat window.
4. You should see **5 Razent Commerce Tools**:
   - `search_catalog`
   - `create_checkout_session`
   - `get_checkout_session`
   - `track_orders`
   - `ap2_execute_autonomous_checkout`

---

### B. Claude Code CLI

If you use Anthropic's new `claude` CLI terminal tool:

```bash
claude mcp add razent-commerce -- npx -y mcp-remote https://razent.vercel.app/mcp
```

Verify with:
```bash
claude mcp list
```

---

### C. Claude Python SDK (Direct API Integration)

```python
import asyncio
from anthropic import Anthropic
from mcp import ClientSession
from mcp.client.sse import sse_client

client = Anthropic()

async def run():
    # Connect to Razent MCP Server
    async with sse_client("https://razent.vercel.app/mcp") as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # Fetch tools
            tools_response = await session.list_tools()
            claude_tools = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema
                }
                for tool in tools_response.tools
            ]

            # Send prompt to Claude 3.5 Sonnet
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                tools=claude_tools,
                messages=[{"role": "user", "content": "Find organic whole milk in Razent catalog"}]
            )
            print("Claude Response:", response)

if __name__ == "__main__":
    asyncio.run(run())
```

---

## 2. 🟢 ChatGPT (OpenAI) Connection

ChatGPT interacts with remote services via **Custom GPT Actions** (powered by OpenAPI 3.1) or through the **OpenAI API / Agents SDK**.

### A. ChatGPT Custom GPT (Web & Mobile UI)

#### Step 1: Open GPT Builder
1. Log into [ChatGPT](https://chatgpt.com).
2. In the left sidebar, click **Explore GPTs** &rarr; **+ Create** (top right).
3. Switch to the **Configure** tab.

#### Step 2: Set Name, Description & Instructions
- **Name**: `Razent Quick Commerce Assistant`
- **Description**: `10-15 minute grocery & essentials delivery from Razent Superstore.`
- **Instructions**:
```text
You are Razent AI, the official shopping and checkout assistant for the Razent Storefront (https://razent.vercel.app).
Your job is to help customers discover products, compare options, build carts, prepare checkout, and track orders. Use only real catalog data and real order data from the Razent API.

Core Rules:
1. Always search the catalog using searchUCPCatalog before stating prices or stock.
2. When customer wants to buy, use createACPSession to prepare checkout.
3. NEVER claim an order is placed or paid until payment is verified.
4. Format all payment and tracking links strictly as clean markdown buttons:
   [Click here to Pay on Razorpay](url)
   [Click here to Track Live Delivery](url)
5. Never show raw URLs.
```

#### Step 3: Add the Action
1. Scroll down to **Actions** and click **Create new action**.
2. Click **Import from URL**.
3. Paste the Razent OpenAPI spec URL:
   ```
   https://razent.vercel.app/.well-known/openapi.json
   ```
4. Click **Import**.
5. ChatGPT will automatically populate:
   - `searchUCPCatalog` (`GET /catalog`)
   - `createACPSession` (`POST /checkout_sessions`)
   - `getACPSession` (`GET /checkout_sessions/{session_id}`)
   - `trackOrders` (`GET /orders/track`)
6. **Authentication**: Set to **None** (Razent allows public customer shopping).
7. **Privacy Policy**: Enter `https://razent.vercel.app/privacy` (or `https://razent.vercel.app`).
8. Click **Save** &rarr; **Publish** (Only Me or Public).

---

### B. OpenAI Python API / Agents SDK

```python
import requests
from openai import OpenAI

client = OpenAI()

# Fetch OpenAPI tools from Razent
spec = requests.get("https://razent.vercel.app/.well-known/openapi.json").json()

# Execute a query with tool calling
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a shopping assistant connected to Razent Quick Commerce."},
        {"role": "user", "content": "Search for almond milk and show prices."}
    ],
    tools=[
        {
            "type": "function",
            "function": {
                "name": "search_catalog",
                "description": "Search products in Razent 10-15 min quick grocery delivery catalog.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search term e.g. milk, eggs"}
                    },
                    "required": ["query"]
                }
            }
        }
    ]
)

print(response.choices[0].message)
```

---

## 3. 🔵 Gemini (Google) Connection

Google Gemini supports tool execution via the **Google GenAI SDK**, **Google Antigravity SDK**, and **Google AI Studio**.

### A. Google Antigravity (AGY) SDK

If you are running autonomous multi-agent systems using the Google Antigravity framework:

```python
import asyncio
from google.antigravity import Agent, LocalAgentConfig, types

# Configure connection to Razent Streamable HTTP MCP Server
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

---

### B. Google GenAI Python SDK (`google-genai`)

Using the new official `google-genai` SDK with Gemini 2.5 Flash:

```python
import requests
from google import genai
from google.genai import types

client = genai.Client()

# Define Razent MCP tool function
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

# Provide tools to Gemini 2.5 Flash
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

## 4. 🔴 Grok (xAI) Connection

xAI Grok models (`grok-beta`, `grok-2-latest`) use OpenAI-compatible API schemas with native function calling.

### A. Grok Python Integration

```python
import os
import requests
from openai import OpenAI

# Initialize xAI Grok client
xai_client = OpenAI(
    api_key=os.getenv("XAI_API_KEY"),
    base_url="https://api.x.ai/v1",
)

RAZENT_MCP_URL = "https://razent.vercel.app/mcp"

# Dynamically discover tools from Razent MCP
mcp_tools_res = requests.post(
    RAZENT_MCP_URL,
    json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {
            "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28"}
        }
    }
).json()

tools_list = mcp_tools_res.get("result", {}).get("tools", [])

# Convert to xAI/OpenAI tool format
grok_tools = [
    {
        "type": "function",
        "function": {
            "name": t["name"],
            "description": t["description"],
            "parameters": t.get("inputSchema", {"type": "object", "properties": {}})
        }
    }
    for t in tools_list
]

# Query Grok
completion = xai_client.chat.completions.create(
    model="grok-beta",
    messages=[
        {
            "role": "system",
            "content": (
                "You are Razent AI, connecting customers to Razent 10-15 minute delivery. "
                "Use the provided tools to search products and prepare checkout."
            )
        },
        {
            "role": "user",
            "content": "Check if Razent has peanut butter or Nutella and prepare checkout for the best one."
        }
    ],
    tools=grok_tools,
)

tool_call = completion.choices[0].message.tool_calls[0]
print(f"Grok selected tool: {tool_call.function.name}")
print(f"Arguments: {tool_call.function.arguments}")
```

---

## 5. 🧪 Verification & Health Check

You can test the connectivity from your terminal at any time:

### Check Server Health
```bash
curl -s https://razent.vercel.app/mcp
```

### Check Protocol Handshake (MCP 2026-07-28)
```bash
curl -s -X POST https://razent.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "server/discover",
    "params": {
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28"
      }
    }
  }'
```

### Verify Checkout Links Point to Storefront
When `create_checkout_session` is called:
- **Payment Link**: Resolves to secure Razorpay or `https://razent.vercel.app/checkout?session=acp_...`
- **Callback**: Redirects to `https://razent.vercel.app/checkout/success?session=acp_...`
- **Tracking Link**: `https://razent.vercel.app/?track=...`
