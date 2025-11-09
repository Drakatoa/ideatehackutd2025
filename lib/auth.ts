'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const supabase = createClient()
  const router = useRouter()

  const signInWithGoogle = async () => {
    // Use environment variable for production, fallback to current origin for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/api/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      console.error('Error signing in:', error)
      throw error
    }
    // The redirect will happen automatically
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    // Clear any local storage
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  return {
    signInWithGoogle,
    signOut,
    supabase,
  }
}

