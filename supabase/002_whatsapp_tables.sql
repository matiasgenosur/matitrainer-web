-- Migration: WhatsApp bot tables with binding token system
-- Run this in Supabase SQL Editor

-- Users (trainers and trainees)
create table if not exists matitrainer_users (
  id uuid default gen_random_uuid() primary key,
  role text not null check (role in ('trainer', 'trainee')),
  display_name text not null,
  whatsapp_number text,  -- e.g. "569..."
  strava_athlete_id bigint unique,
  created_at timestamptz default now()
);

-- Sessions (trainer <-> trainee pair)
create table if not exists matitrainer_sessions (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid not null references matitrainer_users(id),
  trainee_id uuid not null references matitrainer_users(id),
  whatsapp_group_id text,  -- set on binding, e.g. "120363...@g.us"
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  created_at timestamptz default now(),
  activated_at timestamptz,
  revoked_at timestamptz
);

-- Bind tokens (one-time use to link WhatsApp group to session)
create table if not exists matitrainer_bind_tokens (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references matitrainer_sessions(id) on delete cascade,
  token_hash text not null,  -- sha256 of the raw token
  consumed boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Readiness surveys (post-Crossfit)
create table if not exists readiness_surveys (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references matitrainer_sessions(id) on delete cascade,
  activity_id bigint references activities(id),
  survey_date date not null,
  sleep_quality int check (sleep_quality between 1 and 5),
  energy_level int check (energy_level between 1 and 5),
  muscle_state int check (muscle_state between 1 and 5),
  stress_level int check (stress_level between 1 and 5),
  mood int check (mood between 1 and 5),
  readiness_score decimal(3,2),
  completed boolean default false,
  created_at timestamptz default now(),
  unique(session_id, survey_date)
);

-- Idempotency for WhatsApp webhook
create table if not exists processed_messages (
  hub_message_id text primary key,
  processed_at timestamptz default now()
);

-- Extend chat_history for multi-tenant WhatsApp
alter table chat_history add column if not exists channel text default 'web';
alter table chat_history add column if not exists session_id uuid references matitrainer_sessions(id);

-- Drop old teams table if it exists (superseded by sessions)
drop table if exists teams cascade;

-- Indexes
create index if not exists idx_sessions_status on matitrainer_sessions(status);
create index if not exists idx_sessions_group on matitrainer_sessions(whatsapp_group_id) where whatsapp_group_id is not null;
create index if not exists idx_bind_tokens_hash on matitrainer_bind_tokens(token_hash) where not consumed;
create index if not exists idx_users_whatsapp on matitrainer_users(whatsapp_number) where whatsapp_number is not null;

-- RLS policies (service role bypasses RLS)
alter table matitrainer_users enable row level security;
alter table matitrainer_sessions enable row level security;
alter table matitrainer_bind_tokens enable row level security;
alter table readiness_surveys enable row level security;
alter table processed_messages enable row level security;
