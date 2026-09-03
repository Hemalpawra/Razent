-- ============================================================
-- Razent — Initial Schema Migration
-- Covers: profiles, products, orders, conversations, audit_sessions,
-- payment_mandates, payment_transactions, and analytics views.
-- Follows Supabase Postgres Best Practices:
--   • identity PKs (not serial), FK indexes, RLS enabled,
--     ((select auth.uid())) pattern in policies.
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  role        text not null default 'customer'
                check (role in ('customer', 'merchant', 'super_admin')),
  full_name   text,
  phone       text,
  email       text,
  avatar_url  text,
  metadata    jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy profiles_owner_policy on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id);
alter table public.profiles force row level security;

-- ── products ────────────────────────────────────────────────
create table if not exists public.products (
  id               bigint generated always as identity primary key,
  merchant_id      uuid references auth.users(id) on delete cascade not null,
  external_id      text unique,
  title            text not null,
  description      text,
  category         text,
  tags             text[] default '{}',
  images           text[] default '{}',
  price_paise      bigint not null check (price_paise >= 0),
  compare_price_paise bigint,
  status           text not null default 'draft'
                     check (status in ('active', 'draft', 'archived')),
  stock            integer not null default 0,
  sku              text,
  weight_g         integer,
  dimensions_cm    jsonb,
  shipping_paise   bigint default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.products enable row level security;
-- Merchants see all products they own; super_admins see all.
create policy products_merchant_policy on public.products
  for select to authenticated
  using (
    merchant_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and role = 'super_admin')
  );
create policy products_merchant_insert on public.products
  for insert to authenticated
  with check (merchant_id = (select auth.uid()));
create policy products_merchant_update on public.products
  for update to authenticated
  using (merchant_id = (select auth.uid()));
create policy products_merchant_delete on public.products
  for delete to authenticated
  using (merchant_id = (select auth.uid()));
alter table public.products force row level security;

-- FK index on merchant_id (used in RLS policies + joins)
create index if not exists products_merchant_id_idx on public.products (merchant_id);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_category_idx on public.products (category);

-- ── orders ───────────────────────────────────────────────────
create table if not exists public.orders (
  id                    bigint generated always as identity primary key,
  external_id           text unique not null,
  merchant_id           uuid references auth.users(id) on delete cascade not null,
  customer_id           uuid references auth.users(id) on delete set null,
  razorpay_order_id     text unique,
  razorpay_payment_id   text,
  razorpay_signature    text,
  status                text not null default 'created'
                          check (status in ('created', 'paid', 'failed', 'refunded')),
  shipping_status       text not null default 'pending'
                          check (shipping_status in ('pending', 'packed', 'shipped', 'delivered', 'returned')),
  currency              text not null default 'INR',
  total_paise           bigint not null check (total_paise >= 0),
  shipping_paise        bigint not null default 0,
  -- items stored as JSONB array to match existing Order type shape
  items                 jsonb not null default '[]',
  shipping_address      jsonb not null default '{}',
  billing_address       jsonb,
  via_ai                boolean not null default false,
  conversation_id       text,
  mandate_id            text,
  checkout_session_id   text,
  -- ACP / AP2 / UAP fields
  commerce_protocol     text check (commerce_protocol in ('ncpi_uap', 'acp', 'x402', 'direct_web')),
  settlement_reference  text,
  challenge_id         text,
  tracking              jsonb,
  notes                 text,
  created_at            timestamptz default now(),
  paid_at               timestamptz,
  shipped_at            timestamptz,
  delivered_at         timestamptz,
  updated_at            timestamptz default now()
);

alter table public.orders enable row level security;
create policy orders_merchant_policy on public.orders
  for select to authenticated
  using (
    merchant_id = (select auth.uid())
    or customer_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and role = 'super_admin')
  );
create policy orders_merchant_insert on public.orders
  for insert to authenticated
  with check (merchant_id = (select auth.uid()));
create policy orders_merchant_update on public.orders
  for update to authenticated
  using (merchant_id = (select auth.uid()));
-- Webhooks (service role) need write access
create policy orders_service_write on public.orders
  for insert to service_role with check (true);
create policy orders_service_update on public.orders
  for update to service_role using (true);
alter table public.orders force row level security;

