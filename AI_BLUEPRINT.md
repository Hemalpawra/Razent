# AI Blueprint — Razent (Agentic Commerce & Instant Retail Platform)

> Single source of truth for every task in `C:\Users\hemal\Ragent\Razent`. Read this before modifying any file.

---

## 1. What the App Is

**Razent** is an **Agentic Commerce & Instant Retail Platform** built with **Vite 8 + React 19 + Tailwind v4 + shadcn UI (`base-mira`)**, integrated with **Supabase**, **Clerk Authentication**, **Razorpay**, **Google AP2 / ACP / UCP / UAP Agentic Protocols**, and **NPCI/RBI regulatory compliance wrappers**.

It enables seamless 10-15 minute grocery and retail delivery with two operational sides: an intuitive human storefront and an autonomous machine-to-machine commerce runtime.

### Dual Interface & Routing Architecture

Razent runs on clean HTML5 **`BrowserRouter`** with automatic subdomain detection and isolation (`isMerchantSubdomain()`, `getMerchantUrl()`):

1. **Customer Storefront & Autonomous Shopping (`razent.vercel.app` or default origin)**:
   - **`StoreHome` (`/`, `/checkout`, `/checkout/success`)**: High-converting multi-aisle grocery/retail storefront with product listings, search/filters, category tabs, product quick-view drawers, cart management, instant checkout, and live order tracking.
   - **Dedicated Full-Screen AI Assistant (`/assistant`)**: Full conversational shopping experience (`AIAssistantPage.tsx`) with conversation memory, suggested queries, product cards, and instant order creation.
   - **Floating Store AI Assistant Widget (`AIAssistantWidget.tsx`)**: Lightweight pop-up assistant available on all store pages, allowing shoppers to chat, search, and prepare carts without leaving the browse view.
   - **Customer Clerk Authentication (`/login/*`, `/signup/*`, `/customer/auth/*`)**: Seamless sign-in/sign-up powered by `@clerk/react` and synchronized with Supabase profiles (`useCustomerAuth.ts`, `clerk-proxy.ts`, `clerk-profile` edge function).
   - **Dedicated Customer Wallet & Agent Delegation Console (`/wallet`)**:
     - Full-page wallet interface (`WalletPage.tsx`, `useCustomerWallet.ts`).
     - Real-time balance display and instant top-ups.
     - Default delivery address management.
     - Autonomous AI purchasing toggle (ON/OFF) with delegated spending caps.
     - Strict **NPCI ₹15,000 regulatory e-Mandate limit** (`NPCI_TRANSACTION_LIMIT_PAISE = 1500000`).
     - **MCP Agent Passkey Management**: Generates customer-scoped tokens (`agent_auth_token`, e.g. `rz_agt_live_...`) with copy-paste snippets for ChatGPT, Claude, and Gemini to act on the user's behalf.
     - **Balise UX Writing**: Standardized clear recovery prompts for limit adjustments, wallet top-ups, and manual checkout handoffs.
2. **Merchant Operations Portal (`merchant.razent.vercel.app` or `/merchant/*` on localhost)**:
   - Protected back-office interface for store operators and platform administrators.
   - Uses the **AppShell Sidebar** (slim, fixed `14.5rem`), top navigation bar with breadcrumbs, theme switcher, and full-bleed data tables with 560px sheet detail drawers.
   - **9 Dedicated Operational Screens**:
     1. **`Dashboard` (`/dashboard`, `/merchant/dashboard`)**: Store KPIs, real-time revenue graphs, sales trends, and AI agent status.
     2. **`Products` (`/products`, `/merchant/products`)**: Catalog inventory management, stock levels, price in paise, and item quick-drawer.
     3. **`ProductImport`**: CSV/Excel bulk ingestion engine with drag-and-drop file upload and schema validation.
     4. **`Orders` (`/orders`, `/merchant/orders`)**: Live order processing, fulfillment pipelines, shipping stage tracking, and customer contact details.
     5. **`Analytics` (`/analytics`, `/merchant/analytics`)**: Detailed sales metrics, category breakdowns, conversion funnels, and AI agent revenue attribution.
     6. **`AIAgent` (`/ai_agent`, `/merchant/ai_agent`)**: Real-time transcript inspector for customer chat sessions, sentiment, and AI-driven conversions.
     7. **`AuditTrail` (`/audit_trail`, `/merchant/audit_trail`)**: Immutable timeline explorer for security actions, protocol settlements, and system events.
     8. **`ProtocolManager` (`/protocols`, `/merchant/protocols`)**: Complete protocol operations center (`ProtocolManagerPage.tsx`) inspecting active Merchant JWK keys (ECDSA P-256), live ACP checkout sessions, settled agentic orders, interactive AP2 mandate chain verifier, Razorpay test order dispatcher, and webhook HMAC signature inspectors.
     9. **`Settings` (`/settings`, `/merchant/settings`)**: Store profiles, delivery rules, AI guardrail configurations, and payment keys.

