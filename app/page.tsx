'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  IconCalendarClock, IconPill, IconVideo, IconMessageCircle2, IconStethoscope,
  IconTrendingUp, IconTrendingDown, IconMinus, IconChevronRight, IconHistory,
  IconMapPin, IconPhone, IconBrandLine,
} from '@tabler/icons-react'
import { AppointmentTicket, type TicketAppointment } from '@/components/AppointmentTicket'
import { LineConnectCard } from '@/components/LineConnectCard'
import { bkkDate, bkkTime, dateLabel, DAY_LONG, dayOfWeek, MONTH_SHORT, CANCEL_LEAD_MINUTES, JOIN_EARLY_MINUTES } from '@/lib/slots'

type Prescription = { id: string; issued_at: string; hw_doctors: { full_name: string } | null }
type Vitals = {
  lastBp: { systolic: number; diastolic: number; pulse: number | null } | null
  prevBpSystolic: number | null
  lastDtx: number | null; prevDtx: number | null
  weight: number | null; height: number | null
}

const getBpSt = (s: number) =>
  s <= 120 ? { label:'ปกติ', color:'text-[var(--hw-green)]', bg:'bg-[var(--hw-mint-bg)]', badge:'bg-[var(--hw-mint-bg)] text-[var(--hw-green)]' }
  : s <= 139 ? { label:'ระวัง', color:'text-yellow-600', bg:'bg-yellow-50', badge:'bg-yellow-100 text-yellow-700' }
  : { label:'สูง', color:'text-red-600', bg:'bg-red-50', badge:'bg-red-100 text-red-700' }

const getDtxSt = (v: number) =>
  v <= 99  ? { label:'ปกติ', color:'text-[var(--hw-green)]', bg:'bg-[var(--hw-mint-bg)]', badge:'bg-[var(--hw-mint-bg)] text-[var(--hw-green)]' }
  : v <= 125 ? { label:'ระวัง', color:'text-yellow-600', bg:'bg-yellow-50', badge:'bg-yellow-100 text-yellow-700' }
  : { label:'สูง', color:'text-red-600', bg:'bg-red-50', badge:'bg-red-100 text-red-700' }

const getBmiSt = (b: number) =>
  b < 23 ? { label:'ปกติ', color:'text-[var(--hw-green)]', badge:'bg-[var(--hw-mint-bg)] text-[var(--hw-green)]' }
  : b < 25 ? { label:'น้ำหนักเกิน', color:'text-yellow-600', badge:'bg-yellow-100 text-yellow-700' }
  : { label:'อ้วน', color:'text-red-600', badge:'bg-red-100 text-red-700' }

const getTrend = (cur: number, prev: number | null) => {
  if (!prev) return null
  const d = cur - prev
  if (Math.abs(d) < 1) return { Icon: IconMinus, color: 'text-[var(--muted)]', text: '' }
  return d > 0
    ? { Icon: IconTrendingUp, color: 'text-red-400', text: '+' + d.toFixed(0) }
    : { Icon: IconTrendingDown, color: 'text-[var(--hw-green)]', text: d.toFixed(0) }
}

function minutesUntil(iso: string, now: number) {
  return Math.round((new Date(iso).getTime() - now) / 60_000)
}

function untilLabel(mins: number) {
  if (mins <= 0) return 'ถึงเวลานัดแล้ว'
  if (mins < 60) return `อีก ${mins} นาที`
  const h = Math.floor(mins / 60)
  if (h < 24) return `อีก ${h} ชั่วโมง`
  return `อีก ${Math.round(h / 24)} วัน`
}

