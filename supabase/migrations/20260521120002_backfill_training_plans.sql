-- ============================================================
-- BACKFILL: training_plans -> planned_sessions
-- ============================================================
-- Run AFTER 20260521120000_planned_sessions_v2.sql and
-- 20260521120001_seed_exercises.sql.
--
-- Defensive: if `training_plans` does not exist (some envs may
-- only have it created out of band via chat-engine), the
-- backfill is skipped silently.
--
-- Maps existing Spanish session_type values to the English
-- enum used by `planned_sessions.session_type`.
-- ============================================================

do $$
declare
  v_trainer_id     uuid;
  v_trainee_id     uuid;
  v_long_run_id    uuid;
  v_trote_suave_id uuid;
  v_tempo_id       uuid;
  v_intervals_id   uuid;
  v_fartlek_id     uuid;
  r                record;
  v_session_id     uuid;
  v_block_id       uuid;
  v_exercise_id    uuid;
  v_distance_m     int;
  v_session_type   text;
  v_migrated       int := 0;
begin
  if to_regclass('public.training_plans') is null then
    raise notice 'Skipping backfill: training_plans table does not exist.';
    return;
  end if;

  -- Resolve current users (single trainer/trainee setup)
  select id into v_trainer_id from matitrainer_users where role = 'trainer' order by created_at limit 1;
  select id into v_trainee_id from matitrainer_users where role = 'trainee' order by created_at limit 1;

  if v_trainer_id is null or v_trainee_id is null then
    raise exception 'No trainer or trainee found. Verify matitrainer_users.';
  end if;

  -- Resolve exercise ids
  select id into v_long_run_id    from exercises where name = 'Long run' limit 1;
  select id into v_trote_suave_id from exercises where name = 'Trote suave' limit 1;
  select id into v_tempo_id       from exercises where name = 'Tempo run' limit 1;
  select id into v_intervals_id   from exercises where name = 'Repetición de pista' limit 1;
  select id into v_fartlek_id     from exercises where name = 'Fartlek' limit 1;

  for r in execute 'select date, planned_activity, distance_km, session_type from training_plans order by date' loop
    -- Map Spanish/legacy session_type -> English enum
    v_session_type := case
      when r.session_type in ('Largo', 'Largo+', 'long_run', 'long')          then 'long_run'
      when r.session_type in ('Fácil', 'easy', 'easy_run')                    then 'easy_run'
      when r.session_type in ('Recuperación', 'recovery')                     then 'recovery'
      when r.session_type in ('Medio', 'tempo')                               then 'tempo'
      when r.session_type in ('Intervalos', 'intervals', 'pista')             then 'intervals'
      when r.session_type in ('Trail', 'trail')                               then 'trail'
      when r.session_type in ('Descanso', 'rest')                             then 'rest'
      when r.session_type in ('Fartlek', 'fartlek')                           then 'fartlek'
      when r.session_type in ('Fuerza', 'strength')                           then 'strength'
      when r.session_type in ('CrossFit', 'crossfit')                         then 'crossfit'
      when r.session_type in ('Movilidad', 'mobility')                        then 'mobility'
      when r.session_type in ('Cross-training', 'cross_training')             then 'cross_training'
      else 'other'
    end;

    -- Map session_type -> exercise
    v_exercise_id := case v_session_type
      when 'long_run'   then v_long_run_id
      when 'easy_run'   then v_trote_suave_id
      when 'recovery'   then v_trote_suave_id
      when 'tempo'      then v_tempo_id
      when 'intervals'  then v_intervals_id
      when 'fartlek'    then v_fartlek_id
      else v_trote_suave_id
    end;

    v_distance_m := case
      when r.distance_km is not null then (r.distance_km * 1000)::int
      else null
    end;

    -- Create the session
    insert into planned_sessions (trainer_id, trainee_id, date, name, session_type, notes)
    values (
      v_trainer_id,
      v_trainee_id,
      r.date,
      coalesce(r.planned_activity, 'Sesión migrada'),
      v_session_type,
      'Migrated from training_plans on ' || now()::date::text
    )
    returning id into v_session_id;

    v_migrated := v_migrated + 1;

    -- For rest days, do not create a block/item
    if v_session_type = 'rest' then
      continue;
    end if;

    -- Create the single block + item
    insert into workout_blocks (session_id, order_index, block_type, rounds)
    values (v_session_id, 0, 'single', 1)
    returning id into v_block_id;

    insert into block_items (block_id, exercise_id, order_index, sets, distance_m, notes)
    values (
      v_block_id,
      v_exercise_id,
      0,
      1,
      v_distance_m,
      r.planned_activity
    );
  end loop;

  raise notice 'Backfill complete. % sessions migrated.', v_migrated;
end $$;
