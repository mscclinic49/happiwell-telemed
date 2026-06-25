'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import {
  IconArrowLeft, IconDeviceFloppy, IconCheck, IconPill,
} from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RxItem = {
  id: string
  drug_name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  instructions: string
  quantity: string
  sort_order: number
}
type RxData = {
  id: string
  diagnosis: string | null
  created_at: string | null
  patient_id: string
  hw_rx_items: RxItem[]
  hw_appointments: {
    hw_users: { full_name: string | null } | null
    hw_doctors: { full_name: string | null } | null
  } | null
}

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-[var(--border)] rounded-[8px] bg-[var(--card-bg)] focus:outline-none focus:border-[var(--hw-green-dk)]'

export default function AdminRxEditPage() {
  const { rxId } = useParams<{ rxId: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [rx, setRx] = useState<RxData | null>(null)
  const [items, setItems] = useState<RxItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    sb.from('hw_users').select('role').eq('id', user.id).single()
      .then(({ data }) => {
        const ok = data?.role === 'admin' || data?.role === 'superadmin'
        if (!ok) { router.replace('/admin'); return }

        sb.from('hw_rx')
          .select('id,diagnosis,created_at,patient_id,hw_rx_items(id,drug_name,dosage,frequency,duration,instructions,quantity,sort_order),hw_appointments(hw_users(full_name),hw_doctors(full_name))')
          .eq('id', rxId).single()
          .then(({ data: rxData, error: e }) => {
            if (e || !rxData) { setError('ไม่พบใบสั่งยา'); setLoading(false); return }
            const r = rxData as unknown as RxData
            setRx(r)
            const sorted = [...r.hw_rx_items]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(i => ({ ...i, quantity: String(i.quantity ?? ''), instructions: i.instructions ?? '' }))
            setItems(sorted)
            setLoading(false)
          })
      })
  }, [user, rxId, router])

  function updateItem(id: string, field: 'quantity', value: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await Promise.all(
        items.map(i =>
          sb.from('hw_rx_items').update({
            quantity: i.quantity ? parseInt(i.quantity) : null,
          }).eq('id', i.id)
        )
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--hw-green-dk)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !rx) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10 text-center text-[var(--muted)]">
        <p>{error}</p>
        <Link href="/admin/prescriptions" className="text-sm text-[var(--hw-green-dk)] mt-4 inline-block">← กลับ</Link>
      </div>
    )
  }

  const patientName = rx?.hw_appointments?.hw_users?.full_name ?? '—'
  const doctorName  = rx?.hw_appointments?.hw_doctors?.full_name ?? '—'

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/admin/prescriptions"
          className="p-2 rounded-full hover:bg-[var(--border)] transition-colors flex-shrink-0">
          <IconArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <IconPill size={18} className="text-[var(--hw-green-dk)]" />
            <h1 className="text-lg font-bold truncate">{'แก้ไขใบสั่งยา'}</h1>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {patientName}{' · '}{doctorName}
            {rx?.created_at && ' · ' + new Date(rx.created_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>

      {rx?.diagnosis && (
        <div className="mb-4 px-4 py-2.5 bg-[var(--hw-mint-bg)] rounded-[10px]">
          <p className="text-xs font-medium text-[var(--hw-green-dk)]">{'การวินิจฉัย'}</p>
          <p className="text-sm mt-0.5">{rx.diagnosis}</p>
        </div>
      )}

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-1 mb-4">
        {/* Column header */}
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] border-b border-[var(--border)]">
          <span>{'ยา'}</span>
          <span>{'ขนาด / วิธีกิน'}</span>
          <span>{'จำนวน (เม็ด)'}</span>
        </div>

        {items.map(item => (
          <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr] gap-2 px-3 py-3 border-b border-[var(--border)] last:border-0 items-center">
            <div>
              <p className="text-sm font-medium">{item.drug_name}</p>
              {item.dosage && <p className="text-xs text-[var(--muted)] mt-0.5">{item.dosage}</p>}
              {item.frequency && <p className="text-xs text-[var(--muted)]">{item.frequency}</p>}
              {item.instructions && <p className="text-xs text-[var(--muted)]">{item.instructions}</p>}
            </div>
            <div>
              {item.duration
                ? <p className="text-xs text-[var(--muted)]">{item.duration} วัน</p>
                : <p className="text-xs text-[var(--muted)]">—</p>}
            </div>
            <input
              type="number" min="1"
              value={item.quantity}
              onChange={e => updateItem(item.id, 'quantity', e.target.value)}
              className={inputCls}
            />
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-3">{error}</p>
      )}

      <div className="flex gap-3">
        <Link href="/admin/prescriptions"
          className="flex-1 py-2.5 rounded-full text-sm font-semibold text-center border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--background)] transition-colors">
          {'ยกเลิก'}
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold text-white bg-[var(--hw-green-dk)] hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saved
            ? <><IconCheck size={16} />{'บันทึกแล้ว'}</>
            : saving
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><IconDeviceFloppy size={16} />{'บันทึก'}</>}
        </button>
      </div>
    </div>
  )
}
