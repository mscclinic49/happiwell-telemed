import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Doctor = {
  id: string
  full_name: string
  specialty: string | null
  bio: string | null
  avatar_url: string | null
  consultation_fee: number
  rating: number | null
  is_online: boolean
}
