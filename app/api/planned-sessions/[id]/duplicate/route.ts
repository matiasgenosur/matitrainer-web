import { NextRequest, NextResponse } from 'next/server'
import { duplicatePlannedSession } from '@/lib/planned-sessions'
import { duplicateSessionBody, badRequest } from '@/lib/validation'
import { requireTrainer } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireTrainer(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Body must be valid JSON')
  }
  const parsed = duplicateSessionBody.safeParse(body)
  if (!parsed.success) return badRequest('Invalid duplicate body', parsed.error.format())

  try {
    const copy = await duplicatePlannedSession(
      id,
      parsed.data.date,
      parsed.data.trainee_id
    )
    return NextResponse.json(copy, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
