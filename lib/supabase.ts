import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Doctor = {
  id: string
  full_name: string
  specialty: string | null
  consultation_fee: number
  rating: number
  is_online: boolean
}
