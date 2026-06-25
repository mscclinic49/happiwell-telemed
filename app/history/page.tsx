'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import {
  IconCalendarClock, IconStethoscope, IconPill, IconVideo,
  IconClock, IconCheck, IconX, IconAlertCircle,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Appt = {
  id: string
  scheduled_at: string
  status: string
  symptoms: string | null
  hw_doctors: { full_name: string; specialty: string | null } | null
  hw_prescriptions: { id: string }[]
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: typeof IconClock }> = {
  pending:   { label: 'รอการยืนยัน', color: '#c47f00', bg: '#faeeda', Icon: IconClock },
  confirmed: { label: 'ยืนยันแล้ว',  color: 'var(--hw-blue)', bg: '#e6f1fb', Icon: IconCheck },
  completed: { label: 'เสร็จสิ้น',   color: 'var(--hw-green)', bg: '#e8f7f3', Icon: IconCheck },
  cancelled: { label: 'ยกเลิก',      color: '#64748b', bg: '#f1f5f9', Icon: IconX },
  no_show:   { label: 'ไม่มาตามนัด', color: '#dc2626', bg: '#fee2e2', Icon: IconAlertCircle },
}

export default function HistoryPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [appts, setAppts] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('hw_appointments')
      .select('id, scheduled_at, status, symptoms, hw_doctors(full_name, specialty), hw_prescriptions(id)')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: false })
      .then(({ data }) => { setAppts((data as unknown as Appt[]) || []); setLoading(false) })
  }, [user])

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <IconCalendarClock size={22} className="text-[var(--hw-green-dk)]" />
        <h1 className="text-xl font-bold">{'ประวัติการปรึกษา'}</h1>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />)}
        </div>
      )}

      {!loading && appts.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <IconCalendarClock size={44} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">{'ยังไม่มีประวัติการปรึกษา'}</p>
        </div>
      )}

      <div className="space-y-3">
        {appts.map(a => {
          const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.pending
          const dt = new Date(a.scheduled_at)
          const isUpcoming = dt > new Date() && a.status !== 'cancelled'
          const hasPrescription = a.hw_prescriptions.length > 0

          return (
            <div key={a.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <IconStethoscope size={14} className="text-[var(--hw-green-dk)] flex-shrink-0" />
                    <span className="truncate">{a.hw_doctors?.full_name ?? 'แพทย์'}</span>
                    {a.hw_doctors?.specialty && (
                      <span className="text-xs text-[var(--muted)] font-normal truncate">· {a.hw_doctors.specialty}</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {dt.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  {a.symptoms && (
                    <p className="text-xs text-[var(--muted)] line-clamp-1 mt-0.5">{a.symptoms}</p>
                  )}
                </div>
                <span
                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
                  style={{ color: cfg.color, background: cfg.bg }}
                >
                  <cfg.Icon size={11} />
                  {cfg.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isUpcoming && (
                  <Link
                    href={`/consult/${a.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ background: 'var(--hw-green)' }}
                  >
                    <IconVideo size={13} />
                    {'เข้าห้องปรึกษา'}
                  </Link>
                )}
                {hasPrescription && (
                  <Link
                    href="/prescriptions"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hw-mint-bg)] transition-colors"
                  >
                    <IconPill size={13} />
                    {'ดูใบสั่งยา'}
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