---

## 2. Agentic Commerce Protocols & Standards

Razent implements standardized protocols enabling AI agents (ChatGPT, Claude, Gemini, Grok, Cursor, and custom LangChain/ADK autonomous agents) to discover products, negotiate orders, and execute delegated transactions:

### Discovery Endpoints (`public/.well-known/`)
- **`agent.json`**: Agent-to-Agent (A2A) manifest describing Razent's agent capabilities, supported interaction modes, tool schemas, and operational boundaries.
- **`acp.json`**: Agentic Commerce Protocol (ACP) discovery document detailing catalog endpoints, payment schemes, settlement channels, and protocol versioning.
- **`ap2.json`**: Google Agent Payment Protocol (AP2) configuration specifying supported mandate formats, verification algorithms, and X-402 payment challenge endpoints.
- **`ucp.json`**: Universal Commerce Protocol (UCP) capability profile for cross-network catalog federations.
- **`mcp.json`**: Streamable HTTP Model Context Protocol (MCP 2026-07-28) server discovery manifest.
- **`openapi.json`**: OpenAPI 3.1 schema for direct GPT Actions and HTTP function calling agents.

### Core Protocol Implementations
- **Universal Commerce Protocol (UCP)**: Semantic search across 10 store aisles with typo tolerance, category filtering, stock verification, and 10-15 minute delivery SLA.
- **Agentic Commerce Protocol (ACP)**: Secure session token generation (`acp_...`), item reservation, and verified payment link generation for human-in-the-loop completion.
- **Google Agent Payment Protocol (AP2)**: Cryptographic intent, cart, and payment mandates signed via ECDSA P-256, verified in `src/lib/protocol/agenticCommerce.ts` and `src/lib/protocol/ap2Crypto.ts`.
- **Unified Agentic Protocol (UAP) & Regulatory AutoPay**:
  - Strictly enforces NPCI AutoPay and RBI e-mandate rules (`src/lib/protocol/regulatoryWrapper.ts`, `src/lib/types/wallet.ts`).
  - Enforces ₹15,000 regulatory ceiling without Additional Factor of Authentication (AFA) (`NPCI_TRANSACTION_LIMIT_PAISE = 1500000`).
  - Validates transactions against user-configured per-order and daily limits.
  - Zero secret transmission: credentials (CVV, full PAN, PIN, OTP) are blocked from LLM contexts.
  - Pre-seeded test credentials for Razorpay test rails.
- **X-402 Payment Challenge**: RFC-style HTTP 402 step-up challenge endpoint (`supabase/functions/x402-challenge`) triggered when order amounts exceed autonomous limits.
- **Model Context Protocol (MCP 2026-07-28)**: Stateless Streamable HTTP server exposing 7 commerce tools, store resources, and shopping assistant prompts.

---

## 3. Data & Backend Layer

Razent utilizes a **multi-tiered resilient architecture** combining Supabase, n8n orchestration, Vercel AI SDK, and in-memory mock resilience:

```
[External AI Agents]          [Shopper in Storefront]
(Claude, ChatGPT, Gemini)     (StoreHome, AIAssistant)
          │                               │
          ▼                               ▼
 [MCP Streamable HTTP]        [n8n Webhook / Proxy / AI SDK]
          │                               │
          ├───────────────────────────────┤
          ▼                               ▼
[Supabase Edge Functions (10 Services)]  [The Unified Data Seam (client.ts)]
          │                               │
          ▼                               ▼
[Supabase Postgres DB] <──────────────────┴── [In-Memory Mock Fallback (mock/*)]
```

