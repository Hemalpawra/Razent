-- ============================================================
-- Razent — RLS Security + Commerce Protocol Helpers
-- Requires: 20260309000001_initial_schema
-- Follows Supabase Postgres Best Practices:
--   • ((select auth.uid())) wrapper in every USING clause
--   • security definer functions for cross-table lookups
--   • BUILT IN SEPARATE MIGRATION so policies can be audited
--     independently and re-applied without re-running the full schema.
-- ============================================================

-- ── Verified mandate helper (SECURITY DEFINER) ──────────────
-- Runs with creator privileges; bypasses RLS on payment_mandates
-- so we can look up mandates safely from within RLS policies.
create or replace function private.merchant_mandate_exists(
  p_mandate_id   text,
  p_merchant_id  uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.payment_mandates
    where mandate_id = p_mandate_id
      and merchant_id = p_merchant_id
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;

-- Revoke from public roles so only other DB functions can call it
revoke execute on function private.merchant_mandate_exists(text, uuid)
  from public, anon, authenticated, service_role;

-- ── Order visibility: mandate owner ──────────────────────────
-- An order is visible if the current user is:
--   1. the merchant who owns it, OR
--   2. the customer who placed it, OR
--   3. a super_admin, OR
--   4. holds an active mandate linked to this order (ACP path)
create or replace function private.can_view_order(p_order_external_id text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  declare
    v_order record;
    v_uid   uuid;
  begin
    v_uid := (select auth.uid());
    if v_uid is null then return false; end if;

    -- super_admin bypass
    if exists (
      select 1 from public.profiles
      where user_id = v_uid and role = 'super_admin'
    ) then return true; end if;

    select merchant_id, customer_id into v_order
    from public.orders
    where external_id = p_order_external_id;

    if v_order.merchant_id = v_uid then return true; end if;
    if v_order.customer_id = v_uid then return true; end if;

    -- mandate holder can view
    if exists (
      select 1 from public.payment_mandates
      where mandate_id = (
          select mandate_id from public.orders where external_id = p_order_external_id
        )
      and customer_id = v_uid
      and status = 'active'
    ) then return true; end if;

    return false;
  end;
$$;

revoke execute on function private.can_view_order(text)
  from public, anon, authenticated, service_role;

-- Replace the simpler SELECT policy with the full one
drop policy if exists orders_merchant_policy on public.orders;
create policy orders_view_policy on public.orders
  for select to authenticated
  using ((select private.can_view_order(external_id)));

-- ── UAP transaction: debit from mandate ─────────────────────
create or replace function public.fn_debit_mandate(
  p_mandate_id          text,
  p_amount_paise         bigint,
  p_transaction_id       text,
  p_settlement_reference text,
  p_ncpi_rrn            text,
  p_ncpi_stan           text,
  p_order_external_id   text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mandate   record;
  v_uid       uuid;
  v_new_usage bigint;
begin
  v_uid := (select auth.uid());
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'unauthenticated');
  end if;

  select * into v_mandate
  from public.payment_mandates
  where mandate_id = p_mandate_id
    and merchant_id = v_uid
    and status = 'active'
    and (expires_at is null or expires_at > now())
    and (delegated_limit_paise = 0 or delegated_limit_paise >= current_usage_paise + p_amount_paise)
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'mandate_invalid_or_insufficient_limit');
  end if;

  v_new_usage := v_mandate.current_usage_paise + p_amount_paise;

  update public.payment_mandates
  set current_usage_paise = v_new_usage,
      updated_at = now()
  where mandate_id = p_mandate_id;

  insert into public.payment_transactions (
    transaction_id, order_id, merchant_id, customer_id,
    mandate_id, protocol, direction, amount_paise,
    settlement_ref, npci_rrn, npci_stan, npci_timestamp,
    status
  ) values (
    p_transaction_id, p_order_external_id,
    v_mandate.merchant_id, v_mandate.customer_id,
    p_mandate_id, 'ncpi_uap', 'debit', p_amount_paise,
    p_settlement_reference, p_ncpi_rrn, p_ncpi_stan, now(),
    'settled'
  );

  return jsonb_build_object(
    'success', true,
    'mandate_id', p_mandate_id,
    'new_usage_paise', v_new_usage,
    'transaction_id', p_transaction_id,
    'rrn', p_ncpi_rrn
  );
end;
$$;

-- ── x402 challenge creation ─────────────────────────────────
create or replace function public.fn_create_x402_challenge(
  p_order_external_id   text,
  p_mandate_id          text default null,
  p_challenge_id       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order        record;
  v_challenge_id text;
  v_amount       bigint;
begin
  v_challenge_id := coalesce(p_challenge_id, 'chg_' || encode(gen_random_bytes(16), 'hex'));
  v_amount := 0;

  select * into v_order
  from public.orders
  where external_id = p_order_external_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'order_not_found');
  end if;

  update public.orders
  set challenge_id = v_challenge_id,
      updated_at = now()
  where external_id = p_order_external_id;

  return jsonb_build_object(
    'success', true,
    'challenge_id', v_challenge_id,
    'order_id', p_order_external_id,
    'amount_paise', v_order.total_paise,
    'currency', 'INR',
    'payment_url', '/pay/' || v_challenge_id,
    'mandate_id', p_mandate_id,
    'required_action', 'pay',
    'expires_at', (now() + interval '15 minutes')::timestamptz,
    'protocol', 'x402'
  );
end;
$$;

-- ── Refund helper ───────────────────────────────────────────
create or replace function public.fn_refund_order(
  p_order_external_id   text,
  p_refund_amount_paise bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order         record;
  v_refund_amount bigint;
begin
  select * into v_order
  from public.orders
  where external_id = p_order_external_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'order_not_found');
  end if;

  if v_order.status != 'paid' then
    return jsonb_build_object('success', false, 'error', 'order_not_paid');
  end if;

  v_refund_amount := coalesce(p_refund_amount_paise, v_order.total_paise);

  if v_refund_amount > v_order.total_paise then
    return jsonb_build_object('success', false, 'error', 'refund_exceeds_total');
  end if;

  update public.orders
  set status = case when v_refund_amount >= v_order.total_paise then 'refunded' else status end,
      shipping_status = case when v_refund_amount >= v_order.total_paise then 'returned' else shipping_status end,
      updated_at = now()
  where external_id = p_order_external_id;

  insert into public.payment_transactions (
    transaction_id, order_id, merchant_id, customer_id,
    protocol, direction, amount_paise, status
  ) values (
    'ref_' || encode(gen_random_bytes(8), 'hex'),
    p_order_external_id,
    v_order.merchant_id,
    v_order.customer_id,
    v_order.commerce_protocol,
    'refund',
    v_refund_amount,
    'refunded'
  );

  return jsonb_build_object(
    'success', true,
    'order_id', p_order_external_id,
    'refund_amount_paise', v_refund_amount
  );
end;
$$;

-- ── Order state machine (merchant actions) ──────────────────
create or replace function public.fn_update_shipping_status(
  p_order_external_id  text,
  p_shipping_status    text check (p_shipping_status in ('pending', 'packed', 'shipped', 'delivered', 'returned'))
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
begin
  select * into v_order
  from public.orders
  where external_id = p_order_external_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'order_not_found');
  end if;

  if v_order.merchant_id != (select auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  update public.orders
  set shipping_status = p_shipping_status,
      shipped_at = case when p_shipping_status = 'shipped' then now() else shipped_at end,
      delivered_at = case when p_shipping_status = 'delivered' then now() else delivered_at end,
      updated_at = now()
  where external_id = p_order_external_id;

  return jsonb_build_object(
    'success', true,
    'order_id', p_order_external_id,
    'shipping_status', p_shipping_status
  );
end;
$$;
