'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { IconChevronLeft, IconSun, IconSunset2, IconVideo, IconAlertCircle, IconLoader2 } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import {
  addDays, bkkDate, bookingDates, dateLabel, dayOfWeek, daySlots,
  DAY_SHORT, BOOKING_DAYS, SLOT_MINUTES, type ScheduleRow, type Slot,
} from '@/lib/slots'

type Doctor = { id: string; full_name: string; specialty: string | null; avatar_url: string | null }

function initials(name: string) {
  return name.replace(/^(นพ\.|พญ\.|ทพ\.|ทพญ\.)\s*/, '').slice(0, 2)
}

export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [booked, setBooked] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [symptoms, setSymptoms] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadBooked() {
    const from = new Date(`${bkkDate()}T00:00:00+07:00`)
    const to = new Date(`${addDays(bkkDate(), BOOKING_DAYS)}T00:00:00+07:00`)
    const { data } = await supabase.rpc('hw_booked_slots', {
      p_doctor: id, p_from: from.toISOString(), p_to: to.toISOString(),
    })
    setBooked(new Set(((data ?? []) as { scheduled_at: string }[]).map(r => new Date(r.scheduled_at).getTime())))
  }

  useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from('hw_doctors').select('id, full_name, specialty, avatar_url').eq('id', id).eq('is_active', true).maybeSingle(),
      supabase.from('hw_doctor_schedules').select('day_of_week, start_time, end_time, is_available').eq('doctor_id', id),
      loadBooked(),
    ]).then(([d, s]) => {
      if (!alive) return
      setDoctor((d.data as Doctor) ?? null)
      const rows = (s.data as ScheduleRow[]) ?? []
      setSchedules(rows)
      const first = bookingDates(rows).find(x => x.open)
      setDate(first?.date ?? null)
      setLoading(false)
    })
    // ช่องที่ใกล้เวลาเกินไปจะถูกปิดเองทุกนาที
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => { alive = false; clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const dates = useMemo(() => bookingDates(schedules, now), [schedules, now])
  const slots = useMemo(() => (date ? daySlots(date, schedules, booked, now) : []), [date, schedules, booked, now])
  const morning = slots.filter(s => s.time < '12:00')
  const afternoon = slots.filter(s => s.time >= '12:00')
  const freeCount = slots.filter(s => !s.booked && !s.past).length

  async function submit() {
    if (!slot) return
    setSubmitting(true); setError(null)
    const res = await fetch('/api/appointments/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: id, scheduledAt: slot.iso, symptoms }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'จองไม่สำเร็จ กรุณาลองใหม่')
      setSubmitting(false)
      if (res.status === 409) { setSlot(null); loadBooked() }
      return
    }
    router.replace(`/book/success?id=${data.id}`)
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
        <div className="h-20 rounded-[16px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
        <div className="h-24 rounded-[16px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
        <div className="h-64 rounded-[16px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="max-w-lg mx-auto px-5 py-16 text-center">
        <p className="text-sm text-[var(--muted)] mb-4">{'ไม่พบข้อมูลแพทย์ท่านนี้'}</p>
        <Link href="/doctors" className="text-sm font-semibold text-[var(--hw-green-dk)]">{'กลับไปเลือกแพทย์'}</Link>
      </div>
    )
  }

  const hasAnyDay = dates.some(d => d.open)

  return (
    <div className="max-w-lg mx-auto px-5 pt-5">
      <Link href={`/doctors/${doctor.id}`} className="inline-flex items-center gap-1 text-sm text-[var(--muted)] mb-4 hover:text-[var(--foreground)]">
        <IconChevronLeft size={16} />{'ข้อมูลแพทย์'}
      </Link>

      <h1 className="font-display text-[1.6rem] font-semibold leading-tight mb-4">{'นัดปรึกษาแพทย์ออนไลน์'}</h1>

      {/* Doctor */}
      <div className="flex items-center gap-3 mb-7">
        {doctor.avatar_url ? (
          <Image src={doctor.avatar_url} alt={doctor.full_name} width={52} height={52}
            className="rounded-full object-cover object-top flex-shrink-0" style={{ width: 52, height: 52 }} />
        ) : (
          <div className="w-[52px] h-[52px] rounded-full bg-[var(--hw-mint-bg)] text-[var(--hw-green-dk)] flex items-center justify-center font-bold flex-shrink-0">
            {initials(doctor.full_name)}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold leading-snug truncate">{doctor.full_name}</div>
          <div className="text-sm text-[var(--muted)] flex items-center gap-1.5">
            <IconVideo size={14} className="text-[var(--hw-green-dk)]" />
            {doctor.specialty ? `${doctor.specialty} · ` : ''}{`วิดีโอคอล ${SLOT_MINUTES} นาที`}
          </div>
        </div>
      </div>

      {!hasAnyDay ? (
        <div className="rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-6 text-center">
          <p className="font-semibold mb-1">{`ไม่มีวันออกตรวจใน ${BOOKING_DAYS} วันข้างหน้า`}</p>
          <p className="text-sm text-[var(--muted)] mb-4">{'ลองเลือกแพทย์ท่านอื่น หรือแชทกับคลินิกเพื่อนัดเป็นกรณีพิเศษ'}</p>
          <div className="flex justify-center gap-2">
            <Link href="/doctors" className="px-4 py-2 rounded-full text-sm font-semibold text-[var(--hw-on-primary)] bg-[var(--hw-primary)]">{'เลือกแพทย์ท่านอื่น'}</Link>
            <Link href="/chat" className="px-4 py-2 rounded-full text-sm font-semibold border border-[var(--border)]">{'แชทกับคลินิก'}</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Date strip */}
          <section className="mb-7">
            <h2 className="text-sm font-semibold mb-2.5">{'เลือกวัน'}</h2>
            <div className="-mx-5 px-5 flex gap-2 overflow-x-auto pb-1 snap-x" role="radiogroup" aria-label="วันที่นัด">
              {dates.map(d => {
                const selected = d.date === date
                const dow = dayOfWeek(d.date)
                return (
                  <button key={d.date} type="button" role="radio" aria-checked={selected}
                    disabled={!d.open}
                    onClick={() => { setDate(d.date); setSlot(null); setError(null) }}
                    className={`snap-start flex-shrink-0 w-[60px] rounded-[14px] py-2.5 flex flex-col items-center border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hw-green-dk)] ${
                      selected
                        ? 'bg-[var(--hw-primary)] border-transparent text-[var(--hw-on-primary)]'
                        : d.open
                          ? 'bg-[var(--card-bg)] border-[var(--border)] hover:border-[var(--hw-green-dk)]'
                          : 'bg-transparent border-dashed border-[var(--border)] text-[var(--muted)] opacity-60 cursor-not-allowed'
                    }`}>
                    <span className={`text-xs ${selected ? 'opacity-80' : 'text-[var(--muted)]'}`}>
                      {d.date === bkkDate(now) ? 'วันนี้' : DAY_SHORT[dow]}
                    </span>
                    <span className="font-display text-xl font-semibold leading-tight">{Number(d.date.slice(8))}</span>
                    <span className={`text-[11px] ${selected ? 'opacity-80' : 'text-[var(--muted)]'}`}>
                      {d.open ? dateLabel(d.date).split(' ')[2] : 'ไม่ว่าง'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Times */}
          {date && (
            <section className="mb-7">
              <div className="flex items-baseline justify-between mb-2.5">
                <h2 className="text-sm font-semibold">{'เลือกเวลา'}</h2>
                <span className="text-xs text-[var(--muted)]">{freeCount > 0 ? `ว่าง ${freeCount} ช่วง` : 'เต็มแล้ว'}</span>
              </div>
              {[{ label: 'ช่วงเช้า', Icon: IconSun, list: morning }, { label: 'ช่วงบ่าย', Icon: IconSunset2, list: afternoon }]
                .filter(g => g.list.length > 0)
                .map(g => (
                  <div key={g.label} className="mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] mb-2">
                      <g.Icon size={14} />{g.label}
                    </div>
                    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={g.label}>
                      {g.list.map(s => {
                        const disabled = s.booked || s.past
                        const selected = slot?.iso === s.iso
                        return (
                          <button key={s.iso} type="button" role="radio" aria-checked={selected} disabled={disabled}
                            onClick={() => { setSlot(s); setError(null) }}
                            className={`py-2.5 rounded-[10px] text-sm font-medium tabular-nums border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hw-green-dk)] ${
                              selected
                                ? 'bg-[var(--hw-primary)] border-transparent text-[var(--hw-on-primary)]'
                                : disabled
                                  ? 'border-transparent bg-[var(--background)] text-[var(--muted)] line-through opacity-50 cursor-not-allowed'
                                  : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-[var(--hw-green-dk)]'
                            }`}>
                            {s.time}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </section>
          )}

          {/* Symptoms */}
          <section className="mb-4">
            <label htmlFor="symptoms" className="block text-sm font-semibold mb-1">{'อาการเบื้องต้น'}</label>
            <p className="text-xs text-[var(--muted)] mb-2">{'ไม่บังคับ — ช่วยให้แพทย์เตรียมตัวก่อนคุย'}</p>
            <textarea id="symptoms" value={symptoms} onChange={e => setSymptoms(e.target.value)} maxLength={500} rows={3}
              placeholder="เช่น ไอ มีเสมหะ 3 วัน ไม่มีไข้"
              className="w-full px-4 py-3 rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] text-sm resize-none focus:outline-none focus:border-[var(--hw-green-dk)]" />
          </section>

          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-[12px] bg-[var(--hw-red-bg)] text-sm text-red-700 mb-4">
              <IconAlertCircle size={18} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}
        </>
      )}

      {/* Sticky confirm bar */}
      {hasAnyDay && (
        <div className="sticky bottom-0 z-20 -mx-5 mt-2 border-t border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur">
          <div className="px-5 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {slot ? (
                <>
                  <div className="text-xs text-[var(--muted)]">{'เวลานัด'}</div>
                  <div className="font-display font-semibold truncate">{`${dateLabel(date!)} · ${slot.time} น.`}</div>
                </>
              ) : (
                <div className="text-sm text-[var(--muted)]">{'เลือกวันและเวลาที่สะดวก'}</div>
              )}
            </div>
            <button type="button" onClick={submit} disabled={!slot || submitting}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-[var(--hw-on-primary)] bg-[var(--hw-primary)] disabled:opacity-40 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hw-green-dk)]">
              {submitting && <IconLoader2 size={16} className="animate-spin" />}
              {submitting ? 'กำลังจอง' : 'ยืนยันนัด'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
