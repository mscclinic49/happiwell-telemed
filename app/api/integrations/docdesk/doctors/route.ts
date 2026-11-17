import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { isFromDocdesk, unauthorized } from '@/lib/integration'

/** DocDesk: รายชื่อแพทย์ที่รับปรึกษาออนไลน์ พร้อมวันออกตรวจ */
export async function GET(req: Request) {
  if (!isFromDocdesk(req)) return unauthorized()
  const service = createSupabaseServiceClient()
  const [{ data: doctors }, { data: schedules }] = await Promise.all([
    service.from('hw_doctors').select('id, full_name, specialty, avatar_url').eq('is_active', true).order('full_name'),
    service.from('hw_doctor_schedules').select('doctor_id, day_of_week, start_time, end_time, is_available'),
  ])
  return Response.json({
    doctors: (doctors ?? []).map(d => ({
      ...d,
      schedule: (schedules ?? []).filter(s => s.doctor_id === d.id && s.is_available !== false)
        .map(s => ({ day_of_week: s.day_of_week, start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) })),
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
