-- ══════════════════════════════════════════════════════════════════════
-- Migration: Pre-Production Agentic Commerce (UCP + ACP + AP2)
-- Compliant with Razorpay Test API & NPCI/RBI Regulatory Guardrails
-- ══════════════════════════════════════════════════════════════════════

-- 1. ACP Checkout Sessions Table
create table if not exists public.acp_checkout_sessions (
  id                          text primary key,
  merchant_id                 uuid references auth.users(id) on delete cascade not null,
  customer_id                 uuid references auth.users(id) on delete set null,
  status                      text not null default 'not_ready_for_payment'
                              check (status in ('not_ready_for_payment', 'ready_for_payment', 'in_progress', 'completed', 'canceled', 'authentication_required')),
  currency                    text not null default 'INR',
  line_items                  jsonb not null default '[]'::jsonb,
  fulfillment_details         jsonb,
  fulfillment_options         jsonb not null default '[]'::jsonb,
  selected_fulfillment_options jsonb not null default '[]'::jsonb,
  totals                      jsonb not null default '[]'::jsonb,
  capabilities                jsonb not null default '{}'::jsonb,
  order_id                    text references public.orders(external_id) on delete set null,
  razorpay_order_id           text,
  mandate_chain_id            text,
  expires_at                  timestamptz not null,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

alter table public.acp_checkout_sessions enable row level security;

-- Public can view or insert during checkout; authenticated users manage their merchant/customer sessions
create policy acp_sessions_select_policy on public.acp_checkout_sessions
  for select using (true);

create policy acp_sessions_insert_policy on public.acp_checkout_sessions
  for insert with check (true);

create policy acp_sessions_update_policy on public.acp_checkout_sessions
  for update using (true);

create index if not exists idx_acp_sessions_status on public.acp_checkout_sessions (status);
create index if not exists idx_acp_sessions_merchant on public.acp_checkout_sessions (merchant_id);
create index if not exists idx_acp_sessions_order on public.acp_checkout_sessions (order_id);
create index if not exists idx_acp_sessions_expires on public.acp_checkout_sessions (expires_at);

-- 2. ACP Idempotency Records Table
create table if not exists public.acp_idempotency_records (
  key           text primary key,
  request_hash  text not null,
  response_body jsonb not null,
  status_code   integer not null,
  created_at    timestamptz default now()
);

alter table public.acp_idempotency_records enable row level security;
create policy acp_idempotency_all_policy on public.acp_idempotency_records for all using (true);
create index if not exists idx_acp_idempotency_created on public.acp_idempotency_records (created_at);

-- 3. Webhook Delivery Audits Table
create table if not exists public.acp_webhook_deliveries (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null,
  payload       jsonb not null,
  signature     text not null,
  recipient_url text,
  status        text not null default 'delivered',
  created_at    timestamptz default now()
);

alter table public.acp_webhook_deliveries enable row level security;
create policy acp_webhooks_all_policy on public.acp_webhook_deliveries for all using (true);
create index if not exists idx_acp_webhooks_created on public.acp_webhook_deliveries (created_at);

-- 4. Extend orders table if needed for ACP / AP2 linkage
alter table public.orders 
  add column if not exists acp_checkout_session_id text,
  add column if not exists ap2_mandate_chain_id text,
  add column if not exists rfc8785_cart_hash text;
