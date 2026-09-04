-- Migration to enforce strict RLS on audit_sessions and apply explicit grants to views

-- Drop the overly permissive policy
DROP POLICY IF EXISTS audit_all_read ON public.audit_sessions;

-- Recreate it to enforce tenant isolation
CREATE POLICY audit_all_read ON public.audit_sessions
  FOR SELECT TO authenticated USING (merchant_id = auth.uid());

-- Revoke default public access
REVOKE ALL ON public.dashboard_view FROM PUBLIC, anon;
REVOKE ALL ON public.analytics_view FROM PUBLIC, anon;
REVOKE ALL ON public.audit_protocol_counts_view FROM PUBLIC, anon;
REVOKE ALL ON public.audit_sessions_view FROM PUBLIC, anon;

-- Explicitly grant SELECT to authenticated users
GRANT SELECT ON public.dashboard_view TO authenticated;
GRANT SELECT ON public.analytics_view TO authenticated;
GRANT SELECT ON public.audit_protocol_counts_view TO authenticated;
GRANT SELECT ON public.audit_sessions_view TO authenticated;
