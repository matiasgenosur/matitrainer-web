import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

// Single-trainer mode for now. The brief defers proper auth to a later
// refactor; we just gate mutations behind a shared key (legacy `?key=`).

const TRAINER_KEY = process.env.TRAINER_KEY ?? 'diego2026'

let cachedTrainerId: string | null = null

export async function getCurrentTrainerId(): Promise<string | null> {
  if (cachedTrainerId) return cachedTrainerId

  const { data, error } = await supabaseAdmin
    .from('matitrainer_users')
    .select('id')
    .eq('role', 'trainer')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  cachedTrainerId = data.id
  return data.id
}

export function getKeyFromRequest(req: NextRequest): string | null {
  const url = new URL(req.url)
  return url.searchParams.get('key')
}

export function isValidKey(key: string | null): boolean {
  return key === TRAINER_KEY
}

/**
 * Guard for mutation endpoints. Returns either a NextResponse (401) to
 * short-circuit the handler, or the trainer_id to use.
 */
export async function requireTrainer(
  req: NextRequest
): Promise<{ trainerId: string } | NextResponse> {
  const key = getKeyFromRequest(req)
  if (!isValidKey(key)) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Invalid or missing key' },
      { status: 401 }
    )
  }

  const trainerId = await getCurrentTrainerId()
  if (!trainerId) {
    return NextResponse.json(
      { error: 'no_trainer', message: 'No trainer user configured' },
      { status: 500 }
    )
  }

  return { trainerId }
}
