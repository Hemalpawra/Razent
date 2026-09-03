-- ============================================================
-- Razent — Grocery vertical + operations columns
-- Requires: 20260309000001_initial_schema
--            20260309000002_rls_security_commerce
--            20260309000003_reconcile_schema_drift
--
-- Decision log:
--   Q16: Add unit, mrp_paise, gst_pct to products (B)
--   Q17: Add stock_hold_until to orders for hard-hold on start_checkout (C)
--   Q18: delivery_promise_minutes goes on profiles (per-store config, Q18 A)
--   Q19b: orders.dark_store_id nullable forward-compatible column (A)
--
-- All additive. No data loss. Safe to apply on a live project.
-- ============================================================

-- ── products: grocery fields (Q16) ──────────────────────────
alter table public.products
  add column if not exists unit         text,                 -- e.g. '500g', '1L', '12 pcs'
  add column if not exists mrp_paise    bigint,               -- strike-through MRP in paise
  add column if not exists gst_pct      numeric(5,2)          -- 0 / 5 / 12 / 18
    check (gst_pct is null or (gst_pct >= 0 and gst_pct <= 28));

comment on column public.products.unit      is 'Display unit: 500g, 1L, 12 pcs, etc.';
comment on column public.products.mrp_paise is 'Strike-through MRP in paise; null = no discount';
comment on column public.products.gst_pct   is 'GST percentage (0, 5, 12, 18). Null = non-taxed';

-- Index for storefront facet queries
create index if not exists products_gst_idx on public.products (gst_pct) where gst_pct is not null;

-- ── orders: hard-hold + dark store (Q17, Q19b) ─────────────
alter table public.orders
  add column if not exists dark_store_id     text,             -- forward-compat, no FK yet
  add column if not exists stock_hold_until  timestamptz;       -- set by start_checkout, cleared on payment/expiry

comment on column public.orders.dark_store_id    is 'Forward-compat: dark store that fulfilled. No FK yet (Q19b A).';
comment on column public.orders.stock_hold_until is 'Inventory hard-hold expiry. Cleared on payment or by sweeper.';

create index if not exists orders_stock_hold_idx
  on public.orders (stock_hold_until)
  where stock_hold_until is not null and status = 'created';

-- ── profiles: per-store delivery promise (Q18) ──────────────
alter table public.profiles
  add column if not exists delivery_promise_minutes int not null default 15
    check (delivery_promise_minutes between 5 and 240);

comment on column public.profiles.delivery_promise_minutes is
  'Per-store delivery SLA. Blinkit/Swiggy default 15 min. Used by tracking copy + dashboard badge.';

-- ── Optional helper: invoice subtotal from items jsonb ──────
create or replace function public.compute_invoice_subtotal(p_items jsonb)
returns bigint
language sql
immutable
as $$
  select coalesce(sum(
    coalesce((i->>'unit_price_paise')::bigint, 0) *
    coalesce((i->>'qty')::int, 0)
  ), 0)::bigint
  from jsonb_array_elements(p_items) i;
$$;
