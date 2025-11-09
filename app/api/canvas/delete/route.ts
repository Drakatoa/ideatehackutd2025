import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
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

    // Delete canvas
    const { error } = await supabase
      .from('canvases')
      .delete()
      .eq('id', canvasId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting canvas:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in delete canvas route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

