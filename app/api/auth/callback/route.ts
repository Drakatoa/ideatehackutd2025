import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextUrl = requestUrl.searchParams.get('next') ?? '/whiteboard'

  // Use environment variable for production, fallback to request origin for development
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${siteUrl}/?error=auth_failed`)
    }

    // Get the session to verify it was created
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      // Successfully authenticated - redirect with cookies preserved
      return NextResponse.redirect(`${siteUrl}${nextUrl}`)
    }
  }

  // Return the user to an error page
  return NextResponse.redirect(`${siteUrl}/?error=auth_failed`)
}

