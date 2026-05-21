import { NextRequest, NextResponse } from 'next/server'
import { instantiateTemplate } from '@/lib/templates'
import { instantiateTemplateBody, badRequest } from '@/lib/validation'
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
  const parsed = instantiateTemplateBody.safeParse(body)
  if (!parsed.success) return badRequest('Invalid body', parsed.error.format())

  try {
    const created = await instantiateTemplate(id, {
      trainerId: auth.trainerId,
      traineeId: parsed.data.trainee_id,
      date: parsed.data.date,
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
