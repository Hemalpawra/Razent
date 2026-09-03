# Razent Supabase Integration

This directory contains the Supabase backend for Razent:
- **PostgreSQL schema + RLS policies** (in `migrations/`)
- **Edge Functions** for Razorpay, NPCI UAP, x402, ACP/AP2 (in `functions/`)

## Quick Start

### 1. Install Supabase CLI
```bash
npm i -g supabase
# or: brew install supabase/tap/supabase
```

### 2. Link to your Supabase project
```bash
supabase login
supabase link --project-ref <your-project-ref>
```

### 3. Run migrations locally (optional — for dev)
```bash
supabase start
supabase db reset  # applies all migrations in order
```

### 4. Set secrets for Edge Functions
```bash
# Required for razorpay-webhook
supabase secrets set RAZORPAY_KEY_ID=rzp_test_...
supabase secrets set RAZORPAY_KEY_SECRET=...
supabase secrets set RAZORPAY_WEBHOOK_SECRET=...

# Required for uap-verifier (internal test key)
supabase secrets set UAP_TEST_SIGNING_KEY=your-shared-secret

# Required for execute-agent-checkout (internal)
supabase secrets set UAP_VERIFIER_URL=https://<project-ref>.supabase.co/functions/v1/uap-verifier
supabase secrets set X402_CHALLENGE_URL=https://<project-ref>.supabase.co/functions/v1/x402-challenge

# Optional: NPCI RSA public key (real NPCI integration)
# supabase secrets set NPCI_RSA_PUBLIC_KEY=base64-encoded-spki
```

### 5. Deploy Edge Functions
```bash
supabase functions deploy razorpay-webhook
supabase functions deploy uap-verifier
supabase functions deploy x402-challenge
supabase functions deploy execute-agent-checkout
```

## Migration Order

| File | Description |
|------|-------------|
| `20260309000001_initial_schema.sql` | Core tables: profiles, products, orders, conversations, payment_mandates, payment_transactions, audit_sessions, dashboard_view, analytics_view |
| `20260309000002_rls_security_commerce.sql` | RLS policies + SECURITY DEFINER helpers for mandates, UAP debit, x402 challenge, refunds, shipping state machine |

## Database Schema Overview

### Core Tables

- **profiles** — extends `auth.users` with role (`customer` | `merchant` | `super_admin`)
- **products** — merchant-owned product catalog
- **orders** — order records with Razorpay IDs, UAP fields, mandate linkage
- **conversations** — AI-agent + human chat history
- **payment_mandates** — ACP/AP2 delegated mandates with usage tracking
- **payment_transactions** — NPCI UAP / Razorpay / x402 settlement ledger
- **audit_sessions** — append-only protocol event log

### Views

- **dashboard_view** — merchant KPI aggregates (revenue, orders, products)
- **analytics_view** — time-series + categorical analytics for charts

### Security

All tables have **RLS enabled** with policies using the `((select auth.uid()))` pattern
for optimal performance (see Supabase best practices).

Service role bypasses RLS for webhook writers.

### Edge Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `razorpay-webhook` | Verify HMAC, update order status, write payment_transactions | service role (no JWT) |
| `uap-verifier` | Verify NPCI UAP signed payload, debit mandate, settle order | service role (internal) |
| `x402-challenge` | Return HTTP 402 with Payment-Required headers + challenge body | public (anon) |
| `execute-agent-checkout` | Agent checkout orchestration: AP2 verify → threshold → UAP or x402 | user JWT |

## Razent Client Integration

Set these env vars in the Razent frontend (`.env`):

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Optional: direct Edge Function URLs (auto-resolved if omitted)
VITE_EXECUTE_AGENT_CHECKOUT_URL=https://<project-ref>.supabase.co/functions/v1/execute-agent-checkout
VITE_UAP_VERIFIER_URL=https://<project-ref>.supabase.co/functions/v1/uap-verifier
VITE_X402_CHALLENGE_URL=https://<project-ref>.supabase.co/functions/v1/x402-challenge
```

When these are **missing**, `lib/api/client.ts` falls back to in-memory stores (`lib/storage/*`) —
perfect for offline demos.

When **present**, the same API functions route to Supabase or Edge Functions automatically.

## Payment Flow

1. **Agent initiates checkout** → calls `executeAgentCheckout()`
2. **If mandate exists** → Edge Function verifies via `uap-verifier` (NPCI UAP)
3. **If amount > threshold** → returns x402 challenge (`status: "step_up"`)
4. **If auto-approved** → `uap-verifier` debits mandate, writes `payment_transactions`,
   marks order `paid`, emits audit events
5. **Razorpay webhook** (async) confirms `payment.captured`, re-verifies signature,
   updates order status (idempotent)

## Local Development

```bash
# Terminal 1: Supabase local stack
supabase start

# Terminal 2: Razent Vite dev server (already running on 8443)
# No extra steps — the client auto-detects Supabase via env vars

# Test Razorpay webhook locally:
curl -X POST http://localhost:54321/functions/v1/razorpay-webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: <hmac-sha256>" \
  -d '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test","order_id":"rzp_test"}}}}'
```

## References

- [Supabase Postgres Best Practices](https://github.com/supabase/postgres_best_practices) — followed in migrations
- [NPCI UAP Spec](https://www.npci.org.in/upi-application-programming-interface) — payload shapes in `uap-verifier`
- [x402 Protocol](https://github.com/coinbase/x402) — HTTP 402 challenge/response
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/) — HMAC verification