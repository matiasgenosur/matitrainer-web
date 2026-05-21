import { NextRequest, NextResponse } from 'next/server'
import { listExercises, createExercise } from '@/lib/exercises'
import { exerciseInputSchema, badRequest } from '@/lib/validation'
import { requireTrainer } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category') ?? undefined
  const search = url.searchParams.get('search') ?? undefined
  const limitStr = url.searchParams.get('limit')
  const limit = limitStr ? parseInt(limitStr, 10) : undefined

  try {
    const data = await listExercises({ category, search, limit })
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
  const parsed = exerciseInputSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid exercise input', parsed.error.format())

  try {
    const created = await createExercise(parsed.data, auth.trainerId)
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'server_error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
