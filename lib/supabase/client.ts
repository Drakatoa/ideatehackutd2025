import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // createBrowserClient automatically handles cookies in the browser
  // It uses localStorage and cookies as needed
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

