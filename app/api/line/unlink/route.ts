import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'

export async function POST() {
  const supabaseAuth = await createSupabaseServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await createSupabaseServiceClient()
    .from('hw_users').update({ line_user_id: null }).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'ยกเลิกการเชื่อมต่อไม่สำเร็จ' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
