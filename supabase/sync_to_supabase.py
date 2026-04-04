"""
Sync all activities from Google Sheets → Supabase.
Run once to backfill, then add to daily cron.
pip install supabase
"""
import os, re
from datetime import date
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', 'MatiTrainer', '.env'))

# Load Supabase URL/key from web app .env.local
import pathlib
env_local = pathlib.Path(__file__).parent.parent / '.env.local'
for line in env_local.read_text().splitlines():
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip())

from supabase import create_client
import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent.parent / 'MatiTrainer'))
from sheets_client import read_sheet

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

SHEET = 'Planificación Mensual'
SPANISH_MONTHS = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
}

def parse_date(s):
    m = re.search(r'(\d+)\s+de\s+(\w+)', s.lower())
    if not m: return None
    month = SPANISH_MONTHS.get(m.group(2))
    if not month: return None
    try: return date(2026, month, int(m.group(1))).isoformat()
    except: return None

def safe_float(v, default=0):
    try: return float(v) if v not in ('', None) else default
    except: return default

def safe_int(v):
    try: return int(float(v)) if v not in ('', None) else None
    except: return None

def main():
    if not SUPABASE_URL or SUPABASE_URL == 'placeholder':
        print("Add NEXT_PUBLIC_SUPABASE_URL to .env.local first")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Loading sheet...")
    rows = read_sheet(f'{SHEET}!A1:W300')
    headers = rows[0]

    records = []
    fake_id = 900000000
    for row in rows[1:]:
        if not row or not row[0].strip(): continue
        act_date = parse_date(row[0])
        if not act_date: continue
        padded = row + [''] * (27 - len(row))

        # Only rows with a Nombre (col D = index 3)
        nombre = padded[3].strip()
        if not nombre: continue

        fake_id += 1
        records.append({
            'id': fake_id,
            'name': nombre,
            'type': padded[2].strip() or 'Run',
            'date': act_date,
            'calories': safe_float(padded[4]),
            'pace_min_km': None,  # compute from ritmo if needed
            'strava_link': padded[6].strip(),
            'distance_km': safe_float(padded[7]),
            'elevation_m': safe_float(padded[8]),
            'moving_time_min': safe_float(padded[9]),
            'z5_min': safe_float(padded[10]),
            'z4_min': safe_float(padded[11]),
            'z3_min': safe_float(padded[12]),
            'z2_min': safe_float(padded[13]),
            'z1_min': safe_float(padded[14]),
            'fatigue_score': safe_float(padded[15]) or None,
            'comparison_vs_plan': padded[16].strip(),
            'rpe': safe_int(padded[17]),
            'session_type': padded[18].strip(),
            'fc_pct': safe_float(padded[19]) or None,
            'weekly_km': safe_float(padded[20]),
            'fatigue_7d': safe_float(padded[21]) or None,
            'trainer_notes': padded[22].strip() or None,
            'planned_activity': padded[1].strip() or None,
        })

    print(f"Upserting {len(records)} activities to Supabase...")
    # Batch upsert
    for i in range(0, len(records), 50):
        batch = records[i:i+50]
        supabase.table('activities').upsert(batch).execute()
        print(f"  {min(i+50, len(records))}/{len(records)}")

    print("Done!")

if __name__ == '__main__':
    main()
