'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconPill, IconDownload, IconCalendar, IconAlertCircle, IconStethoscope,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Prescription = {
  id: string
  appointment_id: string | null
  storage_path: string
  notes: string | null
  issued_at: string
  valid_until: string | null
  hw_doctors: { full_name: string } | null
}

export default function PrescriptionsPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('hw_prescriptions')
      .select('id, appointment_id, storage_path, notes, issued_at, valid_until, hw_doctors(full_name)')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })
      .then(({ data }) => {
        setPrescriptions((data as unknown as Prescription[]) || [])
        setLoading(false)
      })
  }, [user])

  async function handleDownload(rx: Prescription) {
    setDownloading(rx.id)
    const { data, error } = await supabase.storage
      .from('prescriptions')
      .createSignedUrl(rx.storage_path, 3600)
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
    setDownloading(null)
  }

  function isExpired(validUntil: string | null) {
    return !!validUntil && new Date(validUntil) < new Date()
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <IconPill size={22} className="text-[var(--hw-green-dk)]" />
        <h1 className="text-xl font-bold">{'ใบสั่งยา'}</h1>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-28 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && prescriptions.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <IconPill size={44} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">{'ยังไม่มีใบสั่งยา'}</p>
          <p className="text-xs mt-1 opacity-70">{'ใบสั่งยาจะปรากฏที่นี่หลังแพทย์ออกใบสั่งยา'}</p>
        </div>
      )}

      <div className="space-y-3">
        {prescriptions.map(rx => {
          const expired = isExpired(rx.valid_until)
          return (
            <div
              key={rx.id}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <IconStethoscope size={14} className="text-[var(--hw-green-dk)] flex-shrink-0" />
                    <span className="text-sm font-semibold truncate">
                      {rx.hw_doctors?.full_name ?? 'แพทย์'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <IconCalendar size={11} />
                      {'ออกเมื่อ '}{new Date(rx.issued_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                    </span>
                    {rx.valid_until && (
                      <>
                        <span className="opacity-30">·</span>
                        <span className={expired ? 'text-red-500 font-medium' : ''}>
                          {expired
                            ? 'หมดอายุแล้ว'
                            : 'ใช้ได้ถึง ' + new Date(rx.valid_until).toLocaleDateString('th-TH', { dateStyle: 'short' })}
                        </span>
                      </>
                    )}
                  </div>

                  {rx.notes && (
                    <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2 mt-1">
                      {rx.notes}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleDownload(rx)}
                  disabled={downloading === rx.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-white flex-shrink-0 disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: expired ? '#94a3b8' : 'var(--hw-green)' }}
                >
                  <IconDownload size={13} />
                  {downloading === rx.id ? '...' : 'ดาวน์โหลด'}
                </button>
              </div>

              {expired && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                  <IconAlertCircle size={13} />
                  {'ใบสั่งยานี้หมดอายุแล้ว กรุณาปรึกษาแพทย์เพื่อออกใบสั่งยาใหม่'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

