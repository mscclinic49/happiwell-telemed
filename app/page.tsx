'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  IconMessageCircle2, IconCalendarClock, IconPill,
  IconVideo, IconClock, IconCheck, IconX,
  IconTrendingUp, IconTrendingDown, IconMinus, IconChevronRight,
} from '@tabler/icons-react'

type Appointment = {
  id: string; scheduled_at: string; status: string; symptoms: string | null
  hw_doctors: { full_name: string; specialty: string | null } | null
}
type Prescription = { id: string; issued_at: string; hw_doctors: { full_name: string } | null }
type Vitals = {
  lastBp: { systolic: number; diastolic: number; pulse: number | null } | null
  prevBpSystolic: number | null
  lastDtx: number | null; prevDtx: number | null
  weight: number | null; height: number | null
}

const APPT_CFG: Record<string, { label: string; color: string; Icon: typeof IconClock }> = {
  pending:   { label: 'รอยืนยัน',  color: 'text-yellow-600 bg-yellow-50', Icon: IconClock  },
  confirmed: { label: 'ยืนยันแล้ว', color: 'text-blue-600 bg-blue-50',    Icon: IconCheck  },
  completed: { label: 'เสร็จสิ้น',  color: 'text-[#1a8a6e] bg-[#e8f7f3]', Icon: IconCheck  },
  cancelled: { label: 'ยกเลิก',    color: 'text-red-600 bg-red-50',        Icon: IconX      },
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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [activeRooms, setActiveRooms] = useState<Set<string>>(new Set())
  const [latestRx, setLatestRx] = useState<Prescription | null>(null)
  const [vitals, setVitals] = useState<Vitals>({ lastBp: null, prevBpSystolic: null, lastDtx: null, prevDtx: null, weight: null, height: null })
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    async function load() {
      const [profileRes, apptRes, rxRes, dtxRes, bpRes] = await Promise.all([
        supabase.from('hw_users').select('first_name, weight, height').eq('id', user!.id).single(),
        supabase.from('hw_appointments')
          .select('id, scheduled_at, status, symptoms, hw_doctors(full_name, specialty)')
          .eq('user_id', user!.id)
          .in('status', ['pending', 'confirmed', 'completed'])
          .order('scheduled_at', { ascending: false }).limit(5),
        supabase.from('hw_prescriptions')
          .select('id, issued_at, hw_doctors(full_name)')
          .eq('user_id', user!.id).order('issued_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('hw_dtx_records').select('value').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(2),
        supabase.from('hw_bp_records').select('systolic,diastolic,pulse').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(2),
      ])

      const profile = profileRes.data as { first_name: string | null; weight: number | null; height: number | null } | null
      if (profile?.first_name) setFirstName(profile.first_name)
      const appts = (apptRes.data as unknown as Appointment[]) || []
      setUpcoming(appts)

      // fetch active rooms for all appointments
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

    // Realtime: when doctor opens a room, update immediately
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
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin"/>
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

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-8 space-y-5">

      {/* Greeting */}
      <div>
        <p className="text-sm text-[var(--muted)]">{firstName ? `สวัสดี, ${firstName}` : 'สวัสดี'}</p>
        <h1 className="text-xl font-bold">{'หน้าหลัก'}</h1>
      </div>

      {/* ── 1. ข้อมูลคลินิก ── */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 space-y-2">
        <div className="font-semibold text-sm">{'แฮปปี้เวลล์ คลินิกเวชกรรม'}</div>
        <div className="text-xs text-[var(--muted)]">{'ใบอนุญาตประกอบกิจการ: 10101035068'}</div>
        <a href="https://maps.app.goo.gl/vyo3zyNqkSrcYMmC8" target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-1.5 text-xs text-[#185fa5] hover:underline">
          <span className="mt-px">{'📍'}</span>
          <span>{'เลขที่ 193, 195 ชั้น 1 ถนนประชาอุทิศ ตำบลบางมด อำเภอทุ่งครุ กรุงเทพฯ'}</span>
        </a>
        <div className="text-xs text-[var(--muted)]">{'จ–ศ 08:00–18:00 · ส–อา 08:00–12:00'}</div>
        <div className="flex flex-wrap gap-2 pt-1">
          <a href="tel:020004586" className="flex items-center gap-1.5 bg-[var(--hw-blue-bg)] text-[var(--hw-blue)] px-3 py-1.5 rounded-full text-xs font-medium">{'📞 02-000-4586'}</a>
          <a href="https://line.me/R/ti/p/@p49clinic" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[var(--hw-mint-bg)] text-[var(--hw-green)] px-3 py-1.5 rounded-full text-xs font-medium">{'Line @p49clinic'}</a>
          <a href="https://maps.app.goo.gl/vyo3zyNqkSrcYMmC8" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[var(--hw-peach-bg)] text-[var(--hw-orange)] px-3 py-1.5 rounded-full text-xs font-medium">{'🗺️ Google Maps'}</a>
        </div>
      </div>

      {/* ── 2. แชทกับคลินิก ── */}
      <Link href="/chat"
        className="flex items-center gap-4 p-5 rounded-[14px] text-white"
        style={{ background: 'linear-gradient(135deg, #1a8a6e 0%, #14705a 100%)' }}>
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <IconMessageCircle2 size={24} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-base">{'แชทกับคลินิก'}</div>
          <div className="text-sm text-white/80 mt-0.5">{'นัดหมาย ซักประวัติ หรือสอบถาม'}</div>
        </div>
      </Link>

      {/* ── 3. สมุดสุขภาพ (ค่าสุขภาพ + link) ── */}
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

      {/* ── 4. นัดหมาย ── */}
      {upcoming.length > 0 ? (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconCalendarClock size={16} className="text-[var(--hw-green)]" />
            <h2 className="font-semibold text-sm">{'นัดหมาย'}</h2>
          </div>
          <div className="space-y-2">
            {upcoming.map(a => {
              const dt = new Date(a.scheduled_at)
              const cfg = APPT_CFG[a.status] ?? APPT_CFG.pending
              const roomReady = activeRooms.has(a.id)
              const canJoin = roomReady || a.status === 'confirmed' || a.status === 'pending'
              return (
                <div key={a.id}
                  className={`border rounded-[14px] p-4 ${roomReady ? 'border-[var(--hw-green)] bg-[var(--hw-mint-bg)]' : 'bg-[var(--card-bg)] border-[var(--border)]'}`}>
                  {roomReady && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-[var(--hw-green)] animate-pulse" />
                      <span className="text-xs font-semibold text-[var(--hw-green)]">{'แพทย์พร้อมให้บริการแล้ว'}</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-semibold text-sm">{a.hw_doctors?.full_name}</div>
                      <div className="text-xs text-[var(--muted)]">{a.hw_doctors?.specialty}</div>
                      <div className="text-xs text-[var(--muted)] mt-1">
                        {dt.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} {'น.'}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  {a.symptoms && <p className="text-xs text-[var(--muted)] mb-3 truncate">{'อาการ: '}{a.symptoms}</p>}
                  {canJoin && a.status !== 'completed' && (
                    <Link href={`/consult/${a.id}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold text-white transition-all"
                      style={{ background: roomReady ? 'var(--hw-green)' : '#6B7280' }}>
                      <IconVideo size={16} />{roomReady ? 'เข้าห้องปรึกษาเลย!' : 'เข้าห้องปรึกษา'}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5 text-center">
          <IconCalendarClock size={32} className="mx-auto mb-2 text-[var(--muted)] opacity-40" />
          <p className="text-sm text-[var(--muted)]">{'ยังไม่มีนัดหมาย'}</p>
          <p className="text-xs text-[var(--muted)] mt-1">{'แชทกับคลินิกเพื่อนัดหมายพบแพทย์'}</p>
        </div>
      )}

      {/* ── 5. ใบสั่งยาล่าสุด ── */}
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
    </div>
  )
}
