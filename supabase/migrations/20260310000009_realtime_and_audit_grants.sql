-- ============================================================
-- Migration: Enable Realtime on orders & conversations, grant audit_sessions_view
-- ============================================================

-- 1. Grant SELECT on audit_sessions_view to authenticated & anon roles
GRANT SELECT ON public.audit_sessions_view TO authenticated, anon;

-- 2. Add orders and conversations to Supabase Realtime publication
-- First ensure tables exist in the publication without failing if already added
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 3. Set REPLICA IDENTITY FULL so Realtime UPDATE/DELETE payloads contain complete previous/new row data
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
