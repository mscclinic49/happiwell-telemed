import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { isFromDocdesk, unauthorized } from '@/lib/integration'
import { isBookableSlot, SLOT_MINUTES, type ScheduleRow } from '@/lib/slots'
import { findOrCreatePatient } from '@/lib/patients'

const STAFF_LEAD_MINUTES = 5

/**
 * DocDesk: เจ้าหน้าที่ทำนัดปรึกษาออนไลน์จากแชท
 * body: { doctor_id, scheduled_at, patient: { name, phone?, hn? }, symptoms?, docdesk_appointment_id?, docdesk_conversation_id? }
 * คืน: { telemed_id, join_url }
 */
export async function POST(req: Request) {
  if (!isFromDocdesk(req)) return unauthorized()
  const b = await req.json().catch(() => ({}))
  const doctorId = typeof b.doctor_id === 'string' ? b.doctor_id : ''
  const scheduledAt = typeof b.scheduled_at === 'string' ? b.scheduled_at : ''
  const patient = b.patient && typeof b.patient.name === 'string' && b.patient.name.trim() ? b.patient : null
  if (!doctorId || !scheduledAt || !patient) return Response.json({ error: 'ต้องมีแพทย์ เวลา และชื่อคนไข้' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const [{ data: doctor }, { data: schedules }] = await Promise.all([
    service.from('hw_doctors').select('id, is_active').eq('id', doctorId).maybeSingle(),
    service.from('hw_doctor_schedules').select('day_of_week, start_time, end_time, is_available').eq('doctor_id', doctorId),
  ])
  if (!doctor?.is_active) return Response.json({ error: 'ไม่พบแพทย์ท่านนี้' }, { status: 404 })
  if (!isBookableSlot(scheduledAt, (schedules ?? []) as ScheduleRow[], new Date(), STAFF_LEAD_MINUTES)) {
    return Response.json({ error: 'เวลานี้ไม่อยู่ในตารางออกตรวจของแพทย์' }, { status: 409 })
  }

  // DocDesk ส่งซ้ำ (retry) → คืนนัดเดิม
  if (typeof b.docdesk_appointment_id === 'string') {
    const { data: existing } = await service.from('hw_appointments').select('id')
      .eq('docdesk_appointment_id', b.docdesk_appointment_id).neq('status', 'cancelled').maybeSingle()
    if (existing) {
      const { data: joinUrl } = await service.rpc('hw_join_url', { p_appt: existing.id })
      return Response.json({ telemed_id: existing.id, join_url: joinUrl })
    }
  }

  let patientId: string
  try {
    patientId = (await findOrCreatePatient(service, {
      name: String(patient.name).slice(0, 120),
      phone: typeof patient.phone === 'string' ? patient.phone : null,
      hn: typeof patient.hn === 'string' ? patient.hn : null,
    })).id
  } catch (e) {
    console.error('docdesk create patient error:', e)
    return Response.json({ error: 'สร้างข้อมูลคนไข้ไม่สำเร็จ' }, { status: 500 })
  }

  const { data: appt, error } = await service.from('hw_appointments').insert({
    user_id: patientId,
    doctor_id: doctorId,
    scheduled_at: new Date(scheduledAt).toISOString(),
    duration_minutes: SLOT_MINUTES,
    status: 'confirmed',
    consultation_type: 'video',
    symptoms: typeof b.symptoms === 'string' ? b.symptoms.trim().slice(0, 500) || null : null,
    source: 'docdesk',
    docdesk_appointment_id: typeof b.docdesk_appointment_id === 'string' ? b.docdesk_appointment_id : null,
    docdesk_conversation_id: typeof b.docdesk_conversation_id === 'string' ? b.docdesk_conversation_id : null,
  }).select('id').single()

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'เวลานี้มีนัดแล้ว กรุณาเลือกเวลาอื่น' }, { status: 409 })
    console.error('docdesk create appointment error:', error)
    return Response.json({ error: 'ทำนัดไม่สำเร็จ' }, { status: 500 })
  }
  const { data: joinUrl } = await service.rpc('hw_join_url', { p_appt: appt.id })
  return Response.json({ telemed_id: appt.id, join_url: joinUrl })
}
