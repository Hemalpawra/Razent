# AI Blueprint — Razent (Agentic Commerce & Instant Retail Platform)

> Single source of truth for every task in `C:\Users\hemal\Ragent\Razent`. Read this before modifying any file.

---

## 1. What the App Is

**Razent** is an **Agentic Commerce & Instant Retail Platform** built with **Vite 8 + React 19 + Tailwind v4 + shadcn UI (`base-mira`)**, integrated with **Supabase**, **Razorpay**, **Google AP2 / ACP Agentic Protocols**, and **NPCI/RBI regulatory compliance wrappers**.

### Dual Interface Architecture
1. **Customer Storefront & Autonomous Shopping**:
   - **`StoreHome` (`/#/`)**: High-converting grocery/retail storefront with product listings, search/filters, category tabs, product quick-view drawers, cart management, instant checkout, and order tracking.
   - **Dedicated Full-Screen AI Assistant (`/#/assistant`)**: Standalone conversational AI shopping assistant (`AIAssistantScreen.tsx`) powered by Supabase Edge Functions (`ragent-chat`), streaming responses via SSE, database-grounded product search, interactive order review cards, and autonomous checkout.
   - **Delegated AI Wallet & Settings Modal (`WalletSettingsModal.tsx`)**: Allows customers to view saved payment methods, set autonomous delegated spending limits per order/day, inspect AP2/ACP mandates, and configure NPCI UPI AutoPay controls.
2. **Merchant Operations Portal (`/#/merchant/*`)**:
   - Protected back-office interface for store owners and operators.
   - 8 operational screens: `Dashboard`, `Products`, `ProductImport`, `Orders`, `Analytics`, `AuditTrail`, `AIAgent`, `Settings`.
   - Uses the **AppShell Sidebar** (slim, fixed `14.5rem`), top bar with breadcrumbs and theme controls, and full-bleed data tables with 560px sheet detail drawers.
3. **Authentication & Routing**:
   - Handled via `AppRouter.tsx` using `HashRouter` for zero-configuration client-side hosting.
   - Merchant sign-in via `SignInScreen.tsx` (`/#/signin`) with role-based access control (`merchant` vs `customer`).

---

## 2. Agentic Commerce Protocols & Standards

Razent implements standardized protocols enabling AI agents (ChatGPT, Claude, Gemini, Grok, and custom LangChain/ADK autonomous agents) to discover products, negotiate orders, and execute delegated transactions:

### Discovery Endpoints (`public/.well-known/`)
- **`agent.json`**: Agent-to-Agent (A2A) manifest describing Razent's agent capabilities, supported interaction modes, tool schemas, and operational boundaries.
- **`acp.json`**: Agentic Commerce Protocol (ACP) discovery document detailing catalog endpoints, payment schemes, settlement channels, and protocol versioning.
- **`ap2.json`**: Google Agent Payment Protocol (AP2) configuration specifying supported mandate formats, verification algorithms, and X-402 payment challenge endpoints.
- **`ucp.json`**: Universal Commerce Protocol (UCP) capability profile for cross-network catalog federations.

### Core Protocol Implementations
- **`src/lib/protocol/ap2Types.ts`**: Types for AP2 Payment Mandates, Delegated Authority tokens, X-402 challenge payloads, cart settlement structures, and agent authorization states.
- **`src/lib/protocol/agenticCommerce.ts`**: Verification engine for AP2 mandates, cryptographic challenge generators, autonomous order approval checks, and sandbox settlement triggers.
- **`src/lib/protocol/regulatoryWrapper.ts`**: NPCI UPI AutoPay and RBI e-mandate regulatory wrapper:
  - Enforces cooling-off periods (minimum 24-hour notice before recurring execution).
  - Validates transaction amounts against explicit user-authorized per-transaction and daily spending caps.
  - Manages mandate lifecycle states (`ACTIVE`, `PAUSED`, `REVOKED`).
  - Strict security guardrails rejecting any transmission of sensitive credentials (CVV, full card numbers, PINs, OTPs) to LLMs.
  - Pre-seeded test sandbox credentials for verification:
    - **Test Cards**: Visa Debit, Mastercard Business Credit, Mastercard Prepaid, RuPay Credit, Diners, Amex.
    - **Test UPI IDs**: `success@razorpay` (auto-authorized success) and `failure@razorpay` (simulated decline / limit refusal).

