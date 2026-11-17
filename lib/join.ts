import type { SupabaseClient } from '@supabase/supabase-js'

export type JoinInfo = {
  appointmentId: string
  userId: string
  status: string
  scheduledAt: string
  doctor: { full_name: string; specialty: string | null; avatar_url: string | null } | null
  patientName: string
  needsDob: boolean
  dob: string | null
  email: string | null
}

/** ตรวจลิงก์เข้าห้อง: คืน null ถ้าไม่พบหรือหมดอายุ */
export async function loadJoin(service: SupabaseClient, token: string): Promise<JoinInfo | null> {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null
  const { data: t } = await service.from('hw_join_tokens').select('appointment_id, expires_at').eq('token', token).maybeSingle()
  if (!t || new Date(t.expires_at).getTime() < Date.now()) return null
  const { data: a } = await service.from('hw_appointments')
    .select('id, user_id, status, scheduled_at, hw_doctors(full_name, specialty, avatar_url), hw_users(title, first_name, last_name, full_name, date_of_birth, email)')
    .eq('id', t.appointment_id).maybeSingle()
  if (!a) return null
  const u = a.hw_users as unknown as { title: string | null; first_name: string | null; last_name: string | null; full_name: string | null; date_of_birth: string | null; email: string | null } | null
  const name = `${u?.title ?? ''}${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || u?.full_name || 'คนไข้'
  return {
    appointmentId: a.id,
    userId: a.user_id,
    status: a.status,
    scheduledAt: a.scheduled_at,
    doctor: a.hw_doctors as unknown as JoinInfo['doctor'],
    patientName: name,
    // บัญชีจริงที่มีวันเกิด: ถามวันเกิดก่อน กันคนที่ได้ลิงก์ต่อมาเข้าบัญชีเต็มของคนไข้
    needsDob: !!u?.date_of_birth,
    dob: u?.date_of_birth ?? null,
    email: u?.email ?? null,
  }
}

/** แสดงชื่อแบบปิดบางส่วน เช่น "นายสมชาย ใ***" */
export function maskName(name: string) {
  const [first, ...rest] = name.split(' ')
  const last = rest.join(' ')
  return last ? `${first} ${last.slice(0, 1)}***` : first
}
