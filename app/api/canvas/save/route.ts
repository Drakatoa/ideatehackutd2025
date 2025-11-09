import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      id, 
      name, 
      elements, 
      thumbnail, 
      description,
      analysis,
      diagram,
      diagramIterations,
      pitch,
      competitive,
      roadmap,
    } = body

    if (!name || !elements) {
      return NextResponse.json({ error: 'Name and elements are required' }, { status: 400 })
    }

    // Prepare canvas data
    const canvasData: any = {
      elements: elements,
      thumbnail: thumbnail || null,
      description: description || null,
      analysis: analysis || null,
      diagram: diagram || null,
      diagram_iterations: diagramIterations || null,
      pitch: pitch || null,
      competitive: competitive || null,
      roadmap: roadmap || null,
    }

    let data, error
    if (id) {
      // Update existing canvas by ID
      const result = await supabase
        .from('canvases')
        .update(canvasData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Check if canvas with same name exists for this user
      const { data: existing } = await supabase
        .from('canvases')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', name)
        .single()

      if (existing) {
        // Update existing canvas with same name
        const result = await supabase
          .from('canvases')
          .update(canvasData)
          .eq('id', existing.id)
          .select()
          .single()
        data = result.data
        error = result.error
      } else {
        // Insert new canvas
        const result = await supabase
          .from('canvases')
          .insert({
            user_id: user.id,
            name: name,
            ...canvasData,
          })
          .select()
          .single()
        data = result.data
        error = result.error
      }
    }

    if (error) {
      console.error('Error saving canvas:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, canvas: data })
  } catch (error: any) {
    console.error('Error in save canvas route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