---

## 3. Data & Backend Layer

Razent utilizes a **Supabase-first data architecture** with seamless in-memory mock resilience:

```
[Postgres Database (Supabase)]  <--->  [Supabase Edge Functions (/ragent-chat)]
               ▲                                      ▲
               │                                      │ (SSE Chat / Intent / RAG)
       [lib/api/supabase.ts]                  [AIAssistantScreen.tsx]
               ▲
               │
       [lib/api/client.ts]  <-- The Unified Data Seam
               ▲
               ├───────────────────────────────────────────────┐
               ▼                                               ▼
       [Customer Views]                               [Merchant Views]
  (StoreHome, AIAssistant)                  (Dashboard, Products, Orders, Audit, etc.)
```

1. **The Data Seam (`src/lib/api/client.ts`)**:
   - Every UI component invokes `client.ts` functions (`listProducts`, `getOrder`, `updateOrderStatus`, `logAuditEvent`, `upsertConversation`, `getDashboardData`, `getAnalyticsData`).
   - Connects directly to Supabase tables (`products`, `orders`, `conversations`, `audit_sessions`).
   - If Supabase is unreachable or offline, client functions gracefully fallback to rich in-memory seed data (`src/lib/mock/*`), preventing any UI degradation.
2. **Edge Function Chat (`supabase/functions/ragent-chat/index.ts`)**:
   - Server-sent events (SSE) streaming chat API.
   - Catalog-grounded retrieval matching live products against user query intents.
   - Autonomous tool emission (`suggest_products`, `checkout_mandate`, `create_order`).
