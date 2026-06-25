'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { IconPill, IconEdit, IconPrinter, IconUser, IconCalendarClock } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Rx = {
  id: string
  created_at: string
  diagnosis: string | null
  hw_rx_items: { id: string }[]
  hw_appointments: {
    hw_users: { full_name: string | null } | null
  } | null
}

export default function DoctorRxPage() {
  const { user } = useAuth()
  const [rxList, setRxList] = useState<Rx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    sb.from('hw_doctors').select('id').eq('user_id', user.id).single()
      .then(({ data: doc }) => {
        if (!doc) { setLoading(false); return }
        sb.from('hw_rx')
          .select('id,created_at,diagnosis,hw_rx_items(id),hw_appointments(hw_users(full_name))')
          .eq('doctor_id', doc.id)
          .order('created_at', { ascending: false })
          .limit(60)
          .then(({ data }) => {
            setRxList((data as unknown as Rx[]) ?? [])
            setLoading(false)
          })
      })
  }, [user])

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-8">
      <div className="flex items-center gap-2 mb-5">
        <IconPill size={20} className="text-[var(--hw-green-dk)]" />
        <h1 className="text-lg font-bold">{'ใบสั่งยา'}</h1>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      ) : rxList.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <IconPill size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{'ยังไม่มีใบสั่งยา'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rxList.map(rx => {
            const dt = new Date(rx.created_at)
            const patientName = rx.hw_appointments?.hw_users?.full_name ?? '—'
            return (
              <div key={rx.id}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--hw-green-dk)]/10 flex items-center justify-center flex-shrink-0">
                  <IconUser size={16} className="text-[var(--hw-green-dk)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{patientName}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <IconCalendarClock size={11} />
                      {dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                    {rx.diagnosis && (
                      <span className="text-xs px-2 py-0.5 bg-[var(--hw-mint-bg)] text-[var(--hw-green)] rounded-full truncate max-w-[160px]">
                        {rx.diagnosis}
                      </span>
                    )}
                    <span className="text-xs text-[var(--muted)]">{rx.hw_rx_items.length} รายการ</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link
                    href={`/rx/${rx.id}/print`}
                    target="_blank"
                    title="พิมพ์"
                    className="p-2 rounded-full text-[var(--muted)] hover:text-[var(--hw-green-dk)] hover:bg-[var(--hw-green-dk)]/10 transition-colors">
                    <IconPrinter size={16} />
                  </Link>
                  <Link
                    href={`/doctor/rx/${rx.id}/edit`}
                    title="แก้ไข"
                    className="p-2 rounded-full text-[var(--muted)] hover:text-[var(--hw-green-dk)] hover:bg-[var(--hw-green-dk)]/10 transition-colors">
                    <IconEdit size={16} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
