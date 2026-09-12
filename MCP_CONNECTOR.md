# Razent Public Model Context Protocol (MCP) Connector

The Razent Model Context Protocol (MCP) Server enables external AI clients (Claude.ai, Claude Desktop, Cursor, ChatGPT, autonomous commerce agents) to directly browse our catalog, prepare checkout sessions with real Razorpay payment links, and track delivery orders.

Built according to the official Anthropic MCP specifications ([anthropics/claude-ai-mcp](https://github.com/anthropics/claude-ai-mcp)) using **Streamable HTTP (JSON-RPC 2.0)**.

---

## 🌐 Public Endpoint

| Parameter | Value |
|---|---|
| **Public MCP Endpoint** | `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp` |
| **Transport** | Streamable HTTP (JSON-RPC 2.0) |
| **MCP Protocol Version** | `2024-11-05` |
| **Auth Required** | None (Public Anonymous Browsing & Checkout Session Prep) |
| **Live Storefront** | [https://razent-merchant.vercel.app](https://razent-merchant.vercel.app) |
| **Well-Known Manifest** | [https://razent-merchant.vercel.app/.well-known/mcp.json](https://razent-merchant.vercel.app/.well-known/mcp.json) |

---

## 🛠 Available MCP Tools

| Tool Name | Aliases | Description |
|---|---|---|
| `search_catalog` | `ucp_catalog_search` | Search 100+ grocery & essentials across 10 aisles with typo tolerance, plural stemming, and price filters. Returns stock and high-res images. |
| `create_checkout_session` | `acp_create_checkout_session` | Creates an ACP checkout session and returns a live Razorpay payment link. **Human-in-the-loop: user must click to pay.** |
| `get_checkout_session` | `acp_get_checkout_session` | Polls Razorpay in real-time. When payment succeeds, settles the order and generates delivery tracking and tax invoice links. |
| `track_orders` | `track_order` | Track orders by Order ID (e.g. `RAZ-A2A-MTY6O735`), phone number, or email. |
| `ap2_execute_autonomous_checkout` | — | Autonomous Human-Not-Present checkout under Google AP2 protocol with delegated spending caps on test rails. |

---

## 🚀 How to Connect

### 1. Claude.ai (Web / Desktop App)
1. Go to **Claude Settings** > **Integrations / Connectors** (or **Developer** settings).
2. Add a new **Custom MCP Server**:
   - **Name**: `Razent Commerce`
   - **URL**: `https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp`
   - **Transport**: `Streamable HTTP` (or `HTTP`)
3. Save. Claude will immediately discover all Razent tools and allow you to ask:
   > *"Find me peanut butter and whole wheat bread under ₹300, and prepare a checkout link."*

---

### 2. Claude Desktop (`claude_desktop_config.json`)

Add this snippet to your Claude Desktop configuration:
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

### 4. OpenAI ChatGPT (Custom GPT Actions / Connectors)

In the ChatGPT GPT Builder, go to **Actions** > **Create new action** > **Import from URL**:
```
https://razent-merchant.vercel.app/.well-known/openapi.json
```
Or paste the OpenAPI 3.1.0 schema directly. ChatGPT will map actions to the Razent commerce endpoints automatically.

---

## 🧪 Testing the Live MCP Server

### A. Health & Discovery (GET)
```bash
curl -s https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp
```

### B. Catalog Search (JSON-RPC 2.0 POST)
```bash
node -e '
fetch("https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "search_catalog",
      arguments: { query: "peanut butter" }
    }
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
'
```

### C. Create Checkout Session (Real Razorpay Link)
```bash
node -e '
fetch("https://flsjhsnfurxkzawdimyi.supabase.co/functions/v1/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "create_checkout_session",
      arguments: {
        items: [{ id: 8, quantity: 1 }],
        delivery_address: {
          full_name: "Test Customer",
          phone: "+91 98765 43210",
          line1: "Indiranagar",
          city: "Bengaluru",
          pincode: "560038"
        }
      }
    }
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
'
```

---

## 🔒 Security & Guardrails
- **Zero Cardholder Data Stored**: AI agents never touch raw payment card numbers or OTPs.
- **Strict Human-In-The-Loop**: Checkout sessions generate an official Razorpay payment link. The human customer reviews and authorizes the payment on Razorpay's secure checkout page.
- **Authoritative Settlement**: Order placement is verified server-side via Razorpay's payment API before changing status to `paid`.
