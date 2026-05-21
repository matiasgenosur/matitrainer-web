import { NextRequest, NextResponse } from 'next/server'
import { listReadinessAlerts } from '@/lib/readiness-alerts'
import type { ReadinessAlert } from '@/lib/types'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const opts = {
    trainerId: url.searchParams.get('trainer_id') ?? undefined,
    traineeId: url.searchParams.get('trainee_id') ?? undefined,
    status: (url.searchParams.get('status') ?? undefined) as
      | ReadinessAlert['status']
      | undefined,
  }
  try {
    const list = await listReadinessAlerts(opts)
    return NextResponse.json(list)
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
