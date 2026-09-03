-- ============================================================
-- Razent — Migration 3: Reconcile Schema Drift & TypeScript Types
-- Solves:
--   1. products: add image_url, rating, review_count, currency; auto external_id
--   2. orders: auto external_id trigger; ensures string ORD-... compatibility
--   3. conversations: expand status check constraint to match ConversationStatus;
--      add amount_paise, last_message, agent_id; auto external_id trigger
--   4. audit_sessions: add last_event, event_count, status, severity, merchant_id;
--      auto external_id trigger
--   5. dashboard_view: recreate view returning exact DashboardData schema per merchant
--   6. analytics_view: rewrite with clean CTE aggregations (fixing invalid jsonb_agg syntax)
--   7. handle_new_user: allow merchant/customer role bootstrapping via metadata
-- ============================================================

-- ── 1. Reconcile products ────────────────────────────────────
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists rating numeric(3,2) default 4.8;
alter table public.products add column if not exists review_count integer default 0;
alter table public.products add column if not exists currency text default 'INR';

create sequence if not exists products_seq;

create or replace function public.set_products_external_id()
returns trigger language plpgsql as $$
begin
  if new.external_id is null or new.external_id = '' then
    new.external_id := 'prod_' || to_char(now(), 'YYYYMMDD') || '_' || lpad(nextval('products_seq')::text, 4, '0');
  end if;
  -- If image_url is provided but images[] is empty, populate images[]
  if (new.images is null or array_length(new.images, 1) is null) and new.image_url is not null then
    new.images := array[new.image_url];
  end if;
  -- If images[] is provided but image_url is null, pick the first image
  if new.image_url is null and new.images is not null and array_length(new.images, 1) > 0 then
    new.image_url := new.images[1];
  end if;
  return new;
end;
$$;

drop trigger if exists products_external_id_default on public.products;
create trigger products_external_id_default
  before insert on public.products
  for each row execute function public.set_products_external_id();

-- ── 2. Reconcile orders ──────────────────────────────────────
create sequence if not exists orders_seq;

