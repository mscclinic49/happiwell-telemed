'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import {
  IconCalendarClock, IconClock, IconUsers, IconBook2,
  IconCheck, IconChevronRight,
} from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type TodayAppt = {
  id: string; scheduled_at: string; status: string
  hw_users: { full_name: string | null; first_name: string | null } | null
  hw_doctors: { full_name: string } | null
}

type Stats = {
  todayCount: number
  pendingAppt: number
  totalPatients: number
  pendingHealth: number
  todayAppts: TodayAppt[]
}

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-yellow-500/15 text-yellow-500',
  confirmed: 'bg-blue-400/15 text-blue-400',
  completed: 'bg-emerald-500/15 text-emerald-500',
  cancelled: 'bg-red-500/15 text-red-400',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก',
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)

    Promise.all([
      sb.from('hw_appointments').select('id', { count: 'exact', head: true })
        .gte('scheduled_at', todayStart.toISOString()).lte('scheduled_at', todayEnd.toISOString()),
      sb.from('hw_appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('hw_users').select('id', { count: 'exact', head: true }),
      // pending health items
      sb.from('hw_medications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('hw_vaccines').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('hw_lab_results').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
      sb.from('hw_medical_history').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      // today appointments detail
      sb.from('hw_appointments')
        .select('id, scheduled_at, status, hw_users(full_name, first_name), hw_doctors(full_name)')
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .order('scheduled_at'),
    ]).then(([tc, pa, tp, pm, pv, pl, ph, ta]) => {
      setStats({
        todayCount:    tc.count ?? 0,
        pendingAppt:   pa.count ?? 0,
        totalPatients: tp.count ?? 0,
        pendingHealth: (pm.count ?? 0) + (pv.count ?? 0) + (pl.count ?? 0) + (ph.count ?? 0),
        todayAppts:    (ta.data as unknown as TodayAppt[]) ?? [],
      })
      setLoading(false)
    })
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const s = stats!

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 pb-12">
      <h1 className="text-xl font-bold mb-1">{'ภาพรวม'}</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={<IconCalendarClock size={20} className="text-[#1a8a6e]" />}
          iconBg="bg-[#1a8a6e]/15"
          label={'นัดหมายวันนี้'} value={s.todayCount}
          href="/admin/appointments" />
        <StatCard
          icon={<IconClock size={20} className="text-[#ef9f27]" />}
          iconBg="bg-[#ef9f27]/15"
          label={'รอยืนยัน'} value={s.pendingAppt}
          href="/admin/appointments" urgent={s.pendingAppt > 0} />
        <StatCard
          icon={<IconUsers size={20} className="text-[#378add]" />}
          iconBg="bg-[#378add]/15"
          label={'คนไข้ทั้งหมด'} value={s.totalPatients}
          href="/admin/patients" />
        <StatCard
          icon={<IconBook2 size={20} className="text-purple-400" />}
          iconBg="bg-purple-500/15"
          label={'รออนุมัติสุขภาพ'} value={s.pendingHealth}
          href="/admin/health-book" urgent={s.pendingHealth > 0} />
      </div>

      {/* Today's appointments */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm">{'นัดหมายวันนี้'}</h2>
          <Link href="/admin/appointments" className="text-xs text-[var(--hw-green)] font-medium flex items-center gap-0.5">
            {'ดูทั้งหมด'}<IconChevronRight size={13} />
          </Link>
        </div>

        {s.todayAppts.length === 0 ? (
          <div className="text-center py-8">
            <IconCheck size={32} className="mx-auto text-[var(--muted)] opacity-30 mb-2" />
            <p className="text-sm text-[var(--muted)]">{'ไม่มีนัดหมายวันนี้'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {s.todayAppts.map(a => {
              const dt = new Date(a.scheduled_at)
              const name = a.hw_users?.full_name || a.hw_users?.first_name || '—'
              return (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                  <div className="text-xs font-mono text-[var(--muted)] w-12 flex-shrink-0">
                    {dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{name}</div>
                    <div className="text-xs text-[var(--muted)] truncate">{a.hw_doctors?.full_name ?? '—'}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, iconBg, label, value, href, urgent }: {
  icon: React.ReactNode; iconBg: string; label: string; value: number
  href: string; urgent?: boolean
}) {
  return (
    <Link href={href} className="rounded-[14px] p-4 bg-[var(--card-bg)] border border-[var(--border)] flex items-start gap-3 hover:opacity-90 transition-opacity relative overflow-hidden">
      {urgent && value > 0 && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
      <div className={`w-10 h-10 rounded-[10px] ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-[var(--foreground)]">{value}</div>
        <div className="text-xs text-[var(--muted)] mt-0.5">{label}</div>
      </div>
    </Link>
  )
}
