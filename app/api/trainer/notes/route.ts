import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { activityId, note, rpe } = body

    if (!activityId) {
      return NextResponse.json({ error: 'activityId is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl === 'placeholder') {
      // Mock success
      return NextResponse.json({ success: true, message: 'Note saved (mock mode)' })
    }

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase
      .from('activities')
      .update({ trainer_notes: note, rpe })
      .eq('id', activityId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
