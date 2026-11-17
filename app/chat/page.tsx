'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconBrandLine, IconChevronLeft, IconChevronRight, IconLock } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { ConsultChat } from '@/components/ConsultChat'
import { bkkDate, bkkTime, dateLabel } from '@/lib/slots'

type ConsultRow = {
  id: string
  appointment_id: string
  last_message_at: string | null
  hw_appointments: { scheduled_at: string; status: string; hw_doctors: { full_name: string } | null } | null
}

const LINE_OA = 'https://line.me/R/ti/p/@p49clinic'

function ChatContent() {
  const { user } = useAuth()
  const router = useRouter()
  const appt = useSearchParams().get('appt')
  const [rows, setRows] = useState<ConsultRow[] | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('hw_conversations')
      .select('id, appointment_id, last_message_at, hw_appointments(scheduled_at, status, hw_doctors(full_name))')
      .eq('patient_id', user.id).eq('type', 'consult')
      .order('last_message_at', { ascending: false })
      .then(({ data }) => setRows((data as unknown as ConsultRow[]) ?? []))
  }, [user])

  const open = rows?.find(r => r.appointment_id === appt)

  if (appt && user) {
    return (
      <div className="max-w-2xl mx-auto h-full flex flex-col">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)]">
          <button onClick={() => router.push('/chat')} aria-label="กลับ" className="p-1 -ml-1 text-[var(--muted)]"><IconChevronLeft size={20} /></button>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{open?.hw_appointments?.hw_doctors?.full_name ?? 'แชทกับแพทย์'}</div>
            {open?.hw_appointments && (
              <div className="text-xs text-[var(--muted)]">{`นัด ${dateLabel(bkkDate(new Date(open.hw_appointments.scheduled_at)))} ${bkkTime(open.hw_appointments.scheduled_at)} น.`}</div>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ConsultChat appointmentId={appt} me={user.id}
            closed={open?.hw_appointments?.status === 'completed' || open?.hw_appointments?.status === 'cancelled'} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-10">
      <h1 className="font-display text-2xl font-semibold mb-5">{'แชท'}</h1>

      <a href={LINE_OA} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-[16px] p-4 bg-[#06C755] text-white mb-8">
        <span className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"><IconBrandLine size={24} /></span>
        <span className="flex-1">
          <span className="block font-semibold">{'แชทกับคลินิกทาง LINE'}</span>
          <span className="block text-sm opacity-90">{'ถามราคา นัดหมาย หรือติดตามอาการหลังปรึกษา @p49clinic'}</span>
        </span>
        <IconChevronRight size={18} />
      </a>

      <h2 className="text-sm font-semibold mb-1">{'แชทกับแพทย์'}</h2>
      <p className="flex items-center gap-1 text-xs text-[var(--muted)] mb-3"><IconLock size={12} />{'เปิดเมื่อมีนัดปรึกษาออนไลน์ เห็นเฉพาะคุณกับแพทย์'}</p>
      {rows === null ? (
        <div className="h-16 rounded-[14px] bg-[var(--card-bg)] animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)] rounded-[14px] border border-dashed border-[var(--border)] p-5 text-center">{'ยังไม่มีแชทกับแพทย์'}</p>
      ) : (
        <ul className="rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] divide-y divide-[var(--border)]">
          {rows.map(r => (
            <li key={r.id}>
              <button onClick={() => router.push(`/chat?appt=${r.appointment_id}`)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--background)]">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{r.hw_appointments?.hw_doctors?.full_name ?? 'แพทย์'}</div>
                  {r.hw_appointments && (
                    <div className="text-xs text-[var(--muted)]">{`นัด ${dateLabel(bkkDate(new Date(r.hw_appointments.scheduled_at)))} ${bkkTime(r.hw_appointments.scheduled_at)} น.`}</div>
                  )}
                </div>
                <IconChevronRight size={16} className="text-[var(--muted)]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ChatPage() {
  return <Suspense fallback={null}><ChatContent /></Suspense>
}
