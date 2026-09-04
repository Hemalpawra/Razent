-- ============================================================
-- Migration: Grant products & conversations access for storefront and merchant sync
-- ============================================================

-- ── 1. Products RLS ──────────────────────────────────────────
drop policy if exists products_anon_select on public.products;
create policy products_anon_select on public.products
  for select to anon
  using (true);

drop policy if exists products_anon_insert on public.products;
create policy products_anon_insert on public.products
  for insert to anon
  with check (true);

drop policy if exists products_anon_update on public.products;
create policy products_anon_update on public.products
  for update to anon
  using (true);

drop policy if exists products_merchant_policy on public.products;
drop policy if exists products_authenticated_select on public.products;
create policy products_authenticated_select on public.products
  for select to authenticated
  using (
    merchant_id = auth.uid()
    or merchant_id = 'b57fec42-c785-466e-b225-3f7a27edcccb'
    or exists (select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin')
  );

drop policy if exists products_merchant_insert on public.products;
drop policy if exists products_authenticated_insert on public.products;
create policy products_authenticated_insert on public.products
  for insert to authenticated
  with check (
    merchant_id = auth.uid()
    or merchant_id = 'b57fec42-c785-466e-b225-3f7a27edcccb'
    or exists (select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin')
  );

drop policy if exists products_merchant_update on public.products;
drop policy if exists products_authenticated_update on public.products;
create policy products_authenticated_update on public.products
  for update to authenticated
  using (
    merchant_id = auth.uid()
    or merchant_id = 'b57fec42-c785-466e-b225-3f7a27edcccb'
    or exists (select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin')
  );

-- ── 2. Conversations RLS ──────────────────────────────────────
drop policy if exists conversations_anon_select on public.conversations;
create policy conversations_anon_select on public.conversations
  for select to anon
  using (true);

drop policy if exists conversations_anon_insert on public.conversations;
create policy conversations_anon_insert on public.conversations
  for insert to anon
  with check (true);

drop policy if exists conversations_anon_update on public.conversations;
create policy conversations_anon_update on public.conversations
  for update to anon
  using (true);

drop policy if exists conversations_merchant_policy on public.conversations;
drop policy if exists conversations_authenticated_select on public.conversations;
create policy conversations_authenticated_select on public.conversations
  for select to authenticated
  using (
    merchant_id = auth.uid()
    or merchant_id = 'b57fec42-c785-466e-b225-3f7a27edcccb'
    or customer_id = auth.uid()
    or exists (select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin')
  );

drop policy if exists conversations_merchant_insert on public.conversations;
drop policy if exists conversations_authenticated_insert on public.conversations;
create policy conversations_authenticated_insert on public.conversations
  for insert to authenticated
  with check (
    merchant_id = auth.uid()
    or merchant_id = 'b57fec42-c785-466e-b225-3f7a27edcccb'
    or exists (select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin')
  );

drop policy if exists conversations_merchant_update on public.conversations;
drop policy if exists conversations_authenticated_update on public.conversations;
create policy conversations_authenticated_update on public.conversations
  for update to authenticated
  using (
    merchant_id = auth.uid()
    or merchant_id = 'b57fec42-c785-466e-b225-3f7a27edcccb'
    or exists (select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin')
  );
