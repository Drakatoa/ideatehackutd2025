import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all canvases for the user
    const { data, error } = await supabase
      .from('canvases')
      .select('id, name, thumbnail, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching canvases:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ canvases: data || [] })
  } catch (error: any) {
    console.error('Error in list canvases route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

