'use client'

import { useEffect, useState } from 'react'
import { IconBrandLine, IconCheck, IconLoader2 } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { LIFF_ID } from '@/lib/line'

/**
 * การ์ดเชื่อมต่อ LINE เพื่อรับแจ้งเตือนนัด
 * - context "booking" / "home": โชว์เฉพาะตอนยังไม่เชื่อม (เชื่อมแล้วโชว์บรรทัดสั้นๆ ในหน้าจอง)
 * - context "settings": โชว์สถานะ + ปุ่มยกเลิกการเชื่อมต่อ
 * ถ้ายังไม่ได้ตั้งค่า LIFF จะไม่แสดงอะไรเลย
 */
export function LineConnectCard({ context }: { context: 'booking' | 'home' | 'settings' }) {
  const { user } = useAuth()
  const [linked, setLinked] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !LIFF_ID) return
    supabase.from('hw_users').select('line_user_id').eq('id', user.id).single()
      .then(({ data }) => setLinked(!!data?.line_user_id))
  }, [user])

  if (!LIFF_ID || linked === null) return null

  async function connect() {
    setBusy(true); setError(null)
    const res = await fetch('/api/line/link-code', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.url) { setError(data.error ?? 'เปิด LINE ไม่สำเร็จ'); setBusy(false); return }
    window.location.href = data.url
  }

  async function disconnect() {
    setBusy(true); setError(null)
    const res = await fetch('/api/line/unlink', { method: 'POST' })
    if (res.ok) setLinked(false)
    else setError('ยกเลิกการเชื่อมต่อไม่สำเร็จ')
    setBusy(false)
  }

  if (linked && context === 'home') return null
  if (linked && context === 'booking') {
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <IconBrandLine size={18} className="text-[#06C755]" />{'เราจะส่งเตือนนัดนี้ทาง LINE ให้ด้วย'}
      </p>
    )
  }

  if (linked) {
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <span className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center flex-shrink-0">
          <IconBrandLine size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-1">{'เชื่อมต่อ LINE แล้ว'}<IconCheck size={15} className="text-[var(--hw-green)]" /></div>
          <div className="text-xs text-[var(--muted)]">{'รับยืนยันนัดและการเตือนทาง @p49clinic'}</div>
          {error && <div role="alert" className="text-xs text-red-600 mt-1">{error}</div>}
        </div>
        <button onClick={disconnect} disabled={busy}
          className="text-xs font-medium text-[var(--muted)] hover:text-red-600 disabled:opacity-50">
          {'ยกเลิกการเชื่อมต่อ'}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-[14px] border border-[#06C755]/30 bg-[#06C755]/[0.07] p-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center flex-shrink-0">
          <IconBrandLine size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{'รับแจ้งเตือนนัดทาง LINE'}</div>
          <p className="text-xs text-[var(--muted)] mt-0.5">{'ยืนยันนัด เตือนก่อนถึงเวลา และลิงก์เข้าห้องปรึกษา ส่งตรงถึง LINE ของคุณ'}</p>
        </div>
      </div>
      {error && <div role="alert" className="text-xs text-red-600 mt-2">{error}</div>}
      <button onClick={connect} disabled={busy}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold text-white bg-[#06C755] disabled:opacity-60">
        {busy ? <IconLoader2 size={16} className="animate-spin" /> : <IconBrandLine size={18} />}
        {'เชื่อมต่อ LINE'}
      </button>
    </div>
  )
}
