'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  IconCalendarClock, IconUserCheck, IconPill, IconChevronRight, IconCheck,
} from '@tabler/icons-react'

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
  id: string; scheduled_at: string; status: string
  hw_users: { full_name: string | null; first_name: string | null } | null
}

export default function DoctorDashboard() {
  const { user } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [todayAppts, setTodayAppts] = useState<Appt[]>([])
  const [counts, setCounts] = useState({ today: 0, pending: 0, done: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    sb.from('hw_doctors').select('id').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (!data) return
        const did = data.id
        setDoctorId(did)

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
        const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)

        Promise.all([
          sb.from('hw_appointments').select('id', { count: 'exact', head: true })
            .eq('doctor_id', did)
            .gte('scheduled_at', todayStart.toISOString())
            .lte('scheduled_at', todayEnd.toISOString()),
          sb.from('hw_appointments').select('id', { count: 'exact', head: true })
            .eq('doctor_id', did).eq('status', 'pending'),
          sb.from('hw_appointments').select('id', { count: 'exact', head: true })
            .eq('doctor_id', did).eq('status', 'completed'),
          sb.from('hw_appointments')
            .select('id, scheduled_at, status, hw_users(full_name, first_name)')
            .eq('doctor_id', did)
            .gte('scheduled_at', todayStart.toISOString())
            .lte('scheduled_at', todayEnd.toISOString())
            .order('scheduled_at'),
        ]).then(([tc, tp, td, ta]) => {
          setCounts({ today: tc.count ?? 0, pending: tp.count ?? 0, done: td.count ?? 0 })
          setTodayAppts((ta.data as unknown as Appt[]) ?? [])
          setLoading(false)
        })
      })
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-[#1a8a6e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 pb-12">
      <h1 className="text-xl font-bold mb-1">{'ภาพรวม'}</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: <IconCalendarClock size={20} className="text-[#1a8a6e]" />, iconBg: 'bg-[#1a8a6e]/15', label: 'นัดวันนี้', value: counts.today, href: '/doctor/appointments' },
          { icon: <IconUserCheck size={20} className="text-yellow-500" />, iconBg: 'bg-yellow-500/15', label: 'รอยืนยัน', value: counts.pending, href: '/doctor/appointments' },
          { icon: <IconPill size={20} className="text-blue-400" />, iconBg: 'bg-blue-400/15', label: 'ตรวจแล้ว', value: counts.done, href: '/doctor/rx' },
        ].map(c => (
          <Link key={c.label} href={c.href}
            className="rounded-[14px] p-4 bg-[var(--card-bg)] border border-[var(--border)] flex items-start gap-3 hover:opacity-80 transition-opacity">
            <div className={`w-10 h-10 rounded-[10px] ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
              {c.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--foreground)]">{c.value}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5">{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Today's appointments */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm">{'นัดหมายวันนี้'}</h2>
          <Link href="/doctor/appointments" className="text-xs text-[#1a8a6e] font-medium flex items-center gap-0.5">
            {'ดูทั้งหมด'}<IconChevronRight size={13} />
          </Link>
        </div>

        {todayAppts.length === 0 ? (
          <div className="text-center py-8">
            <IconCheck size={32} className="mx-auto text-[var(--muted)] opacity-30 mb-2" />
            <p className="text-sm text-[var(--muted)]">{'ไม่มีนัดหมายวันนี้'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayAppts.map(a => {
              const dt   = new Date(a.scheduled_at)
              const name = a.hw_users?.full_name || a.hw_users?.first_name || '—'
              return (
                <Link key={a.id} href={`/doctor/appointments/${a.id}`}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-[10px] hover:bg-[#1a8a6e]/5 transition-colors border border-transparent hover:border-[var(--border)]">
                  <div className="text-xs font-mono text-[var(--muted)] w-12 flex-shrink-0">
                    {dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-[var(--foreground)]">{name}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[a.status] ?? ''}`}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                  <IconChevronRight size={14} className="text-[var(--muted)] flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
