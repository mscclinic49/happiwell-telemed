import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { appointmentId } = await req.json()
  if (!appointmentId) {
    return NextResponse.json({ error: 'appointmentId required' }, { status: 400 })
  }

  const service = createSupabaseServiceClient()

  // ตรวจสอบว่า user คนนี้เป็นหมอของ appointment นี้จริง
  const { data: appt } = await service
    .from('hw_appointments')
    .select('id, doctor_id, hw_doctors!inner(user_id)')
    .eq('id', appointmentId)
    .single()

  if (!appt) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  const doctorUserId = (appt.hw_doctors as unknown as { user_id: string | null })?.user_id
  if (doctorUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await service
    .from('hw_consultations')
    .update({
      identity_verified_at: new Date().toISOString(),
      verified_by: user.id,
    })
    .eq('appointment_id', appointmentId)

  if (error) {
    console.error('verify-identity error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
