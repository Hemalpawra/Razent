-- ============================================================
-- Razent — Index on customer_email for fast chat history retrieval
-- Follows /supabase-postgres-best-practices
-- ============================================================

create index if not exists conversations_customer_email_idx
  on public.conversations (customer_email)
  where customer_email is not null;

create index if not exists conversations_created_at_idx
  on public.conversations (created_at desc);
