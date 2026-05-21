-- ============================================================
-- MatiTrainer — Seed: initial exercise library
-- ============================================================
-- Populates the library with basic running and strength
-- exercises so the system is usable from day one.
-- Run AFTER 20260521120000_planned_sessions_v2.sql.
-- ============================================================

-- ------------------------------------------------------------
-- RUNNING
-- ------------------------------------------------------------

insert into exercises (name, category, default_unit, description) values
  ('Long run',            'running', 'distance_m', 'Continuous long run at conversational pace, zone 2'),
  ('Trote suave',         'running', 'distance_m', 'Warm-up or cool-down, zone 1-2'),
  ('Tempo run',           'running', 'distance_m', 'Continuous threshold run, zone 3-4'),
  ('Repetición de pista', 'running', 'distance_m', 'Track repetition at target pace with recovery'),
  ('Fartlek',             'running', 'time_sec',   'Free pace changes during the run'),
  ('Cuesta',              'running', 'distance_m', 'High intensity uphill'),
  ('Progresivo',          'running', 'distance_m', 'Run with progressive pace increase')
on conflict do nothing;

-- ------------------------------------------------------------
-- STRENGTH — Upper body
-- ------------------------------------------------------------

insert into exercises (name, category, default_unit, description) values
  ('Flexión de brazos',  'strength', 'reps',        'Push-up. High plank, controlled descent, push'),
  ('Remo',               'strength', 'reps',        'Row to the torso with neutral spine'),
  ('Press de hombros',   'strength', 'weight_reps', 'Overhead vertical press'),
  ('Curl de bíceps',     'strength', 'weight_reps', 'Elbow flexion with weight'),
  ('Fondos',             'strength', 'reps',        'Dips. Descent and push on parallels or chair')
on conflict do nothing;

-- ------------------------------------------------------------
-- STRENGTH — Lower body
-- ------------------------------------------------------------

insert into exercises (name, category, default_unit, description) values
  ('Sentadilla',                  'strength', 'weight_reps', 'Squat. Parallel depth, push through heels'),
  ('Peso muerto',                 'strength', 'weight_reps', 'Deadlift. Hip hinge, neutral spine'),
  ('Zancada',                     'strength', 'reps',        'Lunge. Step forward, back knee to floor'),
  ('Sentadilla búlgara',          'strength', 'reps',        'Rear foot elevated, weight on front leg'),
  ('Puente de glúteos',           'strength', 'reps',        'Hip thrust. Push glutes up'),
  ('Elevación de pantorrillas',   'strength', 'reps',        'Calf raise. Up onto toes')
on conflict do nothing;

-- ------------------------------------------------------------
-- CORE
-- ------------------------------------------------------------

insert into exercises (name, category, default_unit, description) values
  ('Plancha',           'strength', 'time_sec', 'Plank. Hold shoulder-hip-heel alignment'),
  ('Plancha lateral',   'strength', 'time_sec', 'Side plank. One hand support, body in line'),
  ('Crunch',            'strength', 'reps',     'Short crunch, shoulders off the floor'),
  ('Mountain climbers', 'cardio',   'time_sec', 'High plank alternating knees to chest'),
  ('Dead bug',          'strength', 'reps',     'Supine, alternating contralateral arm/leg'),
  ('Russian twist',     'strength', 'reps',     'Seated, torso rotation with weight')
on conflict do nothing;

-- ------------------------------------------------------------
-- CARDIO / METCON
-- ------------------------------------------------------------

insert into exercises (name, category, default_unit, description) values
  ('Burpees',                  'cardio', 'reps',       'Plank + push-up + vertical jump'),
  ('Jumping jacks',            'cardio', 'time_sec',   'Jumping spreading legs and arms'),
  ('Saltos al cajón',          'cardio', 'reps',       'Box jumps onto platform'),
  ('Bike ride',                'cardio', 'distance_m', 'Outdoor cycling session'),
  ('Spinning / Bici estática', 'cardio', 'time_sec',   'Indoor cycling session'),
  ('Remo en máquina',          'cardio', 'distance_m', 'Concept2 row. Drive with legs-torso-arms')
on conflict do nothing;