### 1. Multi-Tier AI Assistant Engine
The AI assistant operates across 4 priority tiers:
1. **n8n Workflow Orchestration** (`Razent/n8n/razent-ai-assistant-webhook.json`): Production-grade LangChain agent with conversation memory, NPCI guardrails, and Supabase REST tool nodes.
2. **`n8n-chat-proxy` Edge Function**: Secure server-side gateway forwarding client requests to n8n while injecting the `X-Razent-Token` shared secret, preventing frontend credential leakage.
3. **AI SDK & OpenRouter / Gemini Flash** (`src/lib/agent/chatAgent.ts`): Direct client-side streaming fallback using Vercel AI SDK with Google Gemini 2.5 Flash, tool calling, and in-browser semantic vector search (`vectorSearch.ts`).
4. **`ragent-chat` Edge Function**: Server-Sent Events (SSE) streaming API with direct Postgres catalog grounding.

### 2. Complete Suite of 10 Supabase Edge Functions (`supabase/functions/`)
1. **`mcp`**: Authoritative Streamable HTTP Model Context Protocol (MCP 2026-07-28) server exposing 7 tools, resources, and prompts.
2. **`a2a`**: Agent-to-Agent gateway providing federated UCP catalog discovery (`/catalog`), ACP session creation, and AP2 settlement.
3. **`execute-agent-checkout`**: Central agent checkout coordinator evaluating delegated limits, AutoPay thresholds, and routing to autonomous settlement vs X-402 step-up.
4. **`uap-verifier`**: Universal Agentic Protocol verifier validating ECDSA cryptographic signatures and NPCI compliance.
5. **`x402-challenge`**: Generates RFC HTTP 402 payment challenge payloads when human authorization is required.
6. **`n8n-chat-proxy`**: Authenticated gateway to private n8n webhook workflows.
7. **`ragent-chat`**: Direct SSE chat streaming endpoint with Postgres RAG.
8. **`razorpay-webhook`**: Processes verified Razorpay payment webhooks to transition orders from `pending` to `paid`.
9. **`clerk-profile`**: Synchronizes Clerk authentication webhooks with Supabase `customer_wallets` and `users` tables.
10. **`create-merchant`**: Provisions new merchant accounts with isolated stores and API keys.

### 3. The Unified Data Seam (`src/lib/api/client.ts`)
- All UI views invoke `client.ts` functions (`listProducts`, `getOrder`, `createOrder`, `updateOrderStatus`, `getOrCreateCustomerWallet`, `updateCustomerWallet`, `topUpCustomerWallet`, `logAuditEvent`, `upsertConversation`, `getDashboardData`, `getAnalyticsData`).
- Directly interfaces with Supabase tables (`products`, `orders`, `conversations`, `audit_sessions`, `customer_wallets`, `merchants`).
- Gracefully falls back to rich in-memory seed data (`src/lib/mock/*`) if offline or unconfigured, ensuring zero UI degradation.

### 4. Audit Trail System (`logAuditEvent`)
- Comprehensive audit logging for all interactions (user actions, AI agent tool executions, Razorpay payments, and AP2/ACP settlements).
- Sessions grouped in `audit_sessions` table with granular timeline events.

---

## 4. Repo Directory Structure & File Touch Rules

