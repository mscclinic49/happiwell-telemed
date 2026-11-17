import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { isBookableSlot, SLOT_MINUTES, type ScheduleRow } from '@/lib/slots'

const MAX_UPCOMING = 3

export async function POST(req: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนนัดหมาย' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const doctorId = typeof body.doctorId === 'string' ? body.doctorId : ''
  const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt : ''
  const symptoms = typeof body.symptoms === 'string' ? body.symptoms.trim().slice(0, 500) : ''
  if (!doctorId || !scheduledAt) return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })

  const service = createSupabaseServiceClient()

  const { data: me } = await service.from('hw_users').select('role, identity_verified').eq('id', user.id).single()
  if (!me || me.role !== 'patient') return NextResponse.json({ error: 'บัญชีนี้นัดหมายในฐานะคนไข้ไม่ได้' }, { status: 403 })
  if (!me.identity_verified) {
    return NextResponse.json({ error: 'กรุณายืนยันตัวตนด้วยบัตรประชาชนก่อนนัดหมาย' }, { status: 403 })
  }

  const [{ data: doctor }, { data: schedules }] = await Promise.all([
    service.from('hw_doctors').select('id, is_active').eq('id', doctorId).maybeSingle(),
    service.from('hw_doctor_schedules').select('day_of_week, start_time, end_time, is_available').eq('doctor_id', doctorId),
  ])
  if (!doctor?.is_active) return NextResponse.json({ error: 'ไม่พบแพทย์ท่านนี้' }, { status: 404 })
  if (!isBookableSlot(scheduledAt, (schedules ?? []) as ScheduleRow[])) {
    return NextResponse.json({ error: 'ช่วงเวลานี้ไม่อยู่ในตารางออกตรวจ หรือใกล้เวลาเกินไป กรุณาเลือกเวลาใหม่' }, { status: 409 })
  }

  const at = new Date(scheduledAt)
  const nowIso = new Date().toISOString()
  const { data: mine } = await service
    .from('hw_appointments')
    .select('id, scheduled_at, duration_minutes')
    .eq('user_id', user.id)
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', nowIso)
  const upcoming = mine ?? []
  if (upcoming.length >= MAX_UPCOMING) {
    return NextResponse.json({ error: `มีนัดที่ยังไม่ถึงเวลา ${MAX_UPCOMING} นัดแล้ว ยกเลิกนัดเดิมก่อนจึงจะจองเพิ่มได้` }, { status: 409 })
  }
  const clash = upcoming.some(a => {
    const start = new Date(a.scheduled_at).getTime()
    const end = start + (a.duration_minutes ?? SLOT_MINUTES) * 60_000
    return at.getTime() < end && at.getTime() + SLOT_MINUTES * 60_000 > start
  })
  if (clash) return NextResponse.json({ error: 'คุณมีนัดอื่นในช่วงเวลานี้อยู่แล้ว' }, { status: 409 })

  const { data: appt, error } = await service
    .from('hw_appointments')
    .insert({
      user_id: user.id,
      doctor_id: doctorId,
      scheduled_at: at.toISOString(),
      duration_minutes: SLOT_MINUTES,
      status: 'confirmed',
      consultation_type: 'video',
      symptoms: symptoms || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'ช่วงเวลานี้เพิ่งมีคนจองไป กรุณาเลือกเวลาอื่น' }, { status: 409 })
    }
    console.error('book appointment error:', error)
    return NextResponse.json({ error: 'จองไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 })
  }

  return NextResponse.json({ id: appt.id })
}
