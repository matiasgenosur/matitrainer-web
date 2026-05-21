-- ============================================================
-- MatiTrainer — Migration: Planned Sessions v2
-- ============================================================
-- Replaces flat training_plans with a hierarchical model that
-- supports compound sessions, exercise variations, templates and
-- a shared exercise library.
--
-- training_plans is NOT dropped here. It is preserved through
-- the backfill (see 20260521120002_backfill_training_plans.sql)
-- and removed only in a later migration after verification.
-- ============================================================

-- ------------------------------------------------------------
-- EXERCISE LIBRARY (shared across all trainers)
-- ------------------------------------------------------------

create table if not exists exercises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  -- 'running' | 'strength' | 'mobility' | 'cardio' | 'crossfit' | 'other'
  category     text not null default 'other',
  -- Hint for the editor about the primary measurement field:
  -- 'reps' | 'time_sec' | 'distance_m' | 'rounds' | 'weight_reps'
  default_unit text not null default 'reps',
  video_url    text,
  description  text,
  created_by   uuid references matitrainer_users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_exercises_category on exercises(category);
create index if not exists idx_exercises_name_tsv
  on exercises using gin (to_tsvector('spanish', name));

create table if not exists exercise_variations (
  id          uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  name        text not null,
  -- Optional override of the parent exercise's video
  video_url   text,
  description text,
  created_by  uuid references matitrainer_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (exercise_id, name)
);

create index if not exists idx_variations_exercise on exercise_variations(exercise_id);

-- ------------------------------------------------------------
-- PLANNED SESSIONS (replaces training_plans)
-- ------------------------------------------------------------

create table if not exists planned_sessions (
  id                     uuid primary key default gen_random_uuid(),
  trainer_id             uuid not null references matitrainer_users(id) on delete restrict,
  trainee_id             uuid not null references matitrainer_users(id) on delete cascade,
  date                   date not null,
  name                   text not null,
  -- session_type enum:
  -- 'easy_run' | 'long_run' | 'tempo' | 'intervals' | 'strength' |
  -- 'crossfit' | 'mobility' | 'cross_training' | 'rest' |
  -- 'recovery' | 'trail' | 'fartlek' | 'other'
  session_type           text not null default 'other',
  estimated_duration_min int,
  notes                  text,
  -- If created from a template, record the source (not a hard FK)
  template_id            uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_planned_sessions_trainee_date on planned_sessions(trainee_id, date);
create index if not exists idx_planned_sessions_trainer on planned_sessions(trainer_id);
create index if not exists idx_planned_sessions_date on planned_sessions(date);

create table if not exists workout_blocks (
  id                       uuid primary key default gen_random_uuid(),
  session_id               uuid not null references planned_sessions(id) on delete cascade,
  order_index              int not null default 0,
  -- 'single' | 'straight_sets' | 'circuit' | 'superset' | 'warmup' | 'cooldown'
  -- Prepared to extend to 'amrap' | 'emom' | 'for_time'
  block_type               text not null default 'single',
  name                     text,
  rounds                   int not null default 1 check (rounds >= 1),
  rest_between_rounds_sec  int,
  -- Time cap for timed block types (amrap/emom future use)
  duration_cap_sec         int,
  notes                    text,
  created_at               timestamptz not null default now()
);

create index if not exists idx_workout_blocks_session on workout_blocks(session_id, order_index);

create table if not exists block_items (
  id              uuid primary key default gen_random_uuid(),
  block_id        uuid not null references workout_blocks(id) on delete cascade,
  exercise_id     uuid not null references exercises(id) on delete restrict,
  variation_id    uuid references exercise_variations(id) on delete set null,
  order_index     int not null default 0,
  sets            int not null default 1 check (sets >= 1),
  reps            int,
  weight_kg       numeric(6,2),
  duration_sec    int,
  distance_m      int,
  rest_after_sec  int,
  rpe             int check (rpe is null or (rpe >= 1 and rpe <= 10)),
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_block_items_block on block_items(block_id, order_index);
create index if not exists idx_block_items_exercise on block_items(exercise_id);

-- ------------------------------------------------------------
-- SESSION TEMPLATES (reusable, no date)
-- ------------------------------------------------------------

create table if not exists session_templates (
  id                     uuid primary key default gen_random_uuid(),
  created_by             uuid not null references matitrainer_users(id) on delete cascade,
  name                   text not null,
  description            text,
  session_type           text not null default 'other',
  estimated_duration_min int,
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_session_templates_creator on session_templates(created_by);

create table if not exists template_blocks (
  id                       uuid primary key default gen_random_uuid(),
  template_id              uuid not null references session_templates(id) on delete cascade,
  order_index              int not null default 0,
  block_type               text not null default 'single',
  name                     text,
  rounds                   int not null default 1 check (rounds >= 1),
  rest_between_rounds_sec  int,
  duration_cap_sec         int,
  notes                    text
);

create index if not exists idx_template_blocks_template on template_blocks(template_id, order_index);

create table if not exists template_items (
  id              uuid primary key default gen_random_uuid(),
  block_id        uuid not null references template_blocks(id) on delete cascade,
  exercise_id     uuid not null references exercises(id) on delete restrict,
  variation_id    uuid references exercise_variations(id) on delete set null,
  order_index     int not null default 0,
  sets            int not null default 1,
  reps            int,
  weight_kg       numeric(6,2),
  duration_sec    int,
  distance_m      int,
  rest_after_sec  int,
  rpe             int check (rpe is null or (rpe >= 1 and rpe <= 10)),
  notes           text
);

create index if not exists idx_template_items_block on template_items(block_id, order_index);

-- ------------------------------------------------------------
-- TRIGGERS: auto updated_at
-- ------------------------------------------------------------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_exercises_updated_at on exercises;
create trigger trg_exercises_updated_at before update on exercises
  for each row execute function set_updated_at();

drop trigger if exists trg_exercise_variations_updated_at on exercise_variations;
create trigger trg_exercise_variations_updated_at before update on exercise_variations
  for each row execute function set_updated_at();

drop trigger if exists trg_planned_sessions_updated_at on planned_sessions;
create trigger trg_planned_sessions_updated_at before update on planned_sessions
  for each row execute function set_updated_at();

drop trigger if exists trg_session_templates_updated_at on session_templates;
create trigger trg_session_templates_updated_at before update on session_templates
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- VIEWS: flat summary for quick listings
-- ------------------------------------------------------------

create or replace view planned_sessions_summary as
select
  ps.id,
  ps.trainer_id,
  ps.trainee_id,
  ps.date,
  ps.name,
  ps.session_type,
  ps.estimated_duration_min,
  ps.notes,
  ps.created_at,
  count(distinct wb.id) as block_count,
  count(distinct bi.id) as item_count
from planned_sessions ps
left join workout_blocks wb on wb.session_id = ps.id
left join block_items bi on bi.block_id = wb.id
group by ps.id;
