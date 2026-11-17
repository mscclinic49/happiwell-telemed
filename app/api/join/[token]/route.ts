import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { loadJoin, maskName } from '@/lib/join'

const CONSENT_TYPES = ['general_data', 'health_data', 'video_recording'] as const
const POLICY_VERSION = '1.0'

/** ข้อมูลนัดของลิงก์ (ไม่ต้องล็อกอิน) */
export async function GET(_req: Request, ctx: RouteContext<'/api/join/[token]'>) {
  const { token } = await ctx.params
  const info = await loadJoin(createSupabaseServiceClient(), token)
  if (!info) return NextResponse.json({ error: 'ลิงก์นี้ใช้ไม่ได้แล้ว หรือหมดอายุ' }, { status: 404 })
  return NextResponse.json({
    status: info.status,
    scheduled_at: info.scheduledAt,
    doctor: info.doctor,
    patient: maskName(info.patientName),
    needs_dob: info.needsDob,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

/**
 * ยืนยันตัว + ยินยอม PDPA → คืน token_hash ให้หน้าเว็บเข้าสู่ระบบในชื่อคนไข้ของนัดนี้
 * body: { consent: true, dob?: 'YYYY-MM-DD' }
 */
export async function POST(req: Request, ctx: RouteContext<'/api/join/[token]'>) {
  const { token } = await ctx.params
  const service = createSupabaseServiceClient()
  const info = await loadJoin(service, token)
  if (!info) return NextResponse.json({ error: 'ลิงก์นี้ใช้ไม่ได้แล้ว หรือหมดอายุ' }, { status: 404 })
  if (info.status === 'cancelled') return NextResponse.json({ error: 'นัดนี้ถูกยกเลิกแล้ว' }, { status: 409 })

  const body = await req.json().catch(() => ({}))
  if (body.consent !== true) return NextResponse.json({ error: 'กรุณายินยอมเงื่อนไขก่อนเข้าห้อง' }, { status: 400 })
  if (info.needsDob && body.dob !== info.dob) {
    return NextResponse.json({ error: 'วันเกิดไม่ตรงกับข้อมูลที่ลงทะเบียนไว้' }, { status: 403 })
  }

  const { data: auth } = await service.auth.admin.getUserById(info.userId)
  const email = auth.user?.email ?? info.email
  if (!email) return NextResponse.json({ error: 'บัญชีนี้เข้าผ่านลิงก์ไม่ได้ กรุณาติดต่อคลินิก' }, { status: 409 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
  await service.from('hw_consent_records').upsert(
    CONSENT_TYPES.map(type => ({ user_id: info.userId, consent_type: type, policy_version: POLICY_VERSION, ip_address: ip })),
    { onConflict: 'user_id,consent_type,policy_version' },
  )
  if (auth.user && auth.user.user_metadata?.consent_completed !== true) {
    await service.auth.admin.updateUserById(info.userId, { user_metadata: { ...auth.user.user_metadata, consent_completed: true } })
  }

  const { data: link, error } = await service.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !link.properties?.hashed_token) {
    console.error('join generateLink error:', error)
    return NextResponse.json({ error: 'เข้าห้องไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 })
  }

  const { data: t } = await service.from('hw_join_tokens').select('use_count').eq('token', token).single()
  await service.from('hw_join_tokens').update({ use_count: (t?.use_count ?? 0) + 1, last_used_at: new Date().toISOString() }).eq('token', token)

  return NextResponse.json({ token_hash: link.properties.hashed_token, appointment_id: info.appointmentId })
}
