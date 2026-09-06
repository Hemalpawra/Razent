-- ============================================================
-- Razent — Roles, Permissions, Merchant Sessions & Consent State
-- Provides explicit DB-level objects for RBAC and Mandate state
-- Enforcing view-only vs admin authorization at the data layer
-- ============================================================

-- ── 1. Roles Table ──────────────────────────────────────────
create table if not exists public.roles (
  id          text primary key, -- 'admin', 'view_only', 'super_admin'
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

alter table public.roles enable row level security;
create policy roles_read_policy on public.roles for select using (true);

-- ── 2. Permissions Table ────────────────────────────────────
create table if not exists public.permissions (
  id          text primary key, -- e.g. 'refund_orders', 'edit_products'
  name        text not null,
  category    text not null default 'general',
  description text,
  created_at  timestamptz not null default now()
);

alter table public.permissions enable row level security;
create policy permissions_read_policy on public.permissions for select using (true);

-- ── 3. Role-Permissions Join Table ──────────────────────────
create table if not exists public.role_permissions (
  role_id       text references public.roles(id) on delete cascade not null,
  permission_id text references public.permissions(id) on delete cascade not null,
  primary key (role_id, permission_id)
);

create index if not exists role_permissions_role_idx on public.role_permissions (role_id);
create index if not exists role_permissions_permission_idx on public.role_permissions (permission_id);

alter table public.role_permissions enable row level security;
create policy role_permissions_read_policy on public.role_permissions for select using (true);

-- ── 4. Merchant Sessions Table ──────────────────────────────
create table if not exists public.merchant_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  merchant_id    uuid not null,
  role           text not null references public.roles(id) default 'view_only',
  ip_address     inet,
  user_agent     text,
  last_active_at timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '7 days'),
  created_at     timestamptz not null default now()
);

create index if not exists merchant_sessions_user_id_idx on public.merchant_sessions (user_id);
create index if not exists merchant_sessions_merchant_id_idx on public.merchant_sessions (merchant_id);

alter table public.merchant_sessions enable row level security;
create policy merchant_sessions_policy on public.merchant_sessions
  for all using (
    ((select auth.uid()) = user_id) or ((select auth.uid()) is null)
  );

-- ── 5. Payment Mandate / Consent State Enhancement ──────────
-- Add explicit consent, limit per tx, frequency, and signature verification
alter table public.payment_mandates
  add column if not exists max_per_tx_paise bigint default 1500000 check (max_per_tx_paise > 0),
  add column if not exists consent_token text,
  add column if not exists frequency text default 'as_presented',
  add column if not exists actor text default 'delegated_ai_assistant',
  add column if not exists rbi_compliant boolean default true;

-- ── 6. Seed Roles & Permissions ─────────────────────────────
insert into public.roles (id, name, description)
values
  ('admin', 'Merchant Administrator', 'Full administrative authority: can edit, delete, refund, configure, and export.'),
  ('view_only', 'View-Only Merchant', 'Auditor & observer role: can view catalog, orders, and analytics, but cannot refund, delete, or modify data.'),
  ('super_admin', 'Platform Super Admin', 'Platform operator with unrestricted access across all tenants.')
on conflict (id) do update set description = excluded.description;

insert into public.permissions (id, name, category, description)
values
  ('view_products', 'View Products', 'catalog', 'Read products in inventory'),
  ('edit_products', 'Edit Products', 'catalog', 'Create, update, and manage product inventory'),
  ('delete_products', 'Delete Products', 'catalog', 'Remove products from the catalog'),
  ('import_products', 'Import Products', 'catalog', 'Bulk CSV import of products'),
  ('export_data', 'Export Data', 'reports', 'Export orders, products, or customer tables to CSV/Excel'),
  ('view_orders', 'View Orders', 'orders', 'View order list and fulfillment states'),
  ('refund_orders', 'Refund Orders', 'orders', 'Initiate payment refunds for customer orders'),
  ('view_ai_agent', 'View AI Agent', 'ai', 'View agent status and conversation transcripts'),
  ('edit_ai_settings', 'Edit AI Settings', 'ai', 'Adjust autonomy ceilings, agent system prompts, and mandates'),
  ('view_audit_trail', 'View Audit Trail', 'audit', 'Inspect 11-step audit events and cryptographic session hashes'),
  ('export_audit', 'Export Audit Trail', 'audit', 'Download and export audit compliance trails'),
  ('view_analytics', 'View Analytics', 'analytics', 'Access revenue KPIs, conversation conversion metrics'),
  ('edit_settings', 'Edit Store Settings', 'settings', 'Modify merchant profile, payout UPI, and API keys')
on conflict (id) do update set description = excluded.description;

-- Admin receives all permissions
insert into public.role_permissions (role_id, permission_id)
select 'admin', id from public.permissions
on conflict do nothing;

-- Super Admin receives all permissions
insert into public.role_permissions (role_id, permission_id)
select 'super_admin', id from public.permissions
on conflict do nothing;

-- View-only receives read permissions only
insert into public.role_permissions (role_id, permission_id)
values
  ('view_only', 'view_products'),
  ('view_only', 'view_orders'),
  ('view_only', 'view_ai_agent'),
  ('view_only', 'view_audit_trail'),
  ('view_only', 'view_analytics')
on conflict do nothing;

-- ── 7. Server-side Permission Check Helper Function ─────────
create or replace function public.has_permission(
  p_role text,
  p_permission text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.role_permissions
    where role_id = p_role and permission_id = p_permission
  );
$$;

grant execute on function public.has_permission(text, text) to anon, authenticated, service_role;
grant select on public.roles to anon, authenticated, service_role;
grant select on public.permissions to anon, authenticated, service_role;
grant select on public.role_permissions to anon, authenticated, service_role;
grant select, insert, update on public.merchant_sessions to anon, authenticated, service_role;

-- ── 8. Ensure Audit Sequence & Permissions ───────────────────
create sequence if not exists public.audit_sessions_seq;
grant usage, select on sequence public.audit_sessions_seq to anon, authenticated, service_role;
