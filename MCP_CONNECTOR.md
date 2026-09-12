# Razent Public Model Context Protocol (MCP) Connector

The Razent Model Context Protocol (MCP) Server enables external AI clients (Claude.ai, Claude Desktop, Cursor, ChatGPT, Google Antigravity SDK agents, and autonomous commerce agents) to directly browse our catalog, prepare checkout sessions with real Razorpay payment links, and track delivery orders.

Built according to the authoritative **Model Context Protocol (MCP) 2026-07-28 specification** ([modelcontextprotocol.io/specification/2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28.md)) with backward compatibility for **2025-11-25** and **2024-11-05**.

---

## 🌐 Public Endpoint

| Parameter | Value |
|---|---|
| **Public MCP Endpoint** | `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp` |
| **Transport** | **Streamable HTTP (JSON-RPC 2.0)** |
| **Active MCP Specification** | **`2026-07-28` (Latest authoritative)** |
| **Supported Protocol Versions** | `["2026-07-28", "2025-11-25", "2024-11-05"]` |
| **State Model** | **Stateless per-request** (`_meta.io.modelcontextprotocol/...`) + `server/discover` RPC |
| **Auth Required** | None (Public anonymous catalog browsing & checkout session prep) |
| **Live Storefront** | [https://razent-merchant.vercel.app](https://razent-merchant.vercel.app) |
| **Well-Known Manifest** | [https://razent-merchant.vercel.app/.well-known/mcp.json](https://razent-merchant.vercel.app/.well-known/mcp.json) |
| **Agent Manifest** | [https://razent-merchant.vercel.app/.well-known/agent.json](https://razent-merchant.vercel.app/.well-known/agent.json) |

---

## 🛠 Available MCP Tools (Deterministic Order)

| Tool Name | Protocol | Description |
|---|---|---|
| `ap2_execute_autonomous_checkout` | **AP2** | Execute autonomous Human-Not-Present purchase under Google AP2 protocol with real Razorpay test settlement. Verifies delegated spending cap. |
| `create_checkout_session` | **ACP** | Creates an Agentic Commerce Protocol (ACP) checkout session and generates a verified Razorpay payment link. **Strict Human-in-the-loop: user must click to pay.** |
| `get_checkout_session` | **ACP** | Checks live payment and order settlement status. Polls Razorpay in real time: when customer completes payment, automatically settles the order and generates tracking and invoice links. |
| `search_catalog` | **UCP** | Search products in Razent 10-15 min quick grocery delivery catalog via Universal Commerce Protocol (UCP). Features typo tolerance, category filtering, plural stemming, and price ceilings. Returns matching items with price in rupees, stock, and high-res images. |
| `track_orders` | **UCP / ACP** | Track live order delivery and history by Order ID (e.g. `RAZ-A2A-MTY6O735`), customer mobile phone, or email. Returns delivery timeline stage, items, address, and downloadable tax invoice link. |

---

## 📦 Official SDK Recommendations

From [modelcontextprotocol.io/docs/2026-07-28/sdk](https://modelcontextprotocol.io/docs/2026-07-28/sdk.md):

| Ecosystem | Official SDK | Tier | Recommended Usage |
|---|---|---|---|
| **TypeScript / Node / Deno** | [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) | **Tier 1** | Web applications, Next.js, Node agents, Deno services |
| **Python** | [`mcp`](https://github.com/modelcontextprotocol/python-sdk) | **Tier 1** | Autonomous agent frameworks, LangChain, LlamaIndex |
| **Google Antigravity** | [`google-antigravity`](https://github.com/google-antigravity/antigravity-sdk-python) | **Enterprise** | AGY agents with `McpStreamableHttpServer` |

---

## 🚀 How to Connect

### 1. Claude.ai (Web / Workspaces / Enterprise)
1. In Claude.ai, open **Settings** > **Developer** (or **Integrations & Connectors**).
2. Add a new **Custom MCP Server**:
   - **Name**: `Razent Quick Commerce`
   - **URL**: `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp`
   - **Transport**: `Streamable HTTP` (or `HTTP`)
3. Save. Claude will discover all tools via `server/discover` or `tools/list` and allow direct conversational shopping:
   > *"Find me peanut butter and whole wheat bread under ₹300, and prepare a checkout link."*

---

### 2. Claude Desktop (`claude_desktop_config.json`)

Add this block to your Claude Desktop configuration:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### Option A: Direct Remote via `mcp-remote` (Recommended)
```json
{
  "mcpServers": {
    "razent": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp"
      ]
    }
  }
}
```

#### Option B: Local Repository (Stdio)
```json
{
  "mcpServers": {
    "razent": {
      "command": "node",
      "args": [
        "c:/Users/hemal/Ragent/Razent/scripts/mcp-server.mjs"
      ]
    }
  }
}
```

---

### 3. Cursor IDE / Windsurf (`.cursor/mcp.json`)

Add to `.cursor/mcp.json` in your workspace:
```json
{
  "mcpServers": {
    "razent-commerce": {
      "url": "https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp"
    }
  }
}
```

---

### 4. Google Antigravity (AGY) Python SDK

```python
from google.antigravity import Agent, LocalAgentConfig, types

# Configure connection to Razent Streamable HTTP MCP Server
mcp_servers = [
    types.McpStreamableHttpServer(
        name="razent_commerce",
        url="https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp",
    )
]

config = LocalAgentConfig(mcp_servers=mcp_servers)

async with Agent(config) as agent:
    response = await agent.chat("Search for peanut butter and prepare a checkout session.")
    print(await response.text())
```

---

### 5. OpenAI ChatGPT (Custom GPT Actions / Connectors)

In the ChatGPT GPT Builder:
1. Go to **Configure** > **Actions** > **Create new action**.
2. Click **Import from URL** and enter:
   ```
   https://razent-merchant.vercel.app/.well-known/openapi.json
   ```
   ChatGPT will import all endpoints (`/catalog`, `/checkout_sessions`, `/orders/track`) automatically.

---

## 🧪 Testing the Live MCP Server (2026-07-28 Spec)

### A. Health & Well-Known Info (GET)
```bash
curl -s https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp
```

### B. Mandatory `server/discover` RPC (MCP 2026-07-28)
```bash
node -e '
fetch("https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "server/discover",
    params: {
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": { name: "AgentClient", version: "1.0.0" }
      }
    }
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
'
```

### C. Deterministic `tools/list` with Caching Hints
```bash
node -e '
fetch("https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {
      _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" }
    }
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
'
```

### D. `tools/call` with `structuredContent`
```bash
node -e '
fetch("https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "search_catalog",
      arguments: { query: "peanut butter" },
      _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" }
    }
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
'
```

---

## 🔒 Security & Protocols Compliance
- **MCP 2026-07-28 Architecture**: Self-contained stateless requests, deterministic caching (`ttlMs: 300000`, `cacheScope: "public"`), and `resultType: "complete"`.
- **Universal Commerce Protocol (UCP)**: Semantic search, aisle categorization, stock verification, and Indian quick-commerce SLA (10-15 min).
- **Agentic Commerce Protocol (ACP)**: Secure checkout session tokens (`acp_...`) and real Razorpay test rails integration.
- **Google Agent Payments Protocol (AP2)**: Autonomous delegated purchase safeguards with spending caps.
- **Strict Human-In-The-Loop**: No payment is ever finalized without the human customer reviewing the amount on Razorpay's verified hosted payment link.
