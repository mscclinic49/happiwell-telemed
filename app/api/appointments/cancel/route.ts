import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { CANCEL_LEAD_MINUTES } from '@/lib/slots'

// คนไข้ยกเลิกนัดของตัวเอง (ได้ถึง 1 ชม. ก่อนนัด — ใกล้กว่านั้นให้ติดต่อคลินิก)
export async function POST(req: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : ''
  if (!appointmentId) return NextResponse.json({ error: 'appointmentId required' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const { data: appt } = await service
    .from('hw_appointments')
    .select('id, user_id, status, scheduled_at')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt || appt.user_id !== user.id) return NextResponse.json({ error: 'ไม่พบนัดหมายนี้' }, { status: 404 })
  if (appt.status !== 'pending' && appt.status !== 'confirmed') {
    return NextResponse.json({ error: 'นัดนี้ยกเลิกไม่ได้แล้ว' }, { status: 409 })
  }
  if (new Date(appt.scheduled_at).getTime() - Date.now() < CANCEL_LEAD_MINUTES * 60_000) {
    return NextResponse.json({ error: 'ใกล้เวลานัดแล้ว หากต้องการยกเลิกกรุณาติดต่อคลินิก' }, { status: 409 })
  }

  const { error } = await service
    .from('hw_appointments')
    .update({ status: 'cancelled', cancelled_reason: reason || 'คนไข้ยกเลิกเอง', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
  if (error) {
    console.error('cancel appointment error:', error)
    return NextResponse.json({ error: 'ยกเลิกไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
