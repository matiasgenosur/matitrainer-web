-- Migration: WhatsApp bot tables
-- Run this in Supabase SQL Editor

-- Teams: maps trainer + trainee + WhatsApp group
create table if not exists teams (
  id uuid default gen_random_uuid() primary key,
  trainer_name text not null,
  trainee_name text not null,
  trainee_strava_athlete_id bigint unique,
  whatsapp_group_id text not null,
  trainer_phone text,
  trainee_phone text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Readiness surveys (post-Crossfit)
create table if not exists readiness_surveys (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade,
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
  unique(team_id, survey_date)
);

-- Idempotency for WhatsApp webhook
create table if not exists processed_messages (
  hub_message_id text primary key,
  processed_at timestamptz default now()
);

-- Extend chat_history for multi-tenant WhatsApp
alter table chat_history add column if not exists channel text default 'web';
alter table chat_history add column if not exists team_id uuid references teams(id);

-- Enable RLS but allow service role full access
alter table teams enable row level security;
alter table readiness_surveys enable row level security;
alter table processed_messages enable row level security;

create policy "Service role full access on teams"
  on teams for all using (true) with check (true);
create policy "Service role full access on readiness_surveys"
  on readiness_surveys for all using (true) with check (true);
create policy "Service role full access on processed_messages"
  on processed_messages for all using (true) with check (true);
