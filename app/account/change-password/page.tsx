'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { IconLock, IconCheck, IconAlertCircle } from '@tabler/icons-react'

export default function ChangePasswordPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('รหัสผ่านไม่ตรงกัน'); return }
    if (password.length < 8) { setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return }
    setLoading(true); setError(null)

    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }

    setSuccess(true); setPassword(''); setConfirm(''); setLoading(false)
  }

  const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-base focus:outline-none focus:border-[var(--hw-green-dk)]'

  return (
    <div className="max-w-md mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <IconLock size={22} className="text-[var(--hw-green-dk)]" />
        <h1 className="text-xl font-bold">{'เปลี่ยนรหัสผ่าน'}</h1>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-[#e8f7f3] border border-[var(--hw-green-dk)] rounded-[14px] mb-6 text-[var(--hw-green-dk)]">
          <IconCheck size={18} />
          <span className="font-medium">{'เปลี่ยนรหัสผ่านสำเร็จ'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{'รหัสผ่านใหม่'}</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{'ยืนยันรหัสผ่านใหม่'}</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            className={inputClass}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-sm">
            <IconAlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
          style={{ background: 'var(--hw-green)' }}
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
        </button>
      </form>
    </div>
  )
}

