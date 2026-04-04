import { NextResponse } from 'next/server'
import { mockActivities } from '@/lib/mock-data'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl === 'placeholder') {
      return NextResponse.json(mockActivities)
    }

    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      return NextResponse.json(mockActivities)
    }

    return NextResponse.json(data || mockActivities)
  } catch {
    return NextResponse.json(mockActivities)
  }
}
