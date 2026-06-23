import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createSupabaseServiceClient()

  // คนไข้ที่ last_visit_date เกิน 5 ปี หรือไม่เคยมา + สร้างบัญชีเกิน 5 ปี
  const { data: users, error } = await service
    .from('hw_users')
    .select('id, email, last_visit_date, created_at')
    .or(
      `last_visit_date.lt.${fiveYearsAgo()},and(last_visit_date.is.null,created_at.lt.${fiveYearsAgo()})`
    )

  if (error) {
    console.error('Retention query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const deleted: string[] = []
  const errors: string[] = []

  for (const u of users ?? []) {
    try {
      // ลบข้อมูลตาม FK cascade หรือลบทีละตาราง
      await service.from('hw_consent_records').delete().eq('user_id', u.id)
      await service.from('hw_consultations')
        .delete()
        .in(
          'appointment_id',
          (await service.from('hw_appointments').select('id').eq('user_id', u.id)).data?.map(a => a.id) ?? []
        )
      await service.from('hw_appointments').delete().eq('user_id', u.id)
      await service.from('hw_complaints').delete().eq('user_id', u.id)
      await service.from('hw_users').delete().eq('id', u.id)

      // ลบ auth user (cascade จาก FK แต่ลบ auth ด้วยเพื่อความสมบูรณ์)
      await service.auth.admin.deleteUser(u.id)

      // บันทึก audit log — เก็บ hash email แทน plaintext
      const emailHashed = u.email
        ? createHash('sha256').update(u.email).digest('hex')
        : null

      await service.from('hw_data_deletion_log').insert({
        user_id: u.id,
        reason: 'retention_5yr',
        last_visit_date: u.last_visit_date,
        email_hashed: emailHashed,
      })

      deleted.push(u.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${u.id}: ${msg}`)
      console.error('Retention delete error for', u.id, msg)
    }
  }

  return NextResponse.json({ deleted: deleted.length, errors })
}

function fiveYearsAgo() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 5)
  return d.toISOString()
}
