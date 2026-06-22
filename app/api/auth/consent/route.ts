import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'

const CONSENT_TYPES = ['general_data', 'health_data', 'video_recording'] as const
const POLICY_VERSION = '1.0'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null

  const service = createSupabaseServiceClient()

  const records = CONSENT_TYPES.map(type => ({
    user_id: user.id,
    consent_type: type,
    policy_version: POLICY_VERSION,
    ip_address: ip,
  }))

  const { error: insertError } = await service
    .from('hw_consent_records')
    .upsert(records, { onConflict: 'user_id,consent_type,policy_version' })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, consent_completed: true },
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
