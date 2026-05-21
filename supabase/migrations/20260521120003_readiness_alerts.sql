-- ============================================================
-- MIGRATION: Phase 8 — Smart Readiness Alerts
-- ============================================================
-- Apply after the planned_sessions migrations.
-- ============================================================

-- Optional link from a readiness survey to a planned session
-- plus free-form athlete notes
alter table readiness_surveys
  add column if not exists session_id uuid references planned_sessions(id) on delete set null,
  add column if not exists notes text;

-- Denormalize trainee_id onto readiness_surveys for cheaper queries from
-- the alerts engine. Backfill from matitrainer_sessions for legacy rows.
alter table readiness_surveys
  add column if not exists trainee_id uuid references matitrainer_users(id) on delete cascade;

update readiness_surveys rs
   set trainee_id = ms.trainee_id
  from matitrainer_sessions ms
 where rs.trainee_id is null
   and rs.session_id = ms.id;

create index if not exists idx_readiness_trainee_date
  on readiness_surveys(trainee_id, created_at desc);

create index if not exists idx_readiness_session
  on readiness_surveys(session_id) where session_id is not null;

-- ------------------------------------------------------------
-- Alert table produced by the rules engine
-- ------------------------------------------------------------
create table if not exists readiness_alerts (
  id                   uuid primary key default gen_random_uuid(),
  trainee_id           uuid not null references matitrainer_users(id) on delete cascade,
  trainer_id           uuid not null references matitrainer_users(id) on delete restrict,
  alert_type           text not null,
    -- 'low_score_streak' | 'acute_drop' | 'sleep_chronic' |
    -- 'muscular_persistent' | 'stress_high' | 'motivation_low' | 'combo_red'
  severity             text not null check (severity in ('low','medium','high')),
  triggered_at         timestamptz not null default now(),
  data                 jsonb not null default '{}'::jsonb,
    -- e.g. { "scores": [2.8, 2.4, 2.9], "dates": ["..."], "acwr": 1.34 }
  suggested_action     text,
  proposed_changes     jsonb default '[]'::jsonb,
    -- e.g. [{ "session_id": "uuid", "field": "distance_m", "from": 20000, "to": 14000 }]
  affected_session_ids uuid[] default '{}',
  status               text not null default 'pending'
    check (status in ('pending','acknowledged','applied','dismissed','expired')),
  acknowledged_at      timestamptz,
  acknowledged_by      uuid references matitrainer_users(id) on delete set null,
  trainer_notes        text,
  applied_changes      jsonb,
    -- snapshot of changes actually applied (may differ from proposed)
  created_at           timestamptz not null default now()
);

create index if not exists idx_readiness_alerts_pending
  on readiness_alerts(trainer_id, status, triggered_at desc)
  where status = 'pending';

create index if not exists idx_readiness_alerts_trainee
  on readiness_alerts(trainee_id, triggered_at desc);

-- ------------------------------------------------------------
-- Helper function: expire pending alerts older than 14 days
-- ------------------------------------------------------------
create or replace function expire_old_readiness_alerts()
returns void as $$
begin
  update readiness_alerts
  set status = 'expired'
  where status = 'pending'
    and triggered_at < now() - interval '14 days';
end;
$$ language plpgsql;
