import { NextRequest, NextResponse } from 'next/server'
import { applyAlertChanges } from '@/lib/readiness-alerts'
import { requireTrainer } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireTrainer(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  let body: { notes?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  try {
    const alert = await applyAlertChanges(id, auth.trainerId, body.notes)
    if (!alert) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json(alert)
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
