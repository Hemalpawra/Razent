-- ══════════════════════════════════════════════════════════════════════
-- Migration: Fix Orders Check Constraints & Add Payment Link
-- ══════════════════════════════════════════════════════════════════════

-- 1. Allow 'ap2' and other commerce protocols
alter table public.orders drop constraint if exists orders_commerce_protocol_check;
alter table public.orders add constraint orders_commerce_protocol_check
  check (commerce_protocol in ('ncpi_uap', 'acp', 'ap2', 'x402', 'direct_web'));

-- 2. Allow 'dispatched' along with standard statuses
alter table public.orders drop constraint if exists orders_shipping_status_check;
alter table public.orders add constraint orders_shipping_status_check
  check (shipping_status in ('pending', 'packed', 'shipped', 'dispatched', 'delivered', 'returned'));

-- 3. Add payment_link columns
alter table public.orders
  add column if not exists payment_link text;

alter table public.acp_checkout_sessions
  add column if not exists payment_link text;
