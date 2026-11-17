import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { callDocdesk } from '@/lib/integration'
import { appointmentPayload } from '@/lib/docdesk-payload'

// ขอลิงก์เปิด LINE @p49clinic พร้อมรหัสผูกนัด (DocDesk เป็นคนส่งข้อความ LINE ทั้งหมด)
export async function POST(_req: Request, ctx: RouteContext<'/api/appointments/[id]/line'>) {
  const { id } = await ctx.params
  const supabaseAuth = await createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createSupabaseServiceClient()
  const { data: appt } = await service.from('hw_appointments').select('user_id, status').eq('id', id).maybeSingle()
  if (!appt || appt.user_id !== user.id) return NextResponse.json({ error: 'ไม่พบนัดหมายนี้' }, { status: 404 })
  if (appt.status === 'cancelled') return NextResponse.json({ error: 'นัดนี้ถูกยกเลิกแล้ว' }, { status: 409 })

  try {
    const payload = await appointmentPayload(service, id)
    const data = await callDocdesk<{ url: string; linked?: boolean }>('/api/integrations/telemed/link', { appointment: payload })
    return NextResponse.json(data)
  } catch (e) {
    console.error('docdesk link error:', e)
    return NextResponse.json({ error: 'ระบบแจ้งเตือน LINE ยังไม่พร้อม กรุณาลองใหม่ภายหลัง' }, { status: 503 })
  }
}
