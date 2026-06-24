'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { IconEye, IconEyeOff, IconCircleCheck, IconAlertCircle } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function ResetPasswordContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [ready, setReady]       = useState(false)
  const [invalid, setInvalid]   = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      sb.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true)
        else setInvalid(true)
      })
      return
    }
    sb.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setInvalid(true)
      else setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    if (password !== confirm) { setError('รหัสผ่านทั้งสองไม่ตรงกัน'); return }
    setSaving(true)
    const { error: updateErr } = await sb.auth.updateUser({ password })
    if (updateErr) {
      setError('เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่')
      setSaving(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/login'), 3000)
  }

  const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[#1a8a6e] transition-colors'

  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-hc.png" alt="HappiWell Clinic" width={200} height={70} className="object-contain mb-2" priority />
        </div>

        {done && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#1a8a6e]/15 flex items-center justify-center mx-auto mb-4">
              <IconCircleCheck size={36} className="text-[#1a8a6e]" />
            </div>
            <h2 className="text-lg font-bold mb-2">{'เปลี่ยนรหัสผ่านสำเร็จ'}</h2>
            <p className="text-sm text-[var(--muted)]">{'กำลังพาไปหน้าเข้าสู่ระบบ...'}</p>
          </div>
        )}

        {!done && invalid && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <IconAlertCircle size={36} className="text-red-400" />
            </div>
            <h2 className="text-lg font-bold mb-2">{'ลิงก์หมดอายุหรือไม่ถูกต้อง'}</h2>
            <p className="text-sm text-[var(--muted)] mb-5">{'ลิงก์นี้ใช้ได้เพียง 1 ชั่วโมง กรุณาขอลิงก์ใหม่'}</p>
            <a href="/forgot-password"
              className="inline-block px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#1a8a6e' }}>
              {'ขอลิงก์ใหม่'}
            </a>
          </div>
        )}

        {!done && !invalid && !ready && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[#1a8a6e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--muted)]">{'กำลังตรวจสอบ...'}</p>
          </div>
        )}

        {!done && !invalid && ready && (
          <>
            <h1 className="text-xl font-bold mb-2 text-center">{'ตั้งรหัสผ่านใหม่'}</h1>
            <p className="text-sm text-[var(--muted)] text-center mb-6">{'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{'รหัสผ่านใหม่'}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={'อย่างน้อย 8 ตัวอักษร'}
                    className={inputClass + ' pr-10'} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                    {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{'ยืนยันรหัสผ่านใหม่'}</label>
                <div className="relative">
                  <input type={showCf ? 'text' : 'password'} required value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder={'กรอกรหัสผ่านอีกครั้ง'}
                    className={inputClass + ' pr-10'} />
                  <button type="button" onClick={() => setShowCf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                    {showCf ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500 mt-1">{'รหัสผ่านไม่ตรงกัน'}</p>
                )}
              </div>
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-[10px] px-4 py-3">
                  {error}
                </div>
              )}
              <button type="submit" disabled={saving || password !== confirm || password.length < 8}
                className="w-full py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ background: '#1a8a6e' }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-2 border-[#1a8a6e] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
