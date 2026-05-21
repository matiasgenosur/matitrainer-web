import { NextRequest, NextResponse } from 'next/server'
import { updateVariation, deleteVariation } from '@/lib/exercises'
import { variationPatchSchema, badRequest } from '@/lib/validation'
import { requireTrainer } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

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
  const parsed = variationPatchSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid patch', parsed.error.format())

  try {
    const updated = await updateVariation(id, parsed.data)
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
    await deleteVariation(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
