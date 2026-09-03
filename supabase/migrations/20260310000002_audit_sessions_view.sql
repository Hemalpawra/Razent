-- ============================================================
-- Razent — audit_sessions_view (Q4 view-based rollup)
-- Requires: 20260309000001_initial_schema
--            20260309000002_rls_security_commerce
--            20260309000003_reconcile_schema_drift
--
-- Decision Q4 (B): the TS AuditSession type has rollup fields
-- (event_count, last_event, status, severity) computed in JS by
-- rollup(). The view computes them in SQL so the merchant Audit Trail
-- table reads from a single source of truth.
--
-- Worst-of aggregation uses a CASE chain: Critical > Failed > Warning > Success.
-- ============================================================

-- ── audit_sessions_view: rollup + per-event flatten ──────────
create or replace view public.audit_sessions_view as
with event_rollup as (
  select
    s.external_id                                          as session_id,
    s.order_id,
    s.customer,
    s.actor_label,
    s.events                                               as events_jsonb,
    s.merchant_id,
    s.created_at,
    -- Rollup fields (Q4)
    jsonb_array_length(s.events)                           as event_count,
    case
      when jsonb_array_length(s.events) = 0 then null
      else (s.events -> -1 ->> 'type')
    end                                                    as last_event,
    case
      when exists (
        select 1 from jsonb_array_elements(s.events) e
        where e->>'result' = 'Critical'
      ) then 'Critical'
      when exists (
        select 1 from jsonb_array_elements(s.events) e
        where e->>'result' = 'Failed'
      ) then 'Failed'
      when exists (
        select 1 from jsonb_array_elements(s.events) e
        where e->>'result' = 'Warning'
      ) then 'Warning'
      else 'Success'
    end                                                    as status,
    case
      when exists (
        select 1 from jsonb_array_elements(s.events) e
        where e->>'result' = 'Critical'
      ) then 'Critical'
      when exists (
        select 1 from jsonb_array_elements(s.events) e
        where e->>'result' = 'Failed'
      ) then 'Failed'
      when exists (
        select 1 from jsonb_array_elements(s.events) e
        where e->>'result' = 'Warning'
      ) then 'Warning'
      else 'Success'
    end                                                    as severity
  from public.audit_sessions s
)
select
  er.session_id,
  er.order_id,
  er.customer,
  er.actor_label,
  er.events_jsonb                                         as events,
  er.merchant_id,
  er.created_at,
  er.event_count,
  er.last_event,
  er.status,
  er.severity
from event_rollup er;

-- RLS: the underlying audit_sessions table is already protected.
-- For the view, inherit by default (Postgres views run as the
-- invoking role). Re-apply the same select policy via a security
-- invoker view since the view reads from a SECURITY DEFINER world.
do $$
begin
  -- If the project runs on Postgres 15+ we can use security_invoker.
  if current_setting('server_version_num')::int >= 150000 then
    execute 'alter view public.audit_sessions_view set (security_invoker = on)';
  end if;
end $$;

comment on view public.audit_sessions_view is
  'Per-session rollup of audit_sessions.events jsonb. '
  'Returns event_count, last_event, status, severity (worst-of). '
  'Read via getAuditSessions() in lib/api/client.ts.';

-- ── Convenience: per-protocol counts (used by AuditDrawer tabs) ───
create or replace view public.audit_protocol_counts_view as
select
  s.external_id                       as session_id,
  count(*) filter (
    where e->>'source' in ('NPCI UAP', 'UAP Verifier')
  )                                   as uap_events,
  count(*) filter (
    where e->>'source' = 'Razorpay'
  )                                   as razorpay_events,
  count(*) filter (
    where e->>'type' in ('mandate', 'AP2 Mandate Rejected')
  )                                   as ap2_events,
  count(*) filter (
    where e->>'source' = 'x402' or e->>'type' like '%x402%'
  )                                   as x402_events
from public.audit_sessions s,
     jsonb_array_elements(s.events) e
group by s.external_id;

comment on view public.audit_protocol_counts_view is
  'Per-session event counts by commerce protocol (UAP, Razorpay, AP2, x402).';
