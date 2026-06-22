import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const expected = 'sha256=' + hmac.digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-daily-signature') || ''
  const secret = process.env.DAILY_WEBHOOK_SECRET

  if (secret && !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.type !== 'recording-ready') {
    return NextResponse.json({ ok: true })
  }

  const { room_name, duration, start_ts, s3_key } = event

  const supabase = createSupabaseServiceClient()

  await supabase
    .from('hw_consultations')
    .update({
      recording_status: 'completed',
      started_at: new Date(start_ts * 1000).toISOString(),
      ended_at: new Date((start_ts + duration) * 1000).toISOString(),
      duration_seconds: duration,
      recording_url: s3_key || null,
    })
    .eq('room_name', room_name)
    .eq('recording_status', 'pending')

  return NextResponse.json({ ok: true })
}
