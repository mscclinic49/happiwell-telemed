'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { IconCalendarClock, IconChevronRight } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-yellow-500/15 text-yellow-500',
  confirmed: 'bg-blue-400/15 text-blue-400',
  completed: 'bg-emerald-500/15 text-emerald-500',
  cancelled: 'bg-red-500/15 text-red-400',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก',
}

type Appt = {
  id: string; scheduled_at: string; status: string; symptoms: string | null
  hw_users: { full_name: string | null; first_name: string | null; phone: string | null } | null
}

const FILTERS = [
  { key: 'upcoming', label: 'กำลังจะมา' },
  { key: 'today',    label: 'วันนี้' },
  { key: 'all',      label: 'ทั้งหมด' },
]

export default function DoctorAppointmentsPage() {
  const { user } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [appts, setAppts] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('today')

  useEffect(() => {
    if (!user) return
    sb.from('hw_doctors').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setDoctorId(data.id) })
  }, [user])

  useEffect(() => {
    if (!doctorId) return
    setLoading(true)
    let q = sb.from('hw_appointments')
      .select('id, scheduled_at, status, symptoms, hw_users(full_name, first_name, phone)')
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: filter !== 'all' })

    const now = new Date()
    if (filter === 'today') {
      const s = new Date(now); s.setHours(0, 0, 0, 0)
      const e = new Date(now); e.setHours(23, 59, 59, 999)
      q = q.gte('scheduled_at', s.toISOString()).lte('scheduled_at', e.toISOString())
    } else if (filter === 'upcoming') {
      q = q.gte('scheduled_at', now.toISOString()).neq('status', 'cancelled').limit(30)
    } else {
      q = q.limit(50)
    }

    q.then(({ data }) => {
      setAppts((data as unknown as Appt[]) ?? [])
      setLoading(false)
    })
  }, [doctorId, filter])

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-12">
      <div className="flex items-center gap-2 mb-5">
        <IconCalendarClock size={20} className="text-[var(--hw-green-dk)]" />
        <h1 className="text-lg font-bold">{'นัดหมาย'}</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f.key
                ? 'bg-[var(--hw-green-dk)] text-white border-transparent'
                : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />)}
        </div>
      ) : appts.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <IconCalendarClock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{'ไม่มีนัดหมาย'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appts.map(a => {
            const dt   = new Date(a.scheduled_at)
            const name = a.hw_users?.full_name || a.hw_users?.first_name || '—'
            return (
              <Link key={a.id} href={`/doctor/appointments/${a.id}`}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 flex items-center gap-4 hover:border-[var(--hw-green-dk)]/40 transition-colors">
                {/* Date block */}
                <div className="text-center flex-shrink-0 w-12">
                  <div className="text-lg font-bold text-[var(--foreground)] leading-none">{dt.getDate()}</div>
                  <div className="text-[10px] text-[var(--muted)]">
                    {dt.toLocaleDateString('th-TH', { month: 'short' })}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--hw-green-dk)] mt-0.5">
                    {dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate text-[var(--foreground)]">{name}</div>
                  {a.symptoms && (
                    <div className="text-xs text-[var(--muted)] truncate mt-0.5">{a.symptoms}</div>
                  )}
                  {a.hw_users?.phone && (
                    <div className="text-xs text-[var(--muted)] mt-0.5">{a.hw_users.phone}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status] ?? ''}`}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                  <IconChevronRight size={15} className="text-[var(--muted)]" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
