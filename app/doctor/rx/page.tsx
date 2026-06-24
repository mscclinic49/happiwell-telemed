'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { IconPill, IconChevronRight } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Rx = {
  id: string; diagnosis: string | null; notes: string | null; created_at: string
  appointment_id: string | null
  hw_users: { full_name: string | null; first_name: string | null } | null
  hw_rx_items: { id: string; drug_name: string; dosage: string | null; frequency: string | null }[]
}

export default function DoctorRxPage() {
  const { user } = useAuth()
  const [rxList, setRxList] = useState<Rx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    sb.from('hw_doctors').select('id').eq('user_id', user.id).single()
      .then(({ data: doc }) => {
        if (!doc) return
        sb.from('hw_rx')
          .select('id, diagnosis, notes, created_at, appointment_id, hw_users(full_name, first_name), hw_rx_items(id, drug_name, dosage, frequency)')
          .eq('doctor_id', doc.id)
          .order('created_at', { ascending: false })
          .limit(50)
          .then(({ data }) => {
            setRxList((data as unknown as Rx[]) ?? [])
            setLoading(false)
          })
      })
  }, [user])

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-12">
      <div className="flex items-center gap-2 mb-5">
        <IconPill size={20} className="text-[#1a8a6e]" />
        <h1 className="text-lg font-bold">{'ใบสั่งยา'}</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />)}
        </div>
      ) : rxList.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <IconPill size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{'ยังไม่มีใบสั่งยา'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rxList.map(rx => {
            const name = rx.hw_users?.full_name || rx.hw_users?.first_name || '—'
            const dt   = new Date(rx.created_at)
            return (
              <Link key={rx.id}
                href={rx.appointment_id ? `/doctor/appointments/${rx.appointment_id}` : '#'}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 flex items-start gap-4 hover:border-[#1a8a6e]/40 transition-colors">
                <div className="w-10 h-10 rounded-[10px] bg-[#1a8a6e]/15 flex items-center justify-center flex-shrink-0">
                  <IconPill size={18} className="text-[#1a8a6e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[var(--foreground)]">{name}</div>
                  {rx.diagnosis && (
                    <div className="text-xs text-[var(--muted)] mt-0.5 truncate">{rx.diagnosis}</div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rx.hw_rx_items.slice(0, 3).map(item => (
                      <span key={item.id} className="text-[10px] bg-[#1a8a6e]/10 text-[#1a8a6e] px-2 py-0.5 rounded-full">
                        {item.drug_name}
                      </span>
                    ))}
                    {rx.hw_rx_items.length > 3 && (
                      <span className="text-[10px] text-[var(--muted)]">+{rx.hw_rx_items.length - 3}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="text-[10px] text-[var(--muted)]">
                    {dt.toLocaleDateString('th-TH', { dateStyle: 'short' })}
                  </div>
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
