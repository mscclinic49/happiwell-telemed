import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { isFromDocdesk, unauthorized } from '@/lib/integration'

/** DocDesk: ยกเลิกนัดออนไลน์ (เจ้าหน้าที่ยกเลิกในแชท หรือคนไข้ขอเลื่อนแล้วทำนัดใหม่) */
export async function POST(req: Request, ctx: RouteContext<'/api/integrations/docdesk/appointments/[id]/cancel'>) {
  if (!isFromDocdesk(req)) return unauthorized()
  const { id } = await ctx.params
  const b = await req.json().catch(() => ({}))
  const service = createSupabaseServiceClient()
  const { data, error } = await service.from('hw_appointments')
    .update({ status: 'cancelled', cancelled_reason: typeof b.reason === 'string' ? b.reason.slice(0, 300) : 'ยกเลิกจาก DocDesk', updated_at: new Date().toISOString() })
    .eq('id', id).in('status', ['pending', 'confirmed']).select('id')
  if (error) return Response.json({ error: 'ยกเลิกไม่สำเร็จ' }, { status: 500 })
  return Response.json({ ok: true, cancelled: (data ?? []).length })
}