3. **Audit Trail System (`logAuditEvent`)**:
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
│  │  └─ ucp.json                     # Universal Commerce Protocol discovery
│  ├─ product-import-template.csv     # Sample CSV import template
│  └─ product-import-template.xlsx    # Sample XLSX import template
├─ supabase/
│  ├─ functions/
│  │  └─ ragent-chat/
│  │     └─ index.ts                  # Supabase Edge Function: SSE AI streaming & RAG
│  └─ migrations/                     # SQL schema migrations (orders, products, audit)
├─ src/
│  ├─ main.tsx                        # React 19 entrypoint + ThemeProvider
│  ├─ AppRouter.tsx                   # HashRouter: / (store), /assistant, /signin, /merchant/*
│  ├─ App.tsx                         # Legacy screen mapper & fallback router
│  ├─ index.css                       # Global design system & theme tokens
│  ├─ lib/
│  │  ├─ utils.ts                     # cn helper (clsx + twMerge)
│  │  ├─ api/
│  │  │  ├─ supabase.ts               # Supabase client & auth helpers
│  │  │  └─ client.ts                 # UNIFIED DATA SEAM (all UI calls flow here)
│  │  ├─ protocol/
│  │  │  ├─ ap2Types.ts               # Google AP2 & ACP TypeScript type definitions
│  │  │  ├─ agenticCommerce.ts        # AP2 mandate validation & challenge generation
│  │  │  └─ regulatoryWrapper.ts      # NPCI/RBI compliance, test credentials, sanitization
│  │  ├─ types/                       # Strict entity models
│  │  │  ├─ product.ts                # Product, ProductStatus, formatPrice
│  │  │  ├─ order.ts                  # Order, OrderStatus, ShippingStatus, Address
│  │  │  ├─ conversation.ts           # Conversation, ChatMessage, AIMsg
│  │  │  ├─ audit.ts                  # AuditSession, AuditEvent, AuditActor, AuditSource
│  │  │  ├─ kpi.ts                    # KPI, DashboardData (telemetry & metrics)
│  │  │  └─ analytics.ts              # RevenuePoint, CategoryShare, AnalyticsData
│  │  ├─ mock/                        # Resilient in-memory fallback datasets
│  │  │  ├─ products.ts               # 34 standard grocery/tech products
│  │  │  ├─ orders.ts                 # Seed orders for tracking & merchant views
│  │  │  ├─ conversations.ts          # Seed conversations for AI agent monitoring
│  │  │  ├─ audit.ts                  # Seed audit sessions & event chains
│  │  │  ├─ kpis.ts                   # Seed metrics & performance indicators
│  │  │  └─ analytics.ts              # Seed charts, revenue series & funnels
│  │  └─ storage/
│  │     └─ orderStore.ts             # Browser local storage sync for client orders
│  ├─ state/
│  │  ├─ useUI.ts                     # Active screens, roles, drawer toggles
│  │  ├─ useTheme.ts                  # Light/Dark theme persistence
│  │  ├─ useSettings.ts               # Merchant store profile & operational preferences
│  │  ├─ useMerchant.ts               # Authenticated merchant session state
│  │  └─ useError.ts                  # Global toast & error interceptor
│  ├─ components/
│  │  ├─ ui/                          # shadcn primitives (base-mira)
│  │  ├─ shared/                      # AppShell, ThemeToggle, PageHeader, EmptyState
│  │  ├─ auth/                        # SignInScreen
│  │  ├─ customer/
│  │  │  ├─ StoreHome/                # Customer storefront, checkout, order tracking
│  │  │  └─ AIAssistant/
│  │  │     ├─ AIAssistantScreen.tsx  # Full-screen conversational AI assistant
│  │  │     └─ WalletSettingsModal.tsx# Delegated spend limits & NPCI wallet settings
│  │  └─ merchant/                    # Back-office screens
│  │     ├─ Dashboard/                # KPIs, revenue charts, AI status
│  │     ├─ Products/                 # Product catalog & ProductDrawer
│  │     ├─ ProductImport/            # CSV/Excel/Manual product batch ingestion
│  │     ├─ Orders/                   # Order management & OrderDrawer
│  │     ├─ Analytics/                # Sales, conversion funnels, AI attribution
│  │     ├─ AIAgent/                  # Customer conversation inspection & drawer
│  │     ├─ AuditTrail/               # Compliance & protocol audit log explorer
│  │     └─ Settings/                 # Store profile, business, AI & delivery rules
```

### File Touch Map

| Goal / Task | Primary File(s) to Modify | Secondary Cascades |
|---|---|---|
| **Add/Modify an API Endpoint** | `src/lib/api/client.ts` | `src/lib/types/*`, corresponding screen |
| **Update AP2 / ACP Protocol Types** | `src/lib/protocol/ap2Types.ts` | `src/lib/protocol/agenticCommerce.ts`, `public/.well-known/*.json` |
| **Adjust RBI/NPCI Wallet Rules** | `src/lib/protocol/regulatoryWrapper.ts` | `WalletSettingsModal.tsx`, `StoreHome/index.tsx` |
| **Update AI Assistant UI / Chat Flow** | `AIAssistantScreen.tsx` | `supabase/functions/ragent-chat/index.ts` |
| **Change Storefront Layout or Cart** | `src/components/customer/StoreHome/index.tsx` | `orderStore.ts`, `client.ts` |
| **Add a New Route or Page** | `src/AppRouter.tsx` | `src/state/useUI.ts`, `src/components/shared/AppShell.tsx` |
| **Add a Merchant Metric / KPI** | `src/lib/types/kpi.ts` | `src/components/merchant/Dashboard/index.tsx` |
| **Modify Theme Tokens** | `src/index.css` | Affects all components |

---

## 5. Architectural & Development Mandates

1. **Paise Financial Standard**:
   - All prices in database, state, and protocol payloads are integers representing **paise** (`price_paise`, `totalPaise`).
   - Never store floating-point rupees in state or DB.
   - Use `formatPrice(paise)` for all currency UI rendering.
2. **Payment & Security Guardrails**:
   - **Zero Secret Ingestion**: Never log, store, or feed CVV numbers, card PINs, full PANs, or OTPs into AI chat messages or Edge Functions.
   - Autonomous purchasing by AI assistant requires active delegated consent (validated via `verifyAP2Mandate` or `WalletSettingsModal`).
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

*Last updated: 2026-09-06 — Canonical blueprint reflecting current Razent architecture, AP2/ACP protocols, NPCI compliance, HashRouter, and Supabase integration.*
