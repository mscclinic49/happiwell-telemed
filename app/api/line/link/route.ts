import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { lineLoginChannelId } from '@/lib/line'

// รับ ID token จากหน้า LIFF + รหัสใช้ครั้งเดียว → ผูก LINE userId เข้ากับบัญชีคนไข้
// ไม่ต้องล็อกอินในเบราว์เซอร์ของ LINE เพราะรหัสยืนยันแล้วว่าเป็นใคร
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const code = typeof body.code === 'string' ? body.code : ''
  const idToken = typeof body.idToken === 'string' ? body.idToken : ''
  if (!code || !idToken) return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })

  const service = createSupabaseServiceClient()
  const { data: row } = await service
    .from('hw_line_link_codes')
    .select('code, user_id, expires_at, used_at')
    .eq('code', code)
    .maybeSingle()
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'ลิงก์นี้หมดอายุแล้ว กรุณากดเชื่อมต่อ LINE ใหม่จากในแอป' }, { status: 410 })
  }

  const verify = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: lineLoginChannelId() }),
  })
  const profile = await verify.json().catch(() => ({}))
  if (!verify.ok || typeof profile.sub !== 'string') {
    console.error('line verify failed:', verify.status, profile)
    return NextResponse.json({ error: 'ยืนยันบัญชี LINE ไม่สำเร็จ' }, { status: 401 })
  }

  const { data: used } = await service
    .from('hw_line_link_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('code', code)
    .is('used_at', null)
    .select('code')
  if (!used?.length) return NextResponse.json({ error: 'ลิงก์นี้ถูกใช้ไปแล้ว' }, { status: 410 })

  const { error } = await service
    .from('hw_users')
    .update({ line_user_id: profile.sub })
    .eq('id', row.user_id)
  if (error) {
    console.error('line link save error:', error)
    return NextResponse.json({ error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 })
  }

  await service.rpc('hw_notify_line_linked', { p_user: row.user_id })
  return NextResponse.json({ ok: true, name: profile.name ?? null })
}