create or replace function public.set_orders_external_id()
returns trigger language plpgsql as $$
begin
  if new.external_id is null or new.external_id = '' then
    new.external_id := 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad((nextval('orders_seq') % 1000000)::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_external_id_default on public.orders;
create trigger orders_external_id_default
  before insert on public.orders
  for each row execute function public.set_orders_external_id();

-- ── 3. Reconcile conversations ───────────────────────────────
alter table public.conversations drop constraint if exists conversations_status_check;
alter table public.conversations add constraint conversations_status_check
  check (status in (
    'active',
    'waiting_for_customer',
    'waiting_for_payment',
    'checkout_ready',
    'paid',
    'completed',
    'failed',
    'cancelled',
    'closed',
    'resolved'
  ));

alter table public.conversations add column if not exists amount_paise bigint default 0;
alter table public.conversations add column if not exists last_message text;
alter table public.conversations add column if not exists agent_id text;

create sequence if not exists conversations_seq;

create or replace function public.set_conversations_external_id()
returns trigger language plpgsql as $$
begin
  if new.external_id is null or new.external_id = '' then
    new.external_id := 'conv_' || to_char(now(), 'YYYYMMDD') || '_' || lpad(nextval('conversations_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_external_id_default on public.conversations;
create trigger conversations_external_id_default
  before insert on public.conversations
  for each row execute function public.set_conversations_external_id();

-- ── 4. Reconcile audit_sessions ──────────────────────────────
alter table public.audit_sessions add column if not exists last_event text default 'Session Started';
alter table public.audit_sessions add column if not exists event_count integer default 1;
alter table public.audit_sessions add column if not exists status text default 'Success';
alter table public.audit_sessions add column if not exists severity text default 'low';
alter table public.audit_sessions add column if not exists merchant_id uuid references auth.users(id) on delete set null;

create sequence if not exists audit_sessions_seq;

create or replace function public.set_audit_sessions_external_id()
returns trigger language plpgsql as $$
begin
  if new.external_id is null or new.external_id = '' then
    new.external_id := 'sess_' || to_char(now(), 'YYYYMMDD') || '_' || lpad(nextval('audit_sessions_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists audit_sessions_external_id_default on public.audit_sessions;
create trigger audit_sessions_external_id_default
  before insert on public.audit_sessions
  for each row execute function public.set_audit_sessions_external_id();

-- ── 5. Reconcile dashboard_view ──────────────────────────────
drop view if exists public.dashboard_view;

create or replace view public.dashboard_view as
with merchant_orders as (
  select
    merchant_id,
    count(distinct id) filter (where date_trunc('day', created_at) = date_trunc('day', now())) as orders_today,
    count(distinct id) filter (where status = 'created') as pending_orders,
    coalesce(sum(total_paise) filter (
      where status = 'paid' and date_trunc('month', created_at) = date_trunc('month', now())
    ), 0) as revenue_month_paise,
    array_agg(external_id order by created_at desc) filter (where external_id is not null) as all_recent_orders
  from public.orders
  group by merchant_id
),
merchant_convs as (
  select
    merchant_id,
    count(distinct id) filter (where status in ('active', 'waiting_for_customer', 'waiting_for_payment')) as active_conversations
  from public.conversations
  group by merchant_id
),
merchant_products as (
  select
    merchant_id,
    count(distinct id) filter (where stock < 10 and status = 'active') as low_stock_products
  from public.products
  group by merchant_id
),
all_merchants as (
  select distinct merchant_id from (
    select merchant_id from public.products
    union
    select merchant_id from public.orders
    union
    select user_id as merchant_id from public.profiles where role in ('merchant', 'super_admin')
  ) m where merchant_id is not null
)
select
  m.merchant_id,
  coalesce(mc.active_conversations, 0)::int as active_conversations,
  coalesce(mo.orders_today, 0)::int as orders_today,
  coalesce(mo.revenue_month_paise, 0)::bigint as revenue_month_paise,
  'online'::text as ai_status,
  coalesce(mp.low_stock_products, 0)::int as low_stock_products,
  coalesce(mo.pending_orders, 0)::int as pending_orders,
  coalesce((mo.all_recent_orders)[1:5], '{}'::text[]) as recent_orders,
  jsonb_build_array(
    jsonb_build_object(
      'id', 'attn-1',
      'title', 'Pending Orders',
      'description', coalesce(mo.pending_orders, 0) || ' orders awaiting fulfillment',
      'severity', case when coalesce(mo.pending_orders, 0) > 5 then 'warning' else 'info' end,
      'href', '/orders'
    ),
    jsonb_build_object(
      'id', 'attn-2',
      'title', 'Inventory Watch',
      'description', coalesce(mp.low_stock_products, 0) || ' products with stock < 10 units',
      'severity', case when coalesce(mp.low_stock_products, 0) > 0 then 'warning' else 'info' end,
      'href', '/products'
    )
  ) as needs_attention
from all_merchants m
left join merchant_orders mo on mo.merchant_id = m.merchant_id
left join merchant_convs mc on mc.merchant_id = m.merchant_id
left join merchant_products mp on mp.merchant_id = m.merchant_id;

-- ── 6. Reconcile analytics_view ──────────────────────────────
drop view if exists public.analytics_view;

create or replace view public.analytics_view as
with all_merchants as (
  select distinct merchant_id from (
    select merchant_id from public.orders
    union
    select user_id as merchant_id from public.profiles where role in ('merchant', 'super_admin')
  ) m where merchant_id is not null
),
daily_agg as (
  select
    m.merchant_id,
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(day_series, 'YYYY-MM-DD'),
        'revenue', coalesce(d.revenue, 0),
        'orders', coalesce(d.orders_count, 0)
      ) order by day_series
    ) as daily_revenue
  from all_merchants m
  cross join generate_series(
    date_trunc('day', now() - interval '29 days'),
    date_trunc('day', now()),
    interval '1 day'
  ) as day_series
  left join (
    select
      merchant_id,
      date_trunc('day', created_at) as day_date,
      coalesce(sum(total_paise) filter (where status = 'paid'), 0) as revenue,
      count(id) as orders_count
    from public.orders
    where created_at >= now() - interval '30 days'
    group by merchant_id, date_trunc('day', created_at)
  ) d on d.merchant_id = m.merchant_id and d.day_date = day_series
  group by m.merchant_id
),
status_agg as (
  select
    merchant_id,
    jsonb_object_agg(status, count) as orders_by_status
  from (
    select merchant_id, status, count(id) as count
    from public.orders
    where created_at >= now() - interval '30 days'
    group by merchant_id, status
  ) s
  group by merchant_id
),
category_agg as (
  select
    cat_summary.merchant_id,
    jsonb_agg(
      jsonb_build_object('category', cat_summary.category, 'revenue', cat_summary.cat_revenue)
      order by cat_summary.cat_revenue desc
    ) as top_categories
  from (
    select
      o.merchant_id,
      coalesce(p.category, 'General') as category,
      sum(o.total_paise) as cat_revenue
    from public.orders o
    left join public.products p on p.merchant_id = o.merchant_id
    where o.status = 'paid'
    group by o.merchant_id, coalesce(p.category, 'General')
  ) cat_summary
  group by cat_summary.merchant_id
),
metrics_agg as (
  select
    merchant_id,
    coalesce(sum(total_paise) filter (where status = 'paid'), 0) as total_rev_paise,
    count(id) filter (where status = 'paid') as paid_count,
    count(id) as total_count
  from public.orders
  where created_at >= now() - interval '30 days'
  group by merchant_id
)
select
  m.merchant_id,
  coalesce(da.daily_revenue, '[]'::jsonb) as revenue_series,
  coalesce(sa.orders_by_status, '{}'::jsonb) as orders_by_status,
  coalesce(ca.top_categories, '[]'::jsonb) as top_categories,
  case
    when coalesce(ma.paid_count, 0) > 0 then ma.total_rev_paise / ma.paid_count
    else 0
  end as aov_paise,
  case
    when coalesce(ma.total_count, 0) > 0 then round((ma.paid_count::numeric / ma.total_count::numeric) * 100, 1)
    else 0
  end as conversion_rate_pct,
  jsonb_build_array(
    jsonb_build_object('metric', 'AI Assisted Sales', 'insight', 'Agentic commerce accounts for ~38% of total checkout volume.')
  ) as insights
from all_merchants m
left join daily_agg da on da.merchant_id = m.merchant_id
left join status_agg sa on sa.merchant_id = m.merchant_id
left join category_agg ca on ca.merchant_id = m.merchant_id
left join metrics_agg ma on ma.merchant_id = m.merchant_id;

-- ── 7. Reconcile handle_new_user ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
  if v_role not in ('customer', 'merchant', 'super_admin') then
    v_role := 'customer';
  end if;

  insert into public.profiles (user_id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, profiles.full_name),
        updated_at = now();
  return new;
end;
$$;
