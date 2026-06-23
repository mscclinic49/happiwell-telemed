import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { subject, detail } = await req.json()

  if (!subject?.trim() || !detail?.trim()) {
    return NextResponse.json({ error: 'กรุณากรอกหัวข้อและรายละเอียด' }, { status: 400 })
  }

  const service = createSupabaseServiceClient()

  const { error } = await service.from('hw_complaints').insert({
    user_id: user.id,
    subject: subject.trim(),
    detail: detail.trim(),
  })

  if (error) {
    console.error('Complaint insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
