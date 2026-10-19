'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { IconEye, IconEyeOff, IconLock, IconUser } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const input = username.trim()
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

    router.push('/admin')
    router.refresh()
  }

  const inputBase = 'w-full pl-10 pr-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[var(--hw-green-dk)] transition-colors'

  return (
    <main className="min-h-screen bg-[var(--hw-mint-bg)] flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-hc.png" alt="HappiWell Clinic" width={180} height={60} className="object-contain mb-4" priority />
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--hw-green-dk)] bg-[var(--hw-green-dk)]/10 px-3 py-1 rounded-full">
            {'Admin Portal'}
          </span>
        </div>

        <div className="bg-[var(--card-bg)] rounded-[20px] shadow-sm border border-[var(--border)] p-6">
          <h1 className="text-lg font-bold mb-1">{'เข้าสู่ระบบแอดมิน'}</h1>
          <p className="text-xs text-[var(--muted)] mb-6">{'สำหรับเจ้าหน้าที่คลินิกเท่านั้น'}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <IconUser size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text" required autoCapitalize="none" autoComplete="username"
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder={'username หรือ email'}
                className={inputBase}
              />
            </div>

            <div className="relative">
              <IconLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder={'รหัสผ่าน'}
                className={inputBase + ' pr-10'}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ background: 'var(--hw-green-dk)' }}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-5">{'HappiWell Telemed · Admin Portal'}</p>
      </div>
    </main>
  )
}
