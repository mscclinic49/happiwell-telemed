import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createSupabaseServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const symptoms: string | null = body.symptoms ?? null

    // Bangkok time (UTC+7)
    const now = new Date()
    const bk = new Date(now.getTime() + 7 * 3600000)
    const dayOfWeek = bk.getUTCDay()                     // 0=Sun … 6=Sat
    const currentTime = bk.toISOString().slice(11, 16)   // "HH:MM"

    const sb = await createSupabaseServiceClient()

    // Find doctors on duty right now
    const { data: schedules } = await sb
      .from('hw_doctor_schedules')
      .select('doctor_id')
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .lte('start_time', currentTime)
      .gte('end_time', currentTime)

    if (!schedules?.length) {
      return NextResponse.json(
        { error: 'ขณะนี้ไม่มีแพทย์ออกตรวจ กรุณาติดต่อคลินิก หรือนัดหมายล่วงหน้า' },
        { status: 409 }
      )
    }

    // Pick doctor with fewest pending appointments today (fairness)
    const todayStart = new Date(bk.toISOString().slice(0, 10) + 'T00:00:00+07:00').toISOString()
    const todayEnd   = new Date(bk.toISOString().slice(0, 10) + 'T23:59:59+07:00').toISOString()
    const doctorIds  = schedules.map(s => s.doctor_id)

    const { data: todayAppts } = await sb
      .from('hw_appointments')
      .select('doctor_id')
      .in('doctor_id', doctorIds)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', todayStart)
      .lte('scheduled_at', todayEnd)

    const countMap: Record<string, number> = {}
    for (const id of doctorIds) countMap[id] = 0
    for (const a of todayAppts ?? []) countMap[a.doctor_id] = (countMap[a.doctor_id] ?? 0) + 1

    const doctorId = doctorIds.reduce((a, b) => (countMap[a] <= countMap[b] ? a : b))

    // Create walk-in appointment
    const { data: appt, error } = await sb
      .from('hw_appointments')
      .insert({
        user_id: user.id,
        doctor_id: doctorId,
        scheduled_at: now.toISOString(),
        status: 'pending',
        consultation_type: 'walk-in',
        symptoms,
      })
      .select('id, doctor_id, scheduled_at, hw_doctors(full_name, specialty)')
      .single()

    if (error || !appt) {
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ appointment: appt })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
