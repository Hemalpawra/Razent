# Razent Public Model Context Protocol (MCP) Connector

The Razent Model Context Protocol (MCP) Server enables external AI clients (Claude.ai, Claude Desktop, Cursor, ChatGPT, Google Antigravity SDK agents, and autonomous commerce agents) to directly browse our catalog, prepare checkout sessions with real Razorpay payment links, and track delivery orders.

Built according to the authoritative **Model Context Protocol (MCP) 2026-07-28 specification** ([modelcontextprotocol.io/specification/2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28.md)) with backward compatibility for **2025-11-25** and **2024-11-05**.

---

## 🌐 Public Endpoint

| Parameter | Value |
|---|---|
| **Public MCP Endpoint (Custom Domain)** | **`https://razent.vercel.app/mcp`** |
| **Direct Edge Gateway** | `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp` |
| **Transport** | **Streamable HTTP (JSON-RPC 2.0)** |
| **Active MCP Specification** | **`2026-07-28` (Latest authoritative)** |
| **Supported Protocol Versions** | `["2026-07-28", "2025-11-25", "2024-11-05"]` |
| **State Model** | **Stateless per-request** (`_meta.io.modelcontextprotocol/...`) + `server/discover` RPC |
| **Auth Required** | None (Public anonymous catalog browsing & checkout session prep) |
| **Live Storefront** | [https://razent.vercel.app](https://razent.vercel.app) |
| **Well-Known Manifest** | [https://razent.vercel.app/.well-known/mcp.json](https://razent.vercel.app/.well-known/mcp.json) |
| **Agent Manifest** | [https://razent.vercel.app/.well-known/agent.json](https://razent.vercel.app/.well-known/agent.json) |

---

## 🛠 Available MCP Tools (Deterministic Order)

| Tool Name | Protocol | Description |
|---|---|---|
| `search_catalog` | **UCP** | Search products in Razent 10-15 min quick grocery delivery catalog across 10 aisles via Universal Commerce Protocol (UCP). Features typo tolerance, category filtering, plural stemming, and price ceilings. Returns matching items with price in rupees, stock, and high-res images. |
| `create_checkout_session` | **ACP** | Creates an in-app Agentic Commerce Protocol (ACP) checkout session and generates a verified payment link. **Mandatory: Requires customer delivery address (full name, phone, line1, city, pincode).** Human-in-the-loop: user reviews and pays. |
| `get_checkout_session` | **ACP** | Checks live payment and order settlement status. Polls Razorpay in real time: when customer completes payment, automatically settles the order and generates tracking and invoice links. |
| `track_orders` | **UCP / ACP** | Track live order delivery and history by Order ID (e.g. `RAZ-A2A-MTY6O735`), customer mobile phone, or email. Returns delivery timeline stage, items, address, and downloadable tax invoice link. |
| `ap2_execute_autonomous_checkout` | **AP2** | Execute autonomous Human-Not-Present purchase under Google AP2 protocol with real Razorpay test settlement. Verifies delegated spending cap and creates authoritative orders. |
| `execute_autonomous_purchase` | **AutoPay / Wallet** | Execute an autonomous purchase directly inside the AI agent using the customer's Razent Wallet. Requires customer Agent Passkey (`auth_token` or `RAZENT_CUSTOMER_TOKEN`). Strictly enforces NPCI regulatory e-Mandate cap (₹15,000 max) and customer spend limits. Returns Balise UX recovery options if exceeded. |
| `get_customer_wallet_status` | **AutoPay / Wallet** | Inspect customer's live wallet balance, autonomous AI spend limit, NPCI compliance cap (₹15,000), default delivery address, and permission status using their Agent Passkey. |

---

## 📚 MCP Resources & Prompts

### Resources
- **`razent://store/aisles`**: Returns the list of 10 live store departments (`Grocery & Staples`, `Beverages`, `Electronics`, `Beauty & Personal Care`, `Home Care`, `Decor`, `Kids`, `Kitchen Appliances`, `Office & Stationery`), delivery SLA (`10-15 minutes`), and operational parameters. Read via `resources/read`.

### Prompts
- **`shopping_assistant`**: System prompt providing retail expertise, mandatory confirmation protocol ("Never Order Without Asking"), Balise UX writing recovery guidelines, and assistant identification rules (`chatgpt`, `gemini`, `claude`, `store_agent`). Retrieve via `prompts/get`.

---

## 🔑 Customer Agent Passkey & Autonomous Purchasing

Customers manage autonomous AI permissions and spending caps at **`https://razent.vercel.app/wallet`**:
1. **Wallet Balance & Auto-Top-Up**: Fund customer wallet for machine-to-machine checkout.
2. **Autonomous AI Purchasing Switch**: Explicit master toggle (ON / OFF).
3. **Spend Limits**: User-configured per-order cap (e.g. ₹2,000) hard-bounded by the **NPCI regulatory e-Mandate cap of ₹15,000** (`1,500,000 paise`).
4. **Agent Passkey (`agent_auth_token`)**: Unique secret token (e.g., `rz_agt_live_...`) generated on the wallet page. External AI agents can pass this token in:
   - Tool argument: `{ "auth_token": "rz_agt_live_..." }`
   - Environment variable: `RAZENT_CUSTOMER_TOKEN="rz_agt_live_..."`
5. **Balise UX Writing Recovery**: If a purchase exceeds available wallet balance or the ₹15,000 NPCI limit, the agent automatically provides 3 standard recovery choices:
   - *Option 1*: Update spend limit in wallet settings (`/wallet`).
   - *Option 2*: Top up wallet balance.
   - *Option 3*: Complete order with manual checkout link.

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

#### Option B: Local Standalone Server (Stdio)
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

#### Option C: Local n8n Stdio MCP Server (`razent-n8n-mcp-server`)
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

### 3. Cursor IDE / Windsurf (`.cursor/mcp.json`)

Add to `.cursor/mcp.json` in your workspace:
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

### 4. Google Antigravity (AGY) Python SDK

```python
from google.antigravity import Agent, LocalAgentConfig, types

# Configure connection to Razent Streamable HTTP MCP Server
mcp_servers = [
    types.McpStreamableHttpServer(
        name="razent_commerce",
        url="https://razent.vercel.app/mcp",
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
   https://razent.vercel.app/.well-known/openapi.json
   ```
   ChatGPT will import all endpoints (`/catalog`, `/checkout_sessions`, `/orders/track`) automatically.

---

### 6. Merchant Protocol Manager Console

Store operators can monitor all live MCP tools, ACP checkout sessions, active ECDSA P-256 merchant signing JWKs, and test protocol requests live on the Merchant Console:
- **URL**: `https://merchant.razent.vercel.app/protocols` (or `/#/protocols` on localhost)

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

### D. `tools/call` — Search Catalog
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

### E. `tools/call` — Check Wallet Balance & Spend Limits
```bash
node -e '
fetch("https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "get_customer_wallet_status",
      arguments: { auth_token: "rz_agt_live_test_token" },
      _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" }
    }
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
'
```

### F. `resources/read` — Store Aisles
```bash
node -e '
fetch("https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 5,
    method: "resources/read",
    params: {
      uri: "razent://store/aisles",
      _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" }
    }
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
'
```

### G. `prompts/get` — Shopping Assistant Prompt
```bash
node -e '
fetch("https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 6,
    method: "prompts/get",
    params: {
      name: "shopping_assistant",
      _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" }
    }
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
'
```

---

## 🔒 Security & Protocols Compliance
- **MCP 2026-07-28 Architecture**: Self-contained stateless requests, deterministic caching (`ttlMs: 300000`, `cacheScope: "public"`), and `resultType: "complete"`.
- **Universal Commerce Protocol (UCP)**: Semantic search, 10-aisle categorization, stock verification, and Indian quick-commerce SLA (10-15 min).
- **Agentic Commerce Protocol (ACP)**: Secure checkout session tokens (`acp_...`) and real Razorpay test rails integration.
- **Google Agent Payments Protocol (AP2)**: Autonomous delegated purchase safeguards with ECDSA P-256 cryptographic mandates and spending caps.
- **NPCI Regulatory e-Mandate Cap**: All automated purchases hard-capped at **₹15,000** (`1,500,000 paise`) without additional factor authentication.
- **Strict Human-In-The-Loop vs Delegated AutoPay**: Clear separation between explicit customer wallet authorization and manual Razorpay checkout handoff.
- **Balise UX Writing**: Standardized clear recovery prompts for limit adjustments, wallet top-ups, and manual checkout handoffs when autonomous limits are exceeded.
