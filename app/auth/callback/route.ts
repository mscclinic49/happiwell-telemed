import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const consentCompleted = data.user.user_metadata?.consent_completed === true
      return NextResponse.redirect(new URL(consentCompleted ? '/' : '/consent', origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
}
