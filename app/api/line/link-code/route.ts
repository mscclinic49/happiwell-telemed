import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { LIFF_ID } from '@/lib/line'

// ออกรหัสใช้ครั้งเดียว (10 นาที) แล้วส่งคนไข้ไปหน้า LIFF เพื่อยืนยันบัญชี LINE
export async function POST() {
  if (!LIFF_ID) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า LINE' }, { status: 503 })

  const supabaseAuth = await createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = randomBytes(18).toString('base64url')
  const service = createSupabaseServiceClient()
  const { error } = await service.from('hw_line_link_codes').insert({
    code,
    user_id: user.id,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  })
  if (error) {
    console.error('line link-code error:', error)
    return NextResponse.json({ error: 'สร้างลิงก์เชื่อมต่อไม่สำเร็จ' }, { status: 500 })
  }
  return NextResponse.json({ url: `https://liff.line.me/${LIFF_ID}?code=${code}` })
}