function NextAppointment({ appt, live, now, onCancelled }: {
  appt: TicketAppointment; live: boolean; now: number; onCancelled: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mins = minutesUntil(appt.scheduled_at, now)
  const canJoin = live || mins <= JOIN_EARLY_MINUTES
  const canCancel = mins >= CANCEL_LEAD_MINUTES

  async function cancel() {
    setBusy(true); setError(null)
    const res = await fetch('/api/appointments/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: appt.id }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setError(data.error ?? 'ยกเลิกไม่สำเร็จ'); return }
    onCancelled(appt.id)
  }

  return (
    <AppointmentTicket appt={appt} live={live}>
      {canJoin ? (
        <Link href={`/consult/${appt.id}`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-[var(--hw-on-primary)] bg-[var(--hw-primary)] hover:opacity-90 transition-opacity">
          <IconVideo size={18} />{live ? 'เข้าห้องปรึกษาเลย' : 'เข้าห้องรอแพทย์'}
        </Link>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--background)] px-4 py-3">
          <div>
            <div className="text-sm font-semibold">{untilLabel(mins)}</div>
            <div className="text-xs text-[var(--muted)]">{`ปุ่มเข้าห้องจะเปิด ${JOIN_EARLY_MINUTES} นาทีก่อนเวลานัด`}</div>
          </div>
          <IconVideo size={22} className="text-[var(--muted)] flex-shrink-0" />
        </div>
      )}

      {canCancel && !confirming && (
        <button onClick={() => setConfirming(true)}
          className="mt-3 w-full text-center text-xs font-medium text-[var(--muted)] hover:text-red-600">
          {'ยกเลิกนัดนี้'}
        </button>
      )}
      {confirming && (
        <div className="mt-3 rounded-[12px] bg-[var(--hw-red-bg)] p-3">
          <p className="text-sm mb-2.5">{'ยืนยันยกเลิกนัดนี้? ช่วงเวลานี้จะเปิดให้คนอื่นจองได้'}</p>
          {error && <p role="alert" className="text-xs text-red-700 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={cancel} disabled={busy}
              className="flex-1 py-2 rounded-full text-sm font-semibold text-white bg-red-600 disabled:opacity-60">
              {busy ? 'กำลังยกเลิก' : 'ยกเลิกนัด'}
            </button>
            <button onClick={() => { setConfirming(false); setError(null) }}
              className="flex-1 py-2 rounded-full text-sm font-semibold border border-[var(--border)] bg-[var(--card-bg)]">
              {'เก็บนัดไว้'}
            </button>
          </div>
        </div>
      )}
    </AppointmentTicket>
  )
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [upcoming, setUpcoming] = useState<TicketAppointment[]>([])
  const [activeRooms, setActiveRooms] = useState<Set<string>>(new Set())
  const [doctorFaces, setDoctorFaces] = useState<string[]>([])
  const [latestRx, setLatestRx] = useState<Prescription | null>(null)
  const [vitals, setVitals] = useState<Vitals>({ lastBp: null, prevBpSystolic: null, lastDtx: null, prevDtx: null, weight: null, height: null })
  const [loadingData, setLoadingData] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/welcome'); return }

    async function load() {
      const since = new Date(Date.now() - 60 * 60_000).toISOString()
      const [profileRes, apptRes, rxRes, dtxRes, bpRes, docRes] = await Promise.all([
        supabase.from('hw_users').select('first_name, weight, height').eq('id', user!.id).single(),
        supabase.from('hw_appointments')
          .select('id, scheduled_at, status, symptoms, duration_minutes, hw_doctors(full_name, specialty, avatar_url)')
          .eq('user_id', user!.id)
          .in('status', ['pending', 'confirmed'])
          .gte('scheduled_at', since)
          .order('scheduled_at', { ascending: true }).limit(5),
        supabase.from('hw_prescriptions')
          .select('id, issued_at, hw_doctors(full_name)')
          .eq('user_id', user!.id).order('issued_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('hw_dtx_records').select('value').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(2),
        supabase.from('hw_bp_records').select('systolic,diastolic,pulse').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(2),
        supabase.from('hw_doctors').select('avatar_url').eq('is_active', true).not('avatar_url', 'is', null).limit(3),
      ])

      const profile = profileRes.data as { first_name: string | null; weight: number | null; height: number | null } | null
      if (profile?.first_name) setFirstName(profile.first_name)
      const appts = (apptRes.data as unknown as TicketAppointment[]) || []
      setUpcoming(appts)
      setDoctorFaces(((docRes.data ?? []) as { avatar_url: string }[]).map(d => d.avatar_url))

      if (appts.length > 0) {
        const { data: rooms } = await supabase
          .from('hw_consultations')
          .select('appointment_id')
          .in('appointment_id', appts.map(a => a.id))
          .not('room_url', 'is', null)
        if (rooms?.length) setActiveRooms(new Set(rooms.map(r => r.appointment_id)))
      }
      if (rxRes.data) setLatestRx(rxRes.data as unknown as Prescription)

      const dtx = (dtxRes.data ?? []) as { value: number }[]
      const bp  = (bpRes.data ?? []) as { systolic: number; diastolic: number; pulse: number | null }[]
      setVitals({
        lastBp: bp[0] ?? null, prevBpSystolic: bp[1]?.systolic ?? null,
        lastDtx: dtx[0]?.value ?? null, prevDtx: dtx[1]?.value ?? null,
        weight: profile?.weight ?? null, height: profile?.height ?? null,
      })
      setLoadingData(false)
    }
    load()

    // แพทย์เปิดห้อง → การ์ดเปลี่ยนเป็น "แพทย์รออยู่ในห้อง" ทันที
    const ch = supabase.channel('patient-consult-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hw_consultations' }, payload => {
        const apptId = (payload.new as { appointment_id: string }).appointment_id
        setActiveRooms(prev => new Set([...prev, apptId]))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, authLoading, router])

  if (authLoading || loadingData) {
    return (
      <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
        <div className="h-12 w-48 rounded-[10px] bg-[var(--card-bg)] animate-pulse" />
        <div className="h-64 rounded-[18px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
        <div className="h-28 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
      </div>
    )
  }

  const bmi     = (vitals.weight && vitals.height) ? (vitals.weight / ((vitals.height / 100) ** 2)).toFixed(1) : null
  const bpSt    = vitals.lastBp ? getBpSt(vitals.lastBp.systolic) : null
  const dtxSt   = vitals.lastDtx != null ? getDtxSt(vitals.lastDtx) : null
  const bmiSt   = bmi ? getBmiSt(parseFloat(bmi)) : null
  const bpTrend = vitals.lastBp ? getTrend(vitals.lastBp.systolic, vitals.prevBpSystolic) : null
  const dtxTrend= vitals.lastDtx != null ? getTrend(vitals.lastDtx, vitals.prevDtx) : null
  const hasVitals = vitals.lastBp || vitals.lastDtx != null || bmi

  const today = bkkDate(new Date(now))
  const [, tm, td] = today.split('-').map(Number)
  const [next, ...later] = upcoming

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-10 space-y-6">

      {/* Greeting */}
      <header>
        <h1 className="font-display text-[1.7rem] font-semibold leading-tight">{firstName ? `สวัสดี คุณ${firstName}` : 'สวัสดี'}</h1>
        <p className="text-sm text-[var(--muted)]">{`วัน${DAY_LONG[dayOfWeek(today)]}ที่ ${td} ${MONTH_SHORT[tm - 1]}`}</p>
      </header>

      {/* ── นัดถัดไป หรือชวนนัด ── */}
      {next ? (
        <section aria-labelledby="next-appt">
          <h2 id="next-appt" className="sr-only">{'นัดหมายถัดไป'}</h2>
          <NextAppointment appt={next} live={activeRooms.has(next.id)} now={now}
            onCancelled={id => setUpcoming(prev => prev.filter(a => a.id !== id))} />
        </section>
      ) : (
        <section className="rounded-[18px] bg-[var(--hw-primary)] text-[var(--hw-on-primary)] p-5 overflow-hidden relative">
          <div className="flex -space-x-3 mb-4">
            {doctorFaces.map((src, i) => (
              <Image key={i} src={src} alt="" width={44} height={44}
                className="rounded-full object-cover object-top border-2 border-[var(--hw-primary)]" style={{ width: 44, height: 44 }} />
            ))}
          </div>
          <h2 className="font-display text-xl font-semibold mb-1">{'ปรึกษาแพทย์ผ่านวิดีโอ จากที่บ้าน'}</h2>
          <p className="text-sm opacity-85 mb-5">{'เลือกแพทย์ วัน และเวลาที่สะดวก ใช้เวลาจองไม่ถึงนาที'}</p>
          <div className="flex gap-2">
            <Link href="/doctors" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[var(--hw-on-primary)] text-[var(--hw-primary)] font-semibold text-sm">
              <IconStethoscope size={18} />{'นัดแพทย์'}
            </Link>
            <Link href="/chat" className="flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-current/40 font-semibold text-sm">
              <IconMessageCircle2 size={18} />{'ถามคลินิก'}
            </Link>
          </div>
        </section>
      )}

      <LineConnectCard context="home" />

      {/* ── นัดอื่นที่กำลังจะถึง ── */}
      {later.length > 0 && (
        <section>
          <h2 className="font-semibold text-sm mb-2.5">{'นัดอื่นที่กำลังจะถึง'}</h2>
          <ul className="rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] divide-y divide-[var(--border)]">
            {later.map(a => {
              const d = bkkDate(new Date(a.scheduled_at))
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <IconCalendarClock size={18} className="text-[var(--hw-green-dk)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{`${dateLabel(d)} ${bkkTime(a.scheduled_at)} น.`}</div>
                    <div className="text-xs text-[var(--muted)] truncate">{a.hw_doctors?.full_name}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {next && (
        <Link href="/doctors" className="flex items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3.5 hover:border-[var(--hw-green-dk)] transition-colors">
          <IconStethoscope size={20} className="text-[var(--hw-green-dk)]" />
          <span className="flex-1 text-sm font-semibold">{'นัดแพทย์เพิ่ม'}</span>
          <IconChevronRight size={16} className="text-[var(--muted)]" />
        </Link>
      )}

      {/* ── ค่าสุขภาพล่าสุด ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">{'ค่าสุขภาพล่าสุด'}</h2>
          <button onClick={() => router.push('/health-book/record')}
            className="text-xs text-[var(--hw-green)]">{'ดูสมุดสุขภาพ →'}</button>
        </div>

        {hasVitals ? (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
            <div className="grid grid-cols-2 gap-2">
              {vitals.lastBp && bpSt && (
                <button className={'rounded-xl p-3 text-left w-full ' + bpSt.bg} onClick={() => router.push('/health-book/record')}>
                  <p className="text-xs text-[var(--muted)] mb-1">{'ความดัน'}</p>
                  <p className={'text-lg font-bold ' + bpSt.color}>
                    {vitals.lastBp.systolic}/{vitals.lastBp.diastolic}
                    <span className="text-xs font-normal text-[var(--muted)] ml-1">{'mmHg'}</span>
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + bpSt.badge}>{bpSt.label}</span>
                    {bpTrend && <span className={'text-xs flex items-center gap-0.5 ' + bpTrend.color}><bpTrend.Icon size={12}/>{bpTrend.text}</span>}
                  </div>
                </button>
              )}
              {vitals.lastBp?.pulse && (
                <button className="rounded-xl p-3 bg-[var(--hw-mint-bg)] text-left w-full" onClick={() => router.push('/health-book/record')}>
                  <p className="text-xs text-[var(--muted)] mb-1">{'ชีพจร'}</p>
                  <p className="text-lg font-bold text-[var(--hw-green)]">
                    {vitals.lastBp.pulse}<span className="text-xs font-normal text-[var(--muted)] ml-1">{'bpm'}</span>
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--hw-mint-bg)] text-[var(--hw-green)] mt-1 inline-block">
                    {vitals.lastBp.pulse >= 60 && vitals.lastBp.pulse <= 100 ? 'ปกติ' : 'ผิดปกติ'}
                  </span>
                </button>
              )}
              {vitals.lastDtx != null && dtxSt && (
                <button className={'rounded-xl p-3 text-left w-full ' + dtxSt.bg} onClick={() => router.push('/health-book/record')}>
                  <p className="text-xs text-[var(--muted)] mb-1">{'น้ำตาล'}</p>
                  <p className={'text-lg font-bold ' + dtxSt.color}>
                    {vitals.lastDtx}<span className="text-xs font-normal text-[var(--muted)] ml-1">{'mg/dL'}</span>
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + dtxSt.badge}>{dtxSt.label}</span>
                    {dtxTrend && <span className={'text-xs flex items-center gap-0.5 ' + dtxTrend.color}><dtxTrend.Icon size={12}/>{dtxTrend.text}</span>}
                  </div>
                </button>
              )}
              {bmi && bmiSt && (
                <div className="rounded-xl p-3 bg-purple-50">
                  <p className="text-xs text-[var(--muted)] mb-1">{'BMI'}</p>
                  <p className={'text-lg font-bold ' + bmiSt.color}>{bmi}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + bmiSt.badge}>{bmiSt.label}</span>
                    {vitals.weight && <span className="text-xs text-[var(--muted)]">{vitals.weight}{' kg'}</span>}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => router.push('/health-book')}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-[10px] border border-[var(--border)] text-xs text-[var(--muted)] hover:border-[var(--hw-green)] hover:text-[var(--hw-green)] transition-colors">
              {'ดูยา · ผลตรวจ · วัคซีน'}
              <IconChevronRight size={13}/>
            </button>
          </div>
        ) : (
          <button onClick={() => router.push('/health-book/record')}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] border-dashed rounded-[14px] p-5 text-center hover:border-[var(--hw-green)] transition-colors">
            <p className="text-2xl mb-1.5">{'📓'}</p>
            <p className="text-sm font-medium text-[var(--muted)]">{'ยังไม่มีข้อมูลสุขภาพ'}</p>
            <p className="text-xs text-[var(--hw-green)] mt-1">{'+ เริ่มบันทึกค่าน้ำตาล/ความดัน'}</p>
          </button>
        )}
      </section>

      {/* ── ใบสั่งยาล่าสุด ── */}
      {latestRx && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconPill size={16} className="text-[var(--hw-green)]" />
            <h2 className="font-semibold text-sm">{'ใบสั่งยาล่าสุด'}</h2>
          </div>
          <Link href="/prescriptions"
            className="flex items-center gap-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 hover:border-[var(--hw-green)]/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[var(--hw-peach-bg)] flex items-center justify-center flex-shrink-0">
              <IconPill size={18} className="text-[var(--hw-orange)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{'ใบสั่งยา'}</div>
              <div className="text-xs text-[var(--muted)]">
                {latestRx.hw_doctors?.full_name} · {new Date(latestRx.issued_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
              </div>
            </div>
            <span className="text-xs text-[var(--hw-green)] font-medium flex-shrink-0">{'ดู →'}</span>
          </Link>
        </section>
      )}

      <Link href="/history" className="flex items-center gap-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <IconHistory size={18} />{'ดูประวัติการปรึกษาทั้งหมด'}<IconChevronRight size={14} className="ml-auto" />
      </Link>

      {/* ── คลินิก ── */}
      <footer className="border-t border-[var(--border)] pt-5 text-xs text-[var(--muted)] space-y-2">
        <div className="font-semibold text-sm text-[var(--foreground)]">{'แฮปปี้เวลล์ คลินิกเวชกรรม'}</div>
        <div>{'ใบอนุญาตประกอบกิจการ 10101035068'}</div>
        <div>{'จ.–ศ. 08:00–18:00 น. (พัก 12:00–13:00) ส.–อา. 08:00–12:00 น.'}</div>
        <div className="flex flex-wrap gap-2 pt-1">
          <a href="tel:020004586" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--foreground)]"><IconPhone size={14} />{'02-000-4586'}</a>
          <a href="https://line.me/R/ti/p/@p49clinic" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--foreground)]"><IconBrandLine size={14} />{'@p49clinic'}</a>
          <a href="https://maps.app.goo.gl/vyo3zyNqkSrcYMmC8" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--foreground)]"><IconMapPin size={14} />{'แผนที่คลินิก'}</a>
        </div>
      </footer>
    </div>
  )
}
