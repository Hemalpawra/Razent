-- Razent — One-time bootstrap for the demo users.
-- Run this once via the Supabase SQL editor (as the postgres role)
-- OR via `supabase db push` if you have service_role configured.
--
-- This file is intentionally NOT in the numbered migrations folder
-- because it depends on the email already existing in the project's
-- user list (which is project-specific state). Re-running is safe
-- thanks to ON CONFLICT DO NOTHING.

-- ── merchant1@razent.local (merchant role) ─────────────────
do $$
declare
  v_merchant_id uuid := 'b57fec42-c785-466e-b225-3f7a27edcccb';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_merchant_id, 'authenticated', 'authenticated',
    'merchant1@razent.local',
    crypt('demo-password-1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"merchant","full_name":"Merchant One"}'::jsonb,
    now(), now(), '', '', '', ''
  ) on conflict (id) do nothing;
end $$;

-- ── demo@razent.local (super_admin role) ────────────────────
do $$
declare
  v_demo_id uuid := 'b8fc7ffd-66d9-4dea-b3bb-e39d93bb8cd4';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_demo_id, 'authenticated', 'authenticated',
    'demo@razent.local',
    crypt('demo-password-1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"super_admin","full_name":"Demo Admin"}'::jsonb,
    now(), now(), '', '', '', ''
  ) on conflict (id) do nothing;
end $$;

-- The handle_new_user trigger creates the profiles rows automatically.
-- Confirm:
select user_id, role, email, full_name from public.profiles;
