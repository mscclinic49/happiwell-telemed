'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { IconCalendarPlus, IconCircleCheckFilled } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { AppointmentTicket, type TicketAppointment } from '@/components/AppointmentTicket'
import { LineNotifyButton } from '@/components/LineNotifyButton'
import { JOIN_EARLY_MINUTES } from '@/lib/slots'

function googleCalendarUrl(a: TicketAppointment) {
  const start = new Date(a.scheduled_at)
  const end = new Date(start.getTime() + (a.duration_minutes ?? 15) * 60_000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `ปรึกษาแพทย์ออนไลน์ HappiWell — ${a.hw_doctors?.full_name ?? ''}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `เข้าห้องปรึกษา: ${window.location.origin}/consult/${a.id}`,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function SuccessContent() {
  const id = useSearchParams().get('id')
  const [appt, setAppt] = useState<TicketAppointment | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('hw_appointments')
      .select('id, scheduled_at, status, symptoms, duration_minutes, hw_doctors(full_name, specialty, avatar_url)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAppt(data as unknown as TicketAppointment)
        else setMissing(true)
      })
  }, [id])

  if (!id || missing) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-sm text-[var(--muted)] mb-4">{'ไม่พบข้อมูลนัดหมาย'}</p>
        <Link href="/" className="text-sm font-semibold text-[var(--hw-green-dk)]">{'กลับหน้าหลัก'}</Link>
      </div>
    )
  }
  if (!appt) return <div className="max-w-md mx-auto px-5 py-8"><div className="h-72 rounded-[18px] bg-[var(--card-bg)] animate-pulse" /></div>

  return (
    <div className="max-w-md mx-auto px-5 py-8 pb-12">
      <div className="flex items-center gap-2.5 mb-1">
        <IconCircleCheckFilled size={28} className="text-[var(--hw-green)]" />
        <h1 className="font-display text-2xl font-semibold">{'นัดหมายเรียบร้อย'}</h1>
      </div>
      <p className="text-sm text-[var(--muted)] mb-6">
        {`ปุ่มเข้าห้องปรึกษาจะเปิดให้กด ${JOIN_EARLY_MINUTES} นาทีก่อนเวลานัด ที่หน้าหลักของคุณ`}
      </p>

      <AppointmentTicket appt={appt}>
        <a href={googleCalendarUrl(appt)} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold border border-[var(--border)] hover:border-[var(--hw-green-dk)] transition-colors">
          <IconCalendarPlus size={17} />{'เพิ่มลงปฏิทิน Google'}
        </a>
      </AppointmentTicket>

      <div className="mt-5">
        <LineNotifyButton appointmentId={appt.id} />
      </div>

      <Link href="/"
        className="mt-6 block w-full text-center py-3 rounded-full font-semibold text-[var(--hw-on-primary)] bg-[var(--hw-primary)]">
        {'กลับหน้าหลัก'}
      </Link>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}
