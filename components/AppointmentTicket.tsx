'use client'

import Image from 'next/image'
import { IconVideo } from '@tabler/icons-react'
import { bkkDate, bkkTime, dateLabel, DAY_LONG, dayOfWeek, MONTH_SHORT } from '@/lib/slots'

export type TicketAppointment = {
  id: string
  scheduled_at: string
  status: string
  symptoms: string | null
  duration_minutes?: number | null
  source?: string | null
  hw_doctors: { full_name: string; specialty: string | null; avatar_url?: string | null } | null
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'รอยืนยัน',   cls: 'bg-[var(--hw-yellow-bg)] text-yellow-700' },
  confirmed: { label: 'ยืนยันแล้ว',  cls: 'bg-[var(--hw-mint-bg)] text-[var(--hw-green-dk)]' },
  completed: { label: 'ตรวจเสร็จแล้ว', cls: 'bg-[var(--hw-blue-bg)] text-blue-700' },
  cancelled: { label: 'ยกเลิกแล้ว',  cls: 'bg-[var(--hw-red-bg)] text-red-700' },
}

/** บัตรนัดแบบคลินิก — วันเวลาตัวใหญ่ เส้นปรุ แล้วตามด้วยแพทย์และปุ่ม */
export function AppointmentTicket({ appt, live = false, children }: {
  appt: TicketAppointment
  live?: boolean
  children?: React.ReactNode
}) {
  const date = bkkDate(new Date(appt.scheduled_at))
  const [, m, d] = date.split('-').map(Number)
  const doc = appt.hw_doctors
  const st = STATUS[appt.status] ?? STATUS.pending
  const isToday = date === bkkDate()

  return (
    <article
      aria-label={`นัด ${doc?.full_name ?? ''} ${dateLabel(date)} ${bkkTime(appt.scheduled_at)} น.`}
      className={`hw-ticket relative rounded-[18px] border bg-[var(--card-bg)] ${live ? 'border-[var(--hw-green)] hw-ticket-live' : 'border-[var(--border)]'}`}>
      {/* Date block */}
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[var(--hw-brand-blue)]">{'บัตรนัดปรึกษาออนไลน์'}</span>
          {live ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--hw-green-dk)]">
              <span className="w-2 h-2 rounded-full bg-[var(--hw-green)] animate-pulse" />{'แพทย์รออยู่ในห้อง'}
            </span>
          ) : (
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm text-[var(--muted)]">{isToday ? 'วันนี้' : `วัน${DAY_LONG[dayOfWeek(date)]}`}</div>
            <div className="font-display text-[2.1rem] font-semibold leading-none tracking-tight">
              {d} <span className="text-[1.35rem]">{MONTH_SHORT[m - 1]}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--muted)]">{'เวลา'}</div>
            <div className="font-display text-[2.1rem] font-semibold leading-none tabular-nums text-[var(--hw-green-dk)]">
              {bkkTime(appt.scheduled_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Perforation */}
      <div className="hw-ticket-perf" aria-hidden />

      {/* Doctor + actions */}
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center gap-3">
          {doc?.avatar_url ? (
            <Image src={doc.avatar_url} alt="" width={40} height={40}
              className="rounded-full object-cover object-top flex-shrink-0" style={{ width: 40, height: 40 }} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--hw-mint-bg)] flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">{doc?.full_name ?? 'แพทย์'}</div>
            <div className="text-xs text-[var(--muted)] flex items-center gap-1">
              <IconVideo size={13} />{`${doc?.specialty ? doc.specialty + ' ' : ''}วิดีโอคอล ${appt.duration_minutes ?? 15} นาที`}
            </div>
          </div>
          <span className="text-[11px] text-[var(--muted)] tabular-nums flex-shrink-0">{`#${appt.id.slice(0, 6).toUpperCase()}`}</span>
        </div>
        {appt.symptoms && (
          <p className="text-xs text-[var(--muted)] mt-3 line-clamp-2">{`อาการ: ${appt.symptoms}`}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </article>
  )
}