-- ------------------------------------------------------------
-- MOBILITY / RECOVERY
-- ------------------------------------------------------------

insert into exercises (name, category, default_unit, description) values
  ('Movilidad de hombros',           'mobility', 'time_sec', 'Circles and rotations'),
  ('Movilidad de cadera',            'mobility', 'time_sec', 'World greatest stretch, 90/90, etc.'),
  ('Estiramiento de isquiotibiales', 'mobility', 'time_sec', 'Hold the stretch without bouncing'),
  ('Foam roller',                    'mobility', 'time_sec', 'Myofascial release'),
  ('Caminar',                        'mobility', 'time_sec', 'Active recovery walk')
on conflict do nothing;

-- ============================================================
-- VARIATIONS of key exercises
-- ============================================================

-- Push-up
insert into exercise_variations (exercise_id, name, description)
select id, 'Con apoyo en rodillas', 'Assisted version, knees on the floor' from exercises where name = 'Flexión de brazos'
union all
select id, 'Con apoyo en pies',     'Standard version'                        from exercises where name = 'Flexión de brazos'
union all
select id, 'Diamante',              'Hands forming a diamond, triceps focus'  from exercises where name = 'Flexión de brazos'
union all
select id, 'Declinada',             'Feet elevated on bench/box'              from exercises where name = 'Flexión de brazos'
union all
select id, 'Inclinada',             'Hands elevated (bench or wall), easier'  from exercises where name = 'Flexión de brazos'
on conflict do nothing;

-- Deadlift
insert into exercise_variations (exercise_id, name, description)
select id, 'Con kettlebell',  'Single kettlebell between the legs'      from exercises where name = 'Peso muerto'
union all
select id, 'Con barra',       'Olympic barbell'                          from exercises where name = 'Peso muerto'
union all
select id, 'Rumano',          'RDL, hamstring and glute emphasis'        from exercises where name = 'Peso muerto'
union all
select id, 'A una pierna',    'Single leg RDL, unilateral work'          from exercises where name = 'Peso muerto'
union all
select id, 'Sumo',            'Wider stance, narrow grip'                from exercises where name = 'Peso muerto'
on conflict do nothing;

-- Squat
insert into exercise_variations (exercise_id, name, description)
select id, 'Aérea',             'Bodyweight'                                from exercises where name = 'Sentadilla'
union all
select id, 'Con barra trasera', 'Back squat, bar across upper traps'        from exercises where name = 'Sentadilla'
union all
select id, 'Frontal',           'Front squat, bar across clavicles'         from exercises where name = 'Sentadilla'
union all
select id, 'Goblet',            'With kettlebell or dumbbell at the chest'  from exercises where name = 'Sentadilla'
union all
select id, 'Pistola',           'Single leg, controlled'                    from exercises where name = 'Sentadilla'
on conflict do nothing;

-- Row
insert into exercise_variations (exercise_id, name, description)
select id, 'Con kettlebell', 'One hand at a time, bench support' from exercises where name = 'Remo'
union all
select id, 'Con barra',      'Bent over row, both hands'         from exercises where name = 'Remo'
union all
select id, 'Invertido',      'Inverted row, body under bar'      from exercises where name = 'Remo'
union all
select id, 'Con banda',      'Elastic band anchored'             from exercises where name = 'Remo'
on conflict do nothing;

-- Lunge
insert into exercise_variations (exercise_id, name, description)
select id, 'Adelante',  'Forward step'                          from exercises where name = 'Zancada'
union all
select id, 'Atrás',     'Reverse step, easier on the knee'      from exercises where name = 'Zancada'
union all
select id, 'Caminando', 'Walking lunges, chained'               from exercises where name = 'Zancada'
union all
select id, 'Lateral',   'Side step'                              from exercises where name = 'Zancada'
on conflict do nothing;

-- Plank
insert into exercise_variations (exercise_id, name, description)
select id, 'Sobre antebrazos',          'Standard forearm plank'           from exercises where name = 'Plancha'
union all
select id, 'Alta',                       'On extended hands'                from exercises where name = 'Plancha'
union all
select id, 'Con elevación de pierna',   'Alternating leg lifts'            from exercises where name = 'Plancha'
on conflict do nothing;
