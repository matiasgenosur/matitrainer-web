-- MatiTrainer Supabase Schema
-- Run this in the Supabase SQL Editor

-- Activities table (synced from Strava via Python)
create table if not exists activities (
  id bigint primary key,
  name text not null,
  type text not null,
  date date not null,
  distance_km decimal(6,2) default 0,
  moving_time_min decimal(7,1) default 0,
  elevation_m decimal(7,1) default 0,
  calories decimal(8,1) default 0,
  avg_hr decimal(5,1),
  max_hr decimal(5,1),
  pace_min_km decimal(5,2),
  z1_min decimal(6,1) default 0,
  z2_min decimal(6,1) default 0,
  z3_min decimal(6,1) default 0,
  z4_min decimal(6,1) default 0,
  z5_min decimal(6,1) default 0,
  fatigue_score decimal(6,1),
  suffer_score decimal(6,1),
  strava_link text,
  session_type text,
  fc_pct decimal(5,1),
  weekly_km decimal(6,1),
  fatigue_7d decimal(7,1),
  rpe integer check (rpe >= 1 and rpe <= 10),
  trainer_notes text,
  planned_activity text,
  comparison_vs_plan text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Trainer notes (separate table for history)
create table if not exists trainer_notes (
  id uuid default gen_random_uuid() primary key,
  activity_id bigint references activities(id) on delete cascade,
  note text,
  rpe_target integer check (rpe_target >= 1 and rpe_target <= 10),
  created_at timestamp with time zone default now()
);

-- Race goals
create table if not exists race_goals (
  id uuid default gen_random_uuid() primary key,
  race_name text not null,
  race_date date not null,
  distance_km decimal(6,2) not null,
  target_time_min decimal(7,1),
  notes text,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (public read for now)
alter table activities enable row level security;
alter table trainer_notes enable row level security;
alter table race_goals enable row level security;

create policy "Public read activities" on activities for select using (true);
create policy "Public insert activities" on activities for insert with check (true);
create policy "Public update activities" on activities for update using (true);

create policy "Public read trainer_notes" on trainer_notes for select using (true);
create policy "Public insert trainer_notes" on trainer_notes for insert with check (true);

create policy "Public read race_goals" on race_goals for select using (true);
create policy "Public insert race_goals" on race_goals for insert with check (true);

-- Indexes
create index if not exists activities_date_idx on activities(date desc);
create index if not exists activities_type_idx on activities(type);
