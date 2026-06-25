'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { IconMail, IconArrowLeft, IconCircleCheck } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading]       = useState(false)
  const [sent, setSent]             = useState(false)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [error, setError]           = useState<string | null>(null)

  function maskEmail(email: string) {
    const [user, domain] = email.split('@')
    if (!domain) return email
    const visible = user.slice(0, 2)
    return `${visible}${'*'.repeat(Math.max(2, user.length - 2))}@${domain}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const input = identifier.trim()
    let email = input

    // Resolve username → email
    if (!input.includes('@')) {
      const { data, error: rpcErr } = await sb.rpc('get_email_by_username', { p_username: input.toLowerCase() })
      if (rpcErr || !data) {
        setError('ไม่พบบัญชีที่ใช้ username นี้')
        setLoading(false)
        return
      }
      email = data as string
    }

    const { error: resetErr } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (resetErr) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
      return
    }

    setMaskedEmail(maskEmail(email))
    setSent(true)
    setLoading(false)
  }

  const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[var(--hw-brand-blue)] transition-colors'

  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-hc.png" alt="HappiWell Clinic" width={200} height={70} className="object-contain mb-2" priority />
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--hw-mint-bg)] flex items-center justify-center mx-auto mb-4">
              <IconCircleCheck size={36} className="text-[var(--hw-brand-blue)]" />
            </div>
            <h2 className="text-lg font-bold mb-2">{'ส่งลิงก์แล้ว'}</h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-1">
              {'ระบบส่งลิงก์รีเซ็ตรหัสผ่านไปที่'}
            </p>
            <p className="text-sm font-semibold text-[var(--foreground)] mb-4">{maskedEmail}</p>
            <p className="text-xs text-[var(--muted)] mb-6">
              {'กรุณาตรวจสอบอีเมลและกดลิงก์ภายใน 1 ชั่วโมง หากไม่พบให้ตรวจสอบในโฟลเดอร์ Spam'}
            </p>
            <a href="/login"
              className="inline-flex items-center gap-2 text-sm text-[var(--hw-brand-blue)] font-medium hover:underline">
              <IconArrowLeft size={15} />{'กลับหน้าเข้าสู่ระบบ'}
            </a>
          </div>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold mb-2 text-center">{'ลืมรหัสผ่าน'}</h1>
            <p className="text-sm text-[var(--muted)] text-center mb-6">
              {'กรอกอีเมลหรือ username ที่ลงทะเบียนไว้ ระบบจะส่งลิงก์รีเซ็ตให้ทางอีเมล'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{'อีเมล หรือ username'}</label>
                <div className="relative">
                  <input
                    type="text" required autoCapitalize="none" autoComplete="email"
                    value={identifier} onChange={e => setIdentifier(e.target.value)}
                    placeholder={'email@example.com หรือ username'}
                    className={inputClass + ' pl-10'}
                  />
                  <IconMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-4 py-3">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !identifier.trim()}
                className="w-full py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ background: 'linear-gradient(120deg, var(--hw-brand-blue), var(--hw-brand-blue-dk))' }}>
                {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--muted)]">
              <a href="/login" className="inline-flex items-center gap-1 text-[var(--hw-brand-blue)] font-medium hover:underline">
                <IconArrowLeft size={14} />{'กลับหน้าเข้าสู่ระบบ'}
              </a>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
