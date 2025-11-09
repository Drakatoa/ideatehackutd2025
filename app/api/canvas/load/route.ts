import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const canvasId = searchParams.get('id')

    if (!canvasId) {
      return NextResponse.json({ error: 'Canvas ID is required' }, { status: 400 })
    }

    // Get canvas by ID
    const { data, error } = await supabase
      .from('canvases')
      .select('*')
      .eq('id', canvasId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error loading canvas:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
    }

    return NextResponse.json({ canvas: data })
  } catch (error: any) {
    console.error('Error in load canvas route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

