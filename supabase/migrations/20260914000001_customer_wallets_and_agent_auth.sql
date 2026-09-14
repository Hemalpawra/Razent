-- ============================================================
-- Migration: Customer Wallets, Agent Delegation & Autonomous Commerce
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL UNIQUE, -- Clerk User ID
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  wallet_balance_paise BIGINT NOT NULL DEFAULT 500000, -- Default ₹5,000 for active testing/demo
  currency TEXT NOT NULL DEFAULT 'INR',
  ai_purchases_enabled BOOLEAN NOT NULL DEFAULT true,
  spend_limit_paise BIGINT NOT NULL DEFAULT 200000, -- Default ₹2,000 (Capped at ₹15,000 NPCI limit)
  agent_auth_token TEXT NOT NULL UNIQUE, -- e.g. rz_agt_live_...
  payment_method TEXT NOT NULL DEFAULT 'wallet',
  default_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for rapid lookup by customer or agent passkey
CREATE INDEX IF NOT EXISTS idx_customer_wallets_customer_id ON public.customer_wallets(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_wallets_token ON public.customer_wallets(agent_auth_token);

-- Enable Row Level Security
ALTER TABLE public.customer_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS customer_wallets_anon_select ON public.customer_wallets;
CREATE POLICY customer_wallets_anon_select ON public.customer_wallets
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS customer_wallets_anon_insert ON public.customer_wallets;
CREATE POLICY customer_wallets_anon_insert ON public.customer_wallets
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS customer_wallets_anon_update ON public.customer_wallets;
CREATE POLICY customer_wallets_anon_update ON public.customer_wallets
  FOR UPDATE TO anon
  USING (true);

DROP POLICY IF EXISTS customer_wallets_auth_select ON public.customer_wallets;
CREATE POLICY customer_wallets_auth_select ON public.customer_wallets
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS customer_wallets_auth_insert ON public.customer_wallets;
CREATE POLICY customer_wallets_auth_insert ON public.customer_wallets
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS customer_wallets_auth_update ON public.customer_wallets;
CREATE POLICY customer_wallets_auth_update ON public.customer_wallets
  FOR UPDATE TO authenticated
  USING (true);

-- Grant table access
GRANT ALL ON public.customer_wallets TO postgres, service_role, anon, authenticated;