```
Razent/
├─ public/
│  ├─ .well-known/
│  │  ├─ agent.json                   # A2A agent manifest (discovery)
│  │  ├─ acp.json                     # Agentic Commerce Protocol discovery
│  │  ├─ ap2.json                     # Google AP2 protocol configuration
│  │  ├─ ucp.json                     # Universal Commerce Protocol discovery
│  │  ├─ mcp.json                     # Streamable HTTP MCP server manifest
│  │  └─ openapi.json                 # OpenAPI 3.1 spec for GPT Actions & Grok
│  ├─ product-import-template.csv     # Sample CSV import template
│  └─ product-import-template.xlsx    # Sample XLSX import template
├─ n8n/
│  ├─ README.md                       # Complete n8n setup and proxy guide
│  ├─ razent-ai-assistant-webhook.json# Production n8n workflow with Header Auth
│  └─ razent-ai-assistant-workflow.json# Development n8n workflow (no auth)
├─ supabase/
│  ├─ functions/                      # 10 Supabase Edge Functions
│  │  ├─ mcp/index.ts                 # Streamable HTTP MCP 2026-07-28 server (7 tools)
│  │  ├─ a2a/index.ts                 # Agent-to-Agent UCP/ACP/AP2 gateway
│  │  ├─ execute-agent-checkout/      # Unified checkout & limit evaluator
│  │  ├─ uap-verifier/                # NPCI UAP cryptographic verifier
│  │  ├─ x402-challenge/              # HTTP 402 payment required challenge
│  │  ├─ n8n-chat-proxy/index.ts      # Server-side proxy for n8n with secret auth
│  │  ├─ ragent-chat/index.ts         # Direct SSE AI streaming & RAG
│  │  ├─ razorpay-webhook/index.ts    # Razorpay payment confirmation webhook
│  │  ├─ clerk-profile/index.ts       # Clerk customer profile sync to Supabase
│  │  └─ create-merchant/index.ts     # Merchant onboarding function
│  └─ migrations/                     # SQL schema migrations (wallets, orders, etc.)
├─ scripts/
│  ├─ mcp-server.mjs                  # Local/Stdio/HTTP standalone MCP server
│  ├─ deploy-functions.mjs            # Supabase functions deployment automator
│  ├─ run_acceptance_suite.mjs        # End-to-end protocol acceptance test runner
│  └─ test-protocol-stack.mjs         # Test suite for AP2/ACP/UCP protocols
├─ src/
│  ├─ main.tsx                        # React 19 entrypoint + ThemeProvider + ClerkProvider
│  ├─ AppRouter.tsx                   # BrowserRouter with subdomain routing (/ & merchant)
│  ├─ index.css                       # Global design system & theme tokens
│  ├─ lib/
│  │  ├─ utils.ts                     # cn helper (clsx + twMerge)
│  │  ├─ utils/subdomain.ts           # isMerchantSubdomain & getMerchantUrl helpers
│  │  ├─ agent/
│  │  │  ├─ chatAgent.ts              # AI SDK OpenRouter / Gemini Flash engine
│  │  │  └─ vectorSearch.ts           # In-browser semantic vector embeddings
│  │  ├─ api/
│  │  │  ├─ supabase.ts               # Supabase client & auth helpers
│  │  │  ├─ client.ts                 # UNIFIED DATA SEAM (all UI calls flow here)
│  │  │  ├─ razorpayClient.ts         # Direct Razorpay Orders & Verification client
│  │  │  └─ clerkProxy.ts             # Clerk server proxy helper
│  │  ├─ protocol/
│  │  │  ├─ ap2Types.ts               # Google AP2, ACP, & UAP type definitions
│  │  │  ├─ ap2Crypto.ts              # WebCrypto ECDSA P-256 signing & HMAC verifier
│  │  │  ├─ agenticCommerce.ts        # AP2 mandate chain validation & settlement
│  │  │  ├─ regulatoryWrapper.ts      # NPCI/RBI compliance, test credentials, sanitization
│  │  │  └─ canonicalize.ts           # RFC-8785 JSON canonicalizer
│  │  ├─ types/                       # Strict entity models
│  │  │  ├─ product.ts                # Product, ProductStatus, formatPrice
│  │  │  ├─ order.ts                  # Order, OrderStatus, ShippingStatus, Address
│  │  │  ├─ wallet.ts                 # CustomerWallet, spend limits, NPCI constants
│  │  │  ├─ conversation.ts           # Conversation, ChatMessage, AIMsg
│  │  │  ├─ audit.ts                  # AuditSession, AuditEvent, AuditActor, AuditSource
│  │  │  ├─ kpi.ts                    # KPI, DashboardData (telemetry & metrics)
│  │  │  └─ analytics.ts              # RevenuePoint, CategoryShare, AnalyticsData
│  │  ├─ mock/                        # Resilient in-memory fallback datasets
│  │  └─ storage/orderStore.ts        # Browser local storage sync for client orders
│  ├─ state/
│  │  ├─ useUI.ts                     # Active screens, roles, drawer toggles
│  │  ├─ useCart.ts                   # Customer shopping cart & badge counter
│  │  ├─ useCustomerAuth.ts           # Clerk customer session state & token sync
│  │  ├─ useCustomerWallet.ts         # Customer wallet, spend limits, passkeys, address
│  │  ├─ useMerchant.ts               # Authenticated merchant session state
│  │  ├─ useSettings.ts               # Merchant store profile & operational preferences
│  │  ├─ useTheme.ts                  # Light/Dark theme persistence
│  │  └─ useError.ts                  # Global toast & error interceptor
│  ├─ components/
│  │  ├─ ui/                          # shadcn primitives (base-mira)
│  │  ├─ shared/                      # AppShell, ThemeToggle, PageHeader, EmptyState, Toaster
│  │  ├─ auth/                        # SignInScreen (Merchant)
│  │  ├─ customer/
│  │  │  ├─ StoreHome/                # Customer storefront, checkout, order tracking
│  │  │  ├─ AIAssistant/              # Fullscreen chat & AIAssistantWidget popover
│  │  │  ├─ Wallet/WalletPage.tsx     # Full-page customer wallet & passkey management
│  │  │  └─ auth/CustomerAuthPage.tsx # Clerk customer sign-in/sign-up screen
│  │  └─ merchant/                    # Back-office screens
│  │     ├─ Dashboard/                # KPIs, revenue charts, AI status
│  │     ├─ Products/                 # Product catalog & ProductDrawer
│  │     ├─ ProductImport/            # CSV/Excel/Manual product batch ingestion
│  │     ├─ Orders/                   # Order management & OrderDrawer
│  │     ├─ Analytics/                # Sales, conversion funnels, AI attribution
│  │     ├─ AIAgent/                  # Customer conversation inspection & drawer
│  │     ├─ AuditTrail/               # Compliance & protocol audit log explorer
│  │     ├─ Protocol/                 # ProtocolManagerPage (JWKs, ACP, AP2 verifier)
│  │     └─ Settings/                 # Store profile, business, AI & delivery rules
```

