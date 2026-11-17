import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { isFromDocdesk, unauthorized } from '@/lib/integration'
import { addDays, bkkDate, BOOKING_DAYS, bookingDates, daySlots, type ScheduleRow } from '@/lib/slots'

const STAFF_LEAD_MINUTES = 5

/**
 * DocDesk: ช่องเวลาว่างของแพทย์
 * ?doctorId=…            → วันที่จองได้ 14 วัน
 * ?doctorId=…&date=YYYY-MM-DD → ช่องเวลาของวันนั้น
 */
export async function GET(req: Request) {
  if (!isFromDocdesk(req)) return unauthorized()
  const u = new URL(req.url)
  const doctorId = u.searchParams.get('doctorId') ?? ''
  const date = u.searchParams.get('date')
  if (!doctorId) return Response.json({ error: 'doctorId required' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const { data } = await service.from('hw_doctor_schedules').select('day_of_week, start_time, end_time, is_available').eq('doctor_id', doctorId)
  const schedules = (data ?? []) as ScheduleRow[]
  const now = new Date()

  if (!date) {
    return Response.json({ dates: bookingDates(schedules, now) }, { headers: { 'Cache-Control': 'no-store' } })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < bkkDate(now) || date > addDays(bkkDate(now), BOOKING_DAYS - 1)) {
    return Response.json({ error: 'วันที่ไม่ถูกต้อง' }, { status: 400 })
  }
  const { data: booked } = await service.rpc('hw_booked_slots', {
    p_doctor: doctorId,
    p_from: new Date(`${date}T00:00:00+07:00`).toISOString(),
    p_to: new Date(`${addDays(date, 1)}T00:00:00+07:00`).toISOString(),
  })
  const bookedMs = new Set(((booked ?? []) as { scheduled_at: string }[]).map(b => new Date(b.scheduled_at).getTime()))
  const slots = daySlots(date, schedules, bookedMs, now, STAFF_LEAD_MINUTES)
    .map(s => ({ time: s.time, iso: s.iso, available: !s.booked && !s.past }))
  return Response.json({ date, slots }, { headers: { 'Cache-Control': 'no-store' } })
}
