-- ============================================================
-- Razent — Conversations table extra columns
-- Added 2026-09-04 to match the TS Conversation type
-- (src/lib/types/conversation.ts).
-- ============================================================

alter table public.conversations
  add column if not exists order_id text,
  add column if not exists products_recommended jsonb default '[]',
  add column if not exists products_compared jsonb default '[]',
  add column if not exists selected_product jsonb,
  add column if not exists upsell jsonb,
  add column if not exists shipping_collected boolean default false,
  add column if not exists shipping_address jsonb,
  add column if not exists tracking_status text,
  add column if not exists merchant_id uuid references auth.users(id) on delete set null;

create index if not exists conversations_merchant_id_v2_idx
  on public.conversations (merchant_id) where merchant_id is not null;

-- audit_sessions.merchant_id is already added in 20260309000003; this
-- is a no-op safety check.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_sessions' and column_name = 'merchant_id'
  ) then
    alter table public.audit_sessions
      add column merchant_id uuid references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists audit_sessions_merchant_id_v2_idx
  on public.audit_sessions (merchant_id) where merchant_id is not null;
