'use client'

import { useState } from 'react'
import { IconBrandLine, IconLoader2 } from '@tabler/icons-react'

/**
 * เปิด LINE @p49clinic พร้อมข้อความ "ยืนยันนัด #รหัส" — กดส่งครั้งเดียว DocDesk จะผูก LINE กับนัดนี้
 * แล้วส่งยืนยันนัด เตือนก่อนถึงเวลา และลิงก์เข้าห้องให้ทาง LINE
 */
export function LineNotifyButton({ appointmentId, compact = false }: { appointmentId: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open() {
    setBusy(true); setError(null)
    const res = await fetch(`/api/appointments/${appointmentId}/line`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.url) { setError(data.error ?? 'เปิด LINE ไม่สำเร็จ'); setBusy(false); return }
    window.location.href = data.url
  }

  if (compact) {
    return (
      <div>
        <button onClick={open} disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold border border-[#06C755]/50 text-[#05a648] hover:bg-[#06C755]/10 disabled:opacity-60">
          {busy ? <IconLoader2 size={16} className="animate-spin" /> : <IconBrandLine size={18} />}
          {'รับแจ้งเตือนนัดนี้ทาง LINE'}
        </button>
        {error && <p role="alert" className="text-xs text-red-600 mt-1.5 text-center">{error}</p>}
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
          <div className="font-semibold text-sm">{'รับแจ้งเตือนทาง LINE'}</div>
          <p className="text-xs text-[var(--muted)] mt-0.5">{'กดแล้ว LINE @p49clinic จะเปิดพร้อมข้อความยืนยันนัด กดส่งครั้งเดียว เราจะเตือนก่อนถึงเวลาและส่งลิงก์เข้าห้องให้'}</p>
        </div>
      </div>
      {error && <div role="alert" className="text-xs text-red-600 mt-2">{error}</div>}
      <button onClick={open} disabled={busy}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold text-white bg-[#06C755] disabled:opacity-60">
        {busy ? <IconLoader2 size={16} className="animate-spin" /> : <IconBrandLine size={18} />}
        {'เปิด LINE เพื่อรับแจ้งเตือน'}
      </button>
    </div>
  )
}
