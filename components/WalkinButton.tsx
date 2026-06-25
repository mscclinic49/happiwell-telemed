'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconBolt, IconAlertCircle } from '@tabler/icons-react'

type Props = {
  compact?: boolean
  patientId?: string
  onSuccess?: (apptId: string) => void
}

export function WalkinButton({ compact = false, patientId, onSuccess }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleWalkin() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/appointments/walkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId }) })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'เกิดข้อผิดพลาด'); return }
      if (onSuccess) {
        onSuccess(data.appointment.id)
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setErr('ไม่สามารถเชื่อมต่อได้')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={handleWalkin}
        disabled={loading}
        className={`flex items-center justify-center gap-2 w-full font-semibold rounded-full transition-all disabled:opacity-50 ${
          compact ? 'py-2.5 text-sm' : 'py-3 text-base'
        } text-white`}
        style={{ background: 'linear-gradient(135deg, var(--hw-green) 0%, var(--hw-teal) 100%)' }}
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <IconBolt size={compact ? 16 : 18} />}
        {loading ? 'กำลังค้นหาแพทย์...' : 'นัดหมายทันที'}
      </button>
      {err && (
        <div className="mt-2 flex items-start gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
          <IconAlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}
    </div>
  )
}
