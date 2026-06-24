'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { IconEye, IconEyeOff } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const input = identifier.trim()
    let email = input

    if (!input.includes('@')) {
      const { data, error: rpcErr } = await sb.rpc('get_email_by_username', { p_username: input.toLowerCase() })
      if (rpcErr || !data) {
        setError('ไม่พบบัญชีผู้ใช้นี้ในระบบ')
        setLoading(false)
        return
      }
      email = data
    }

    const { error: authErr } = await sb.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError('อีเมล/username หรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[#1a8a6e] transition-colors'

  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-hc.png" alt="HappiWell Clinic" width={200} height={70} className="object-contain mb-2" priority />
          <h1 className="text-xl font-bold mt-4">{'เข้าสู่ระบบ'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{'อีเมล หรือ username'}</label>
            <input
              type="text"
              required
              autoCapitalize="none"
              autoComplete="username"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder={'email@example.com หรือ username'}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{'รหัสผ่าน'}</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={'รหัสผ่าน'}
                className={inputClass + ' pr-10'}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: '#1a8a6e' }}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          {'ยังไม่มีบัญชี? '}
          <a href="/register" className="text-[#1a8a6e] font-medium hover:underline">{'สมัครใช้งาน'}</a>
        </p>
      </div>
    </main>
  )
}
