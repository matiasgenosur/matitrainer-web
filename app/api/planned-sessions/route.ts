import { NextRequest, NextResponse } from 'next/server'
import {
  listPlannedSessions,
  listPlannedSessionsHydrated,
  createPlannedSession,
} from '@/lib/planned-sessions'
import { plannedSessionInputSchema, badRequest } from '@/lib/validation'
import { requireTrainer } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const opts = {
    traineeId: url.searchParams.get('trainee_id') ?? undefined,
    trainerId: url.searchParams.get('trainer_id') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  }
  const hydrate = url.searchParams.get('hydrate') === 'true'

  try {
    const data = hydrate
      ? await listPlannedSessionsHydrated(opts)
      : await listPlannedSessions(opts)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireTrainer(req)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Body must be valid JSON')
  }
  const parsed = plannedSessionInputSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid session input', parsed.error.format())

  try {
    const created = await createPlannedSession({
      ...parsed.data,
      trainer_id: auth.trainerId,
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
