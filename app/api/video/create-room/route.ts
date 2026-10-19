import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'

const DAILY_API_URL = 'https://api.daily.co/v1'
const DAILY_API_KEY = process.env.DAILY_API_KEY!

// ห้องมีอายุ 2 ชม. — ถ้าห้องเดิมเหลือเวลาน้อยกว่า 10 นาที จะสร้างห้องใหม่ให้
const ROOM_TTL_SEC = 60 * 60 * 2
const ROOM_MIN_REMAINING_SEC = 60 * 10

async function daily(path: string, body: unknown) {
  const res = await fetch(`${DAILY_API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DAILY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Daily ${path} ${res.status}: ${text}`)
  return JSON.parse(text)
}

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
      .select('id, user_id, doctor_id, status')
      .eq('id', appointmentId)
      .single()

    if (!appt) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (appt.status === 'cancelled') {
      return NextResponse.json({ error: 'การนัดหมายนี้ถูกยกเลิกแล้ว' }, { status: 409 })
    }

    const isPatient = appt.user_id === user.id
    let isDoctor = false
    if (!isPatient && appt.doctor_id) {
      const { data: doc } = await service
        .from('hw_doctors')
        .select('id')
        .eq('id', appt.doctor_id)
        .eq('user_id', user.id)
        .maybeSingle()
      isDoctor = !!doc
    }

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: profile } = await service
      .from('hw_users')
      .select('title, first_name, last_name, full_name')
      .eq('id', user.id)
      .maybeSingle()
    const userName =
      [profile?.title, profile?.first_name ?? profile?.full_name, profile?.last_name].filter(Boolean).join('') ||
      (isDoctor ? 'แพทย์' : 'คนไข้')

    const now = Math.floor(Date.now() / 1000)

    // ใช้ห้องเดิมถ้ายังไม่หมดอายุ
    const { data: existing } = await service
      .from('hw_consultations')
      .select('id, room_name, room_url, created_at')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let roomName = existing?.room_name ?? null
    let roomUrl = existing?.room_url ?? null
    let roomExp = existing?.created_at
      ? Math.floor(new Date(existing.created_at).getTime() / 1000) + ROOM_TTL_SEC
      : 0

    if (!roomUrl || roomExp - now < ROOM_MIN_REMAINING_SEC) {
      roomExp = now + ROOM_TTL_SEC
      const room = await daily('/rooms', {
        name: `appt-${appointmentId.slice(0, 8)}-${Date.now()}`,
        // private = เข้าได้เฉพาะคนที่มี meeting token ที่เซิร์ฟเวอร์ออกให้
        privacy: 'private',
        properties: {
          exp: roomExp,
          enable_chat: true,
          enable_screenshare: true,
          enable_knocking: false,
          enable_prejoin_ui: false,
          start_video_off: false,
          start_audio_off: false,
          enable_recording: 'cloud',
        },
      })
      roomName = room.name
      roomUrl = room.url

      const row = {
        appointment_id: appointmentId,
        room_name: room.name,
        room_url: room.url,
        patient_consent: true,
        recording_status: 'pending',
        created_at: new Date(now * 1000).toISOString(),
      }
      const { error: dbErr } = existing
        ? await service.from('hw_consultations').update(row).eq('id', existing.id)
        : await service.from('hw_consultations').insert(row)
      if (dbErr) throw new Error(dbErr.message)
    }

    // token เฉพาะบุคคล — หมอเป็น owner (เตะคน/เริ่มบันทึกได้)
    const { token } = await daily('/meeting-tokens', {
      properties: {
        room_name: roomName,
        user_name: userName,
        user_id: user.id,
        is_owner: isDoctor,
        exp: roomExp,
      },
    })

    return NextResponse.json({ roomUrl, roomName, token, role: isDoctor ? 'doctor' : 'patient' })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Create room error:', errorMessage)
    return NextResponse.json({ error: 'ไม่สามารถเปิดห้องวิดีโอได้', details: errorMessage }, { status: 500 })
  }
}
