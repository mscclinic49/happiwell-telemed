import type { SupabaseClient } from '@supabase/supabase-js'

/** ข้อมูลนัดที่ส่งให้ DocDesk — รูปแบบเดียวกับ hw_docdesk_emit ในฐานข้อมูล */
export async function appointmentPayload(service: SupabaseClient, appointmentId: string) {
  const { data: a } = await service
    .from('hw_appointments')
    .select('id, status, scheduled_at, duration_minutes, source, docdesk_appointment_id, docdesk_conversation_id, cancelled_reason, hw_doctors(full_name), hw_users(id, title, first_name, last_name, full_name, phone, hn)')
    .eq('id', appointmentId)
    .maybeSingle()
  if (!a) return null
  const { data: joinUrl } = await service.rpc('hw_join_url', { p_appt: appointmentId })
  const u = a.hw_users as unknown as { id: string; title: string | null; first_name: string | null; last_name: string | null; full_name: string | null; phone: string | null; hn: string | null } | null
  const d = a.hw_doctors as unknown as { full_name: string } | null
  const name = `${u?.title ?? ''}${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || u?.full_name || null
  return {
    telemed_id: a.id,
    status: a.status,
    scheduled_at: a.scheduled_at,
    duration_minutes: a.duration_minutes ?? 15,
    source: a.source,
    docdesk_appointment_id: a.docdesk_appointment_id,
    docdesk_conversation_id: a.docdesk_conversation_id,
    doctor_name: d?.full_name ?? null,
    patient_id: u?.id ?? null,
    patient_name: name,
    phone: u?.phone ?? null,
    hn: u?.hn ?? null,
    join_url: joinUrl as string | null,
    cancelled_reason: a.cancelled_reason,
  }
}
