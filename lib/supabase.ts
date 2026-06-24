import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type DoctorSchedule = {
  doctor_id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

export type Doctor = {
  id: string
  full_name: string
  specialty: string | null
  license_no: string | null
  bio: string | null
  avatar_url: string | null
  consultation_fee: number
  rating: number | null
  is_online: boolean
  hw_doctor_schedules?: DoctorSchedule[]
}
