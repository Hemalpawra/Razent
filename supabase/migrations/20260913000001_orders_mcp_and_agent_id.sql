-- ══════════════════════════════════════════════════════════════════════
-- Migration: Add agent_id to orders & allow 'mcp' commerce_protocol
-- ══════════════════════════════════════════════════════════════════════

-- 1. Add agent_id column to orders
alter table public.orders
  add column if not exists agent_id text;

create index if not exists orders_agent_id_idx on public.orders (agent_id);

-- 2. Allow 'mcp' in orders commerce_protocol check constraint
alter table public.orders drop constraint if exists orders_commerce_protocol_check;
alter table public.orders add constraint orders_commerce_protocol_check
  check (commerce_protocol in ('ncpi_uap', 'acp', 'ap2', 'x402', 'direct_web', 'mcp'));

-- 3. Add agent_id & delivery_address to acp_checkout_sessions
alter table public.acp_checkout_sessions
  add column if not exists agent_id text,
  add column if not exists delivery_address jsonb;

create index if not exists acp_checkout_sessions_agent_id_idx on public.acp_checkout_sessions (agent_id);
