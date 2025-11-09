import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextUrl = requestUrl.searchParams.get('next') ?? '/whiteboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`)
    }

    // Get the session to verify it was created
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      // Successfully authenticated - redirect with cookies preserved
      return NextResponse.redirect(`${requestUrl.origin}${nextUrl}`)
    }
  }

  // Return the user to an error page
  return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`)
}