### File Touch Map

| Goal / Task | Primary File(s) to Modify | Secondary Cascades |
|---|---|---|
| **Add/Modify an API Endpoint** | `src/lib/api/client.ts` | `src/lib/types/*`, corresponding screen |
| **Update MCP Server Tools / Logic** | `supabase/functions/mcp/index.ts`, `scripts/mcp-server.mjs` | `MCP_CONNECTOR.md`, `public/.well-known/mcp.json` |
| **Update AP2 / ACP Protocol Types** | `src/lib/protocol/ap2Types.ts` | `src/lib/protocol/agenticCommerce.ts`, `public/.well-known/*.json` |
| **Adjust RBI/NPCI Wallet Rules** | `src/lib/types/wallet.ts`, `src/lib/protocol/regulatoryWrapper.ts` | `WalletPage.tsx`, `useCustomerWallet.ts`, `mcp/index.ts` |
| **Update AI Assistant Logic / Prompts** | `src/components/customer/AIAssistant/useAIChat.ts`, `src/lib/agent/chatAgent.ts` | `Razent/n8n/razent-ai-assistant-webhook.json`, `supabase/functions/n8n-chat-proxy/index.ts` |
| **Update Storefront Layout or Cart** | `src/components/customer/StoreHome/index.tsx` | `useCart.ts`, `orderStore.ts`, `client.ts` |
| **Modify Routing or Subdomain Redirection** | `src/AppRouter.tsx`, `src/lib/utils/subdomain.ts` | `src/components/shared/AppShell.tsx` |
| **Add a Merchant Metric / KPI** | `src/lib/types/kpi.ts` | `src/components/merchant/Dashboard/index.tsx` |
| **Modify Theme Tokens** | `src/index.css` | Affects all components |

---

## 5. Architectural & Development Mandates

1. **Paise Financial Standard**:
   - All prices in database, state, and protocol payloads are integers representing **paise** (`price_paise`, `totalPaise`).
   - Never store floating-point rupees in state or DB.
   - Use `formatPrice(paise)` for all currency UI rendering (`₹1 = 100 paise`).
2. **Payment & Security Guardrails**:
   - **Zero Secret Ingestion**: Never log, store, or feed CVV numbers, card PINs, full PANs, or OTPs into AI chat messages or Edge Functions.
   - Autonomous purchasing requires active delegated consent (validated via `verifyAP2Mandate` or `useCustomerWallet`).
   - Autonomous purchases are hard-capped at **₹15,000** (`1,500,000 paise`) in compliance with NPCI e-Mandate guidelines.
3. **Design System Consistency**:
   - Use only theme tokens defined in `src/index.css` (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `primary`, `border`).
   - Do not hardcode arbitrary hex values or unvetted CSS colors.
   - Responsive drawers use `w-[560px] max-w-[96vw]`.
4. **Build & Type Integrity**:
   - Strict TypeScript: no unhandled `any` in public signatures.
   - Validate with `npx tsc --noEmit` and `npm run build` before pushing to `origin/main`.
5. **Git Push Rule**:
   - Always commit and push changes directly to `main` branch to keep remote repository in sync.

---

*Last updated: 2026-09-14 — Canonical blueprint reflecting full Razent architecture, HTML5 BrowserRouter with subdomain isolation, 9 merchant screens including Protocol Manager, Clerk customer auth, dedicated /wallet with NPCI limits and Agent Passkeys, multi-tier AI engine (n8n, n8n-chat-proxy, AI SDK Gemini Flash), complete 10 Edge Functions suite, and protocols stack.*
