import { NextRequest, NextResponse } from 'next/server'
import { listTemplates, createTemplate } from '@/lib/templates'
import { templateInputSchema, badRequest } from '@/lib/validation'
import { requireTrainer } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const createdBy = url.searchParams.get('created_by') ?? undefined
  const search = url.searchParams.get('search') ?? undefined

  try {
    const data = await listTemplates({ createdBy, search })
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
  const parsed = templateInputSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid template input', parsed.error.format())

  try {
    const created = await createTemplate(parsed.data)
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
