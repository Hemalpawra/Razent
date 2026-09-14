-- ============================================================
-- Migration: Fix Critical Security Vulnerabilities & RLS Hardening
-- Resolves insecure anon access, privilege escalation, and data leaks.
-- ============================================================

-- ── 1. Harden Products Table ─────────────────────────────────
-- Revoke anon insert and update permissions. Anon should ONLY view active products.
DROP POLICY IF EXISTS products_anon_insert ON public.products;
DROP POLICY IF EXISTS products_anon_update ON public.products;
REVOKE INSERT, UPDATE, DELETE ON public.products FROM anon;

DROP POLICY IF EXISTS products_anon_select ON public.products;
CREATE POLICY products_anon_select ON public.products
  FOR SELECT TO anon
  USING (status = 'active');

-- ── 2. Harden Orders Table ───────────────────────────────────
-- Revoke anon select on orders. Anon users must NOT dump all customer orders.
-- Tracking is mediated via Edge Functions with phone/email verification.
DROP POLICY IF EXISTS orders_anon_select ON public.orders;
REVOKE SELECT ON public.orders FROM anon;

-- ── 3. Harden Customer Wallets Table ─────────────────────────
-- Drop all public anon access to wallets.
DROP POLICY IF EXISTS customer_wallets_anon_select ON public.customer_wallets;
DROP POLICY IF EXISTS customer_wallets_anon_insert ON public.customer_wallets;
DROP POLICY IF EXISTS customer_wallets_anon_update ON public.customer_wallets;
REVOKE ALL ON public.customer_wallets FROM anon;

-- Restrict authenticated access strictly to the wallet owner or admin
DROP POLICY IF EXISTS customer_wallets_auth_select ON public.customer_wallets;
CREATE POLICY customer_wallets_auth_select ON public.customer_wallets
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()::text
    OR customer_id = (auth.jwt() ->> 'sub')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (user_id = auth.uid() OR clerk_user_id = (auth.jwt() ->> 'sub'))
        AND role IN ('super_admin', 'merchant')
    )
  );

DROP POLICY IF EXISTS customer_wallets_auth_insert ON public.customer_wallets;
CREATE POLICY customer_wallets_auth_insert ON public.customer_wallets
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()::text
    OR customer_id = (auth.jwt() ->> 'sub')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (user_id = auth.uid() OR clerk_user_id = (auth.jwt() ->> 'sub'))
        AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS customer_wallets_auth_update ON public.customer_wallets;
CREATE POLICY customer_wallets_auth_update ON public.customer_wallets
  FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()::text
    OR customer_id = (auth.jwt() ->> 'sub')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (user_id = auth.uid() OR clerk_user_id = (auth.jwt() ->> 'sub'))
        AND role = 'super_admin'
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.customer_wallets TO authenticated;
GRANT ALL ON public.customer_wallets TO service_role;

-- ── 4. Harden Conversations Table ────────────────────────────
-- Prevent anon users from reading all conversations or modifying chats.
DROP POLICY IF EXISTS conversations_anon_select ON public.conversations;
DROP POLICY IF EXISTS conversations_anon_update ON public.conversations;
REVOKE SELECT, UPDATE, DELETE ON public.conversations FROM anon;
