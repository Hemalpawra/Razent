-- Migration to fix Supabase Postgres lint errors

-- 0010: Security Definer View
-- Altering views to execute with invoker privileges
ALTER VIEW public.audit_protocol_counts_view SET (security_invoker = on);
ALTER VIEW public.dashboard_view SET (security_invoker = on);
ALTER VIEW public.analytics_view SET (security_invoker = on);

-- 0011: Function Search Path Mutable
-- Set search_path to empty string for explicitly qualified security definer functions
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
ALTER FUNCTION public.generate_external_id(text) SET search_path = '';
ALTER FUNCTION public.set_products_external_id() SET search_path = '';
ALTER FUNCTION public.set_orders_external_id() SET search_path = '';
ALTER FUNCTION public.set_conversations_external_id() SET search_path = '';
ALTER FUNCTION public.set_audit_sessions_external_id() SET search_path = '';
ALTER FUNCTION public.compute_invoice_subtotal(jsonb) SET search_path = '';

-- 0024: RLS Policy Always True
-- Audit sessions insert policy should restrict authenticated users to only insert their own records
DROP POLICY IF EXISTS audit_all_insert ON public.audit_sessions;
CREATE POLICY audit_all_insert ON public.audit_sessions FOR INSERT TO authenticated
WITH CHECK ( merchant_id = auth.uid() );

-- 0028 & 0029: Public/Authenticated Can Execute SECURITY DEFINER Function
-- Revoke execute permissions from anon and authenticated for sensitive payment/order lifecycle functions
REVOKE EXECUTE ON FUNCTION public.fn_create_x402_challenge(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_create_x402_challenge(text, text, text) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_debit_mandate(text, bigint, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_debit_mandate(text, bigint, text, text, text, text, text) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_refund_order(text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_refund_order(text, bigint) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_update_shipping_status(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_update_shipping_status(text, text) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
