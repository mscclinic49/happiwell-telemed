import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'

const DAILY_API_URL = 'https://api.daily.co/v1'
const DAILY_API_KEY = process.env.DAILY_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createSupabaseServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { appointmentId } = await req.json()

    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
    }

    const service = createSupabaseServiceClient()

    // ตรวจสอบว่าเป็น patient หรือ doctor ของ appointment นี้
    const { data: appt } = await service
      .from('hw_appointments')
      .select('id, user_id, doctor_id')
      .eq('id', appointmentId)
      .single()

    if (!appt) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isPatient = appt.user_id === user.id
    let isDoctor = false
    if (!isPatient && appt.doctor_id) {
      const { data: doc } = await service
        .from('hw_doctors')
        .select('id')
        .eq('id', appt.doctor_id)
        .eq('user_id', user.id)
        .single()
      isDoctor = !!doc
    }

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // คืน room ที่มีอยู่แล้ว (ถ้ามี)
    const { data: existing } = await service
      .from('hw_consultations')
      .select('id, room_name, room_url')
      .eq('appointment_id', appointmentId)
      .single()

    if (existing?.room_url) {
      return NextResponse.json({ roomUrl: existing.room_url, roomName: existing.room_name })
    }

    const roomName = `appt-${appointmentId.slice(0, 8)}-${Date.now()}`
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 2

    const dailyRes = await fetch(`${DAILY_API_URL}/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'public',
        properties: {
          exp: expiresAt,
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          enable_recording: 'cloud',
        },
      }),
    })

    if (!dailyRes.ok) {
      const errorText = await dailyRes.text()
      console.error('Daily.co API error:', errorText)
      return NextResponse.json({ error: 'Failed to create video room', details: errorText }, { status: 500 })
    }

    const room = await dailyRes.json()

    await service.from('hw_consultations').insert({
      appointment_id: appointmentId,
      room_name: room.name,
      room_url: room.url,
      patient_consent: true,
      recording_status: 'pending',
    })

    return NextResponse.json({ roomUrl: room.url, roomName: room.name })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Create room error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
