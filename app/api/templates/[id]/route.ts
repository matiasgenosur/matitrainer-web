import { NextRequest, NextResponse } from 'next/server'
import { getTemplate, updateTemplate, deleteTemplate } from '@/lib/templates'
import { templateInputSchema, badRequest } from '@/lib/validation'
import { requireTrainer } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  try {
    const data = await getTemplate(id)
    if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireTrainer(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest('Body must be valid JSON')
  }
  const parsed = templateInputSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid template input', parsed.error.format())

  try {
    const updated = await updateTemplate(id, parsed.data)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireTrainer(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  try {
    await deleteTemplate(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