-- FK indexes
create index if not exists orders_merchant_id_idx on public.orders (merchant_id);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_shipping_status_idx on public.orders (shipping_status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_razorpay_order_id_idx on public.orders (razorpay_order_id);

-- ── conversations ────────────────────────────────────────────
create table if not exists public.conversations (
  id               bigint generated always as identity primary key,
  external_id      text unique,
  merchant_id      uuid references auth.users(id) on delete cascade not null,
  customer_id      uuid references auth.users(id) on delete set null,
  type             text not null default 'human_customer'
                     check (type in ('human_customer', 'agent_to_agent')),
  protocol         text check (protocol in ('ncpi_uap', 'acp', 'x402', 'direct_web')),
  status           text not null default 'active'
                     check (status in ('active', 'closed', 'resolved')),
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  messages         jsonb not null default '[]',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.conversations enable row level security;
create policy conversations_merchant_policy on public.conversations
  for select to authenticated
  using (
    merchant_id = (select auth.uid())
    or customer_id = (select auth.uid())
    or exists (select 1 from public.profiles where user_id = (select auth.uid()) and role = 'super_admin')
  );
create policy conversations_merchant_insert on public.conversations
  for insert to authenticated
  with check (merchant_id = (select auth.uid()));
create policy conversations_merchant_update on public.conversations
  for update to authenticated
  using (merchant_id = (select auth.uid()));
alter table public.conversations force row level security;

create index if not exists conversations_merchant_id_idx on public.conversations (merchant_id);
create index if not exists conversations_customer_id_idx on public.conversations (customer_id);
create index if not exists conversations_status_idx on public.conversations (status);

-- ── payment_mandates (ACP / AP2) ─────────────────────────────
create table if not exists public.payment_mandates (
  id                bigint generated always as identity primary key,
  mandate_id        text unique not null,
  merchant_id       uuid references auth.users(id) on delete cascade not null,
  customer_id       uuid references auth.users(id) on delete cascade not null,
  agent_name        text,
  delegated_limit_paise bigint not null default 0,
  current_usage_paise bigint not null default 0,
  status            text not null default 'active'
                     check (status in ('active', 'paused', 'revoked', 'expired')),
  upi_handle        text,
  bank_account_mask text,
  npci_mandate_ref  text,
  expires_at        timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.payment_mandates enable row level security;
create policy mandates_merchant_policy on public.payment_mandates
  for all to authenticated
  using (merchant_id = (select auth.uid()) or customer_id = (select auth.uid()));
alter table public.payment_mandates force row level security;

create index if not exists mandates_merchant_id_idx on public.payment_mandates (merchant_id);
create index if not exists mandates_customer_id_idx on public.payment_mandates (customer_id);
create index if not exists mandates_mandate_id_idx on public.payment_mandates (mandate_id);
create index if not exists mandates_status_idx on public.payment_mandates (status);

-- ── payment_transactions (UAP / NPCI) ───────────────────────
create table if not exists public.payment_transactions (
  id                  bigint generated always as identity primary key,
  transaction_id      text unique not null,
  order_id            text references public.orders(external_id) on delete set null,
  merchant_id        uuid references auth.users(id) on delete cascade not null,
  customer_id         uuid references auth.users(id) on delete set null,
  mandate_id         text,
  protocol            text not null
                       check (protocol in ('ncpi_uap', 'acp', 'x402', 'razorpay')),
  direction           text not null check (direction in ('debit', 'credit', 'refund')),
  amount_paise        bigint not null,
  settlement_ref      text,
  npci_rrn            text,
  npci_stan           text,
  npci_timestamp      timestamptz,
  challenge_id        text,
  challenge_response  jsonb,
  status              text not null default 'pending'
                       check (status in ('pending', 'settled', 'failed', 'challenged', 'refunded')),
  failure_reason     text,
  raw_payload         jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.payment_transactions enable row level security;
create policy transactions_merchant_policy on public.payment_transactions
  for all to authenticated
  using (merchant_id = (select auth.uid()) or customer_id = (select auth.uid()));
create policy transactions_service_write on public.payment_transactions
  for insert to service_role with check (true);
create policy transactions_service_update on public.payment_transactions
  for update to service_role using (true);
alter table public.payment_transactions force row level security;

create index if not exists transactions_merchant_id_idx on public.payment_transactions (merchant_id);
create index if not exists transactions_order_id_idx on public.payment_transactions (order_id);
create index if not exists transactions_status_idx on public.payment_transactions (status);
create index if not exists transactions_created_at_idx on public.payment_transactions (created_at desc);

-- ── audit_sessions ───────────────────────────────────────────
create table if not exists public.audit_sessions (
  id            bigint generated always as identity primary key,
  external_id   text unique,
  order_id      text,
  customer      text,
  actor_label   text,
  events        jsonb not null default '[]',
  created_at    timestamptz default now()
);

alter table public.audit_sessions enable row level security;
create policy audit_all_read on public.audit_sessions
  for select to authenticated using (true);
create policy audit_all_insert on public.audit_sessions
  for insert to authenticated with check (true);
create policy audit_service_write on public.audit_sessions
  for all to service_role using (true);
alter table public.audit_sessions force row level security;

create index if not exists audit_sessions_order_id_idx on public.audit_sessions (order_id);
create index if not exists audit_sessions_created_at_idx on public.audit_sessions (created_at desc);

-- ── dashboard_view ───────────────────────────────────────────
create or replace view public.dashboard_view as
select
  p.merchant_id,
  count(distinct o.id) filter (where date_trunc('day', o.created_at) = date_trunc('day', now()))
    as orders_today,
  count(distinct o.id) filter (where o.status = 'paid')
    as total_paid_orders,
  coalesce(sum(o.total_paise) filter (where o.status = 'paid'), 0) as revenue_total_paise,
  coalesce(sum(o.total_paise) filter (
    where o.status = 'paid'
    and date_trunc('month', o.created_at) = date_trunc('month', now())
  ), 0) as revenue_month_paise,
  coalesce(sum(o.total_paise) filter (
    where o.status = 'paid'
    and date_trunc('day', o.created_at) = date_trunc('day', now())
  ), 0) as revenue_today_paise,
  count(distinct o.id) filter (where o.status = 'created') as pending_orders,
  count(distinct o.id) filter (where o.shipping_status = 'shipped') as shipped_orders,
  count(distinct o.id) filter (where o.shipping_status = 'delivered') as delivered_orders,
  count(distinct o.id) filter (where o.status = 'refunded') as refunded_orders,
  count(distinct p2.id) filter (where p2.status = 'active') as active_products
from public.products p
left join public.orders o on o.merchant_id = p.merchant_id
left join public.products p2 on p2.merchant_id = p.merchant_id
group by p.merchant_id;

-- ── analytics_view ───────────────────────────────────────────
create or replace view public.analytics_view as
select
  merchant_id,
  -- Revenue by day (last 30 days)
  jsonb_agg(day_data order by day_data->>'date') as daily_revenue,
  -- Orders by status
  jsonb_object_agg(status, count) as orders_by_status,
  -- Revenue by category
  jsonb_object_agg(category, revenue) as revenue_by_category,
  -- Top products by revenue
  (
    select jsonb_agg(row order by revenue desc)
    from (
      select
        jsonb_build_object('product_id', pr.id, 'title', pr.title, 'revenue', sum(oi->>'unit_price_paise')::bigint * (oi->>'qty')::int) as row
      from public.orders o,
           jsonb_array_elements(o.items) oi
      join public.products pr on pr.external_id = (oi->>'product_id')
      where pr.merchant_id = o.merchant_id and o.status = 'paid'
      group by pr.id, pr.title
      limit 10
    ) top
  ) as top_products
from (
  select
    o.merchant_id,
    date_trunc('day', o.created_at)::text as day,
    o.status,
    p.category,
    sum((case when o.status = 'paid' then 1 else 0 end)) as count,
    coalesce(sum(o.total_paise) filter (where o.status = 'paid'), 0) as revenue
  from public.orders o
  left join public.products p on true
  where o.created_at >= now() - interval '30 days'
  group by 1, 2, 3, 4
) agg
group by merchant_id;

-- ── Auto-update updated_at ────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at before update on public.products
  for each row execute function public.handle_updated_at();

create trigger orders_updated_at before update on public.orders
  for each row execute function public.handle_updated_at();

create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.handle_updated_at();

create trigger mandates_updated_at before update on public.payment_mandates
  for each row execute function public.handle_updated_at();

create trigger transactions_updated_at before update on public.payment_transactions
  for each row execute function public.handle_updated_at();

-- ── Auto-create profile on signup ────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Helper: generate external_id ─────────────────────────────
create or replace function public.generate_external_id(prefix text)
returns text language plpgsql as $$
declare
  seq_val bigint;
begin
  select nextval(quote_ident(prefix || '_seq')) into seq_val;
  return prefix || '_' || to_char(now(), 'YYYY') || '_' || lpad(seq_val::text, 4, '0');
end;
$$;

-- Sequences for external IDs
create sequence if not exists orders_seq;
create sequence if not exists conversations_seq;
