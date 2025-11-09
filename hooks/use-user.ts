'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUser() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session - check session first for better persistence
    const getInitialSession = async () => {
      try {
        // First check for existing session
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          setLoading(false)
          return
        }
        
        // If no session, try to get user (this will refresh if token exists)
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error getting session:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Refresh session on SIGNED_IN event
      if (event === 'SIGNED_IN' && session) {
        // Session is already set, just update state
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { user, loading }
}

