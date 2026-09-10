-- Track inactive customer conversations after one minute without activity.
alter table public.conversations drop constraint if exists conversations_status_check;
alter table public.conversations add constraint conversations_status_check
  check (status in (
    'active',
    'inactive',
    'waiting_for_customer',
    'waiting_for_payment',
    'checkout_ready',
    'paid',
    'completed',
    'failed',
    'cancelled',
    'closed',
    'resolved'
  ));

create or replace function public.mark_stale_conversations_inactive()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.conversations
  set status = 'inactive', updated_at = now()
  where status = 'active'
    and updated_at < now() - interval '1 minute';
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.mark_stale_conversations_inactive() to service_role;

do $$
begin
  create extension if not exists pg_cron;
  if not exists (
    select 1 from cron.job where jobname = 'mark-stale-conversations-inactive'
  ) then
    perform cron.schedule(
      'mark-stale-conversations-inactive',
      '* * * * *',
      'select public.mark_stale_conversations_inactive()'
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end $$;
