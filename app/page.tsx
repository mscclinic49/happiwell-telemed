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

/* ── Types ── */
type Appointment = {
  id: string; scheduled_at: string; status: string; symptoms: string | null
  hw_doctors: { full_name: string; specialty: string | null } | null
}
type Prescription = { id: string; issued_at: string; hw_doctors: { full_name: string } | null }
type HealthData = {
  lastDtx: number | null; prevDtx: number | null
  lastBp: { systolic: number; diastolic: number; pulse: number | null } | null
  prevBpSystolic: number | null
  weight: number | null; height: number | null
  todayMeds: { name: string; times: string[] | null; dosage: string | null }[]
  abnormalLabs: { test_name: string; value: number | null; unit: string | null; status: string }[]
  latestLabDate: string; latestLabHospital: string
  dueSoonVaccines: { vaccine_name: string; next_due_date: string | null }[]
  lastVisit: { hospital: string; visit_date: string; doctor: string | null; chief_complaint: string | null } | null
}

const APPT_CFG: Record<string, { label: string; color: string; Icon: typeof IconClock }> = {
  pending:   { label: 'รอยืนยัน',  color: 'text-yellow-600 bg-yellow-50', Icon: IconClock  },
  confirmed: { label: 'ยืนยันแล้ว', color: 'text-blue-600 bg-blue-50',    Icon: IconCheck  },
  completed: { label: 'เสร็จสิ้น',  color: 'text-[#1a8a6e] bg-[#e8f7f3]', Icon: IconCheck  },
  cancelled: { label: 'ยกเลิก',    color: 'text-red-600 bg-red-50',        Icon: IconX      },
}

const getBpSt  = (s: number) =>
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
  if (d > 0) return { Icon: IconTrendingUp, color: 'text-red-400', text: '+' + d.toFixed(0) }
  return { Icon: IconTrendingDown, color: 'text-[var(--hw-green)]', text: d.toFixed(0) }
}

const EMPTY_HEALTH: HealthData = {
  lastDtx: null, prevDtx: null, lastBp: null, prevBpSystolic: null,
  weight: null, height: null, todayMeds: [], abnormalLabs: [],
  latestLabDate: '', latestLabHospital: '', dueSoonVaccines: [], lastVisit: null,
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [latestRx, setLatestRx] = useState<Prescription | null>(null)
  const [health, setHealth] = useState<HealthData>(EMPTY_HEALTH)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    async function load() {
      const [profileRes, apptRes, rxRes, dtxRes, bpRes, labRes, medsRes, vacRes, histRes] = await Promise.all([
        supabase.from('hw_users').select('first_name, weight, height').eq('id', user!.id).single(),
        supabase.from('hw_appointments')
          .select('id, scheduled_at, status, symptoms, hw_doctors(full_name, specialty)')
          .eq('user_id', user!.id).in('status', ['pending', 'confirmed'])
          .gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(3),
        supabase.from('hw_prescriptions')
          .select('id, issued_at, hw_doctors(full_name)')
          .eq('user_id', user!.id).order('issued_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('hw_dtx_records').select('value').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(2),
        supabase.from('hw_bp_records').select('systolic,diastolic,pulse').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(2),
        supabase.from('hw_lab_results').select('test_name,value,unit,status,test_date,hospital').eq('user_id', user!.id).eq('approval_status', 'approved').order('test_date', { ascending: false }).limit(30),
        supabase.from('hw_medications').select('name,times,dosage').eq('user_id', user!.id).eq('is_active', true).eq('status', 'approved').limit(5),
        supabase.from('hw_vaccines').select('vaccine_name,next_due_date').eq('user_id', user!.id).eq('status', 'approved'),
        supabase.from('hw_medical_history').select('hospital,visit_date,doctor,chief_complaint').eq('user_id', user!.id).eq('status', 'approved').order('visit_date', { ascending: false }).limit(1),
      ])

      const profile = profileRes.data as { first_name: string | null; weight: number | null; height: number | null } | null
      if (profile?.first_name) setFirstName(profile.first_name)
      setUpcoming((apptRes.data as unknown as Appointment[]) || [])
      if (rxRes.data) setLatestRx(rxRes.data as unknown as Prescription)

      const dtx  = (dtxRes.data ?? []) as { value: number }[]
      const bp   = (bpRes.data ?? []) as { systolic: number; diastolic: number; pulse: number | null }[]
      const labs = (labRes.data ?? []) as { test_name: string; value: number | null; unit: string | null; status: string; test_date: string; hospital: string | null }[]
      const meds = (medsRes.data ?? []) as { name: string; times: string[] | null; dosage: string | null }[]
      const vacs = (vacRes.data ?? []) as { vaccine_name: string; next_due_date: string | null }[]
      const hist = (histRes.data ?? []) as { hospital: string; visit_date: string; doctor: string | null; chief_complaint: string | null }[]

      const latestDate = labs.length > 0 ? labs[0].test_date : ''
      const latestLabs = labs.filter(l => l.test_date === latestDate)
      const abnormal   = latestLabs.filter(l => l.status !== 'normal')
      const soon = new Date(); soon.setDate(soon.getDate() + 60)

      setHealth({
        lastDtx: dtx[0]?.value ?? null, prevDtx: dtx[1]?.value ?? null,
        lastBp: bp[0] ?? null, prevBpSystolic: bp[1]?.systolic ?? null,
        weight: profile?.weight ?? null, height: profile?.height ?? null,
        todayMeds: meds,
        abnormalLabs: abnormal.slice(0, 4),
        latestLabDate: latestDate, latestLabHospital: latestLabs[0]?.hospital ?? '',
        dueSoonVaccines: vacs.filter(v => v.next_due_date && new Date(v.next_due_date) <= soon).slice(0, 2),
        lastVisit: hist[0] ?? null,
      })
      setLoadingData(false)
    }
    load()
  }, [user, authLoading, router])

  if (authLoading || loadingData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  const bmi     = (health.weight && health.height) ? (health.weight / ((health.height / 100) ** 2)).toFixed(1) : null
  const bpSt    = health.lastBp ? getBpSt(health.lastBp.systolic) : null
  const dtxSt   = health.lastDtx != null ? getDtxSt(health.lastDtx) : null
  const bmiSt   = bmi ? getBmiSt(parseFloat(bmi)) : null
  const bpTrend = health.lastBp ? getTrend(health.lastBp.systolic, health.prevBpSystolic) : null
  const dtxTrend= health.lastDtx != null ? getTrend(health.lastDtx, health.prevDtx) : null
  const hasVitals = health.lastBp || health.lastDtx != null || bmi

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-8 space-y-5">

      {/* Greeting */}
      <div>
        <p className="text-sm text-[var(--muted)]">{firstName ? `สวัสดี, ${firstName}` : 'สวัสดี'}</p>
        <h1 className="text-xl font-bold">{'หน้าหลัก'}</h1>
      </div>

      {/* ── Vital Signs ── */}
      {hasVitals && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">{'ค่าสุขภาพล่าสุด'}</h2>
            <button onClick={() => router.push('/health-book/record')} className="text-xs text-[var(--hw-green)]">{'บันทึก →'}</button>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
            <div className="grid grid-cols-2 gap-2">
              {health.lastBp && bpSt && (
                <button className={'rounded-xl p-3 text-left w-full ' + bpSt.bg} onClick={() => router.push('/health-book/record')}>
                  <p className="text-xs text-[var(--muted)] mb-1">{'ความดัน'}</p>
                  <p className={'text-lg font-bold ' + bpSt.color}>
                    {health.lastBp.systolic}/{health.lastBp.diastolic}
                    <span className="text-xs font-normal text-[var(--muted)] ml-1">{'mmHg'}</span>
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + bpSt.badge}>{bpSt.label}</span>
                    {bpTrend && <span className={'text-xs flex items-center gap-0.5 ' + bpTrend.color}><bpTrend.Icon size={12}/>{bpTrend.text}</span>}
                  </div>
                </button>
              )}
              {health.lastBp?.pulse && (
                <button className="rounded-xl p-3 bg-[var(--hw-mint-bg)] text-left w-full" onClick={() => router.push('/health-book/record')}>
                  <p className="text-xs text-[var(--muted)] mb-1">{'ชีพจร'}</p>
                  <p className="text-lg font-bold text-[var(--hw-green)]">
                    {health.lastBp.pulse}<span className="text-xs font-normal text-[var(--muted)] ml-1">{'bpm'}</span>
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--hw-mint-bg)] text-[var(--hw-green)] mt-1 inline-block">
                    {health.lastBp.pulse >= 60 && health.lastBp.pulse <= 100 ? 'ปกติ' : 'ผิดปกติ'}
                  </span>
                </button>
              )}
              {health.lastDtx != null && dtxSt && (
                <button className={'rounded-xl p-3 text-left w-full ' + dtxSt.bg} onClick={() => router.push('/health-book/record')}>
                  <p className="text-xs text-[var(--muted)] mb-1">{'น้ำตาล'}</p>
                  <p className={'text-lg font-bold ' + dtxSt.color}>
                    {health.lastDtx}<span className="text-xs font-normal text-[var(--muted)] ml-1">{'mg/dL'}</span>
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
                    {health.weight && <span className="text-xs text-[var(--muted)]">{health.weight}{' kg'}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── แชทกับคลินิก ── */}
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

      {/* ── ยาวันนี้ ── */}
      {health.todayMeds.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">{'ยาที่ต้องกินวันนี้'}</h2>
            <button onClick={() => router.push('/health-book/meds')} className="text-xs text-[var(--hw-green)]">{'ดูทั้งหมด'}</button>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 space-y-2">
            {health.todayMeds.map((med, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
                <div className="w-2 h-2 rounded-full bg-[var(--hw-orange)] flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{med.name}</p>
                  {med.dosage && <p className="text-xs text-[var(--muted)]">{med.dosage}</p>}
                </div>
                {med.times && med.times.length > 0 && (
                  <span className="text-xs bg-[var(--hw-peach-bg)] text-[var(--hw-orange)] px-2 py-0.5 rounded-full flex-shrink-0">
                    {'⏰ '}{med.times[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── นัดหมาย ── */}
      {upcoming.length > 0 ? (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconCalendarClock size={16} className="text-[var(--hw-green)]" />
            <h2 className="font-semibold text-sm">{'นัดหมายที่กำลังจะมา'}</h2>
          </div>
          <div className="space-y-2">
            {upcoming.map(a => {
              const dt = new Date(a.scheduled_at)
              const cfg = APPT_CFG[a.status] ?? APPT_CFG.pending
              const isNow = Math.abs(dt.getTime() - Date.now()) < 30 * 60000
              return (
                <div key={a.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
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
                  {(a.status === 'confirmed' || isNow) && (
                    <Link href={`/consult/${a.id}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold text-white"
                      style={{ background: 'var(--hw-green)' }}>
                      <IconVideo size={16} />{'เข้าห้องปรึกษา'}
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

      {/* ── ผลตรวจผิดปกติ ── */}
      {health.abnormalLabs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-sm">{'ผลตรวจที่ควรติดตาม'}</h2>
              {health.latestLabDate && (
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {new Date(health.latestLabDate).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  {health.latestLabHospital ? ' · ' + health.latestLabHospital : ''}
                </p>
              )}
            </div>
            <button onClick={() => router.push('/health-book/lab')} className="text-xs text-[var(--hw-green)]">{'ดูทั้งหมด'}</button>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 space-y-1.5">
            {health.abnormalLabs.map((lab, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-[var(--border)] last:border-0">
                <p className="text-sm">{lab.test_name}</p>
                <span className={`text-sm font-bold ${lab.status === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
                  {lab.value}{' '}{lab.unit}{' ↑'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── วัคซีนใกล้ครบกำหนด ── */}
      {health.dueSoonVaccines.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">{'วัคซีนใกล้ครบกำหนด'}</h2>
            <button onClick={() => router.push('/health-book/meds')} className="text-xs text-[var(--hw-green)]">{'ดูทั้งหมด'}</button>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
            {health.dueSoonVaccines.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                <p className="text-sm">{v.vaccine_name}</p>
                {v.next_due_date && (
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                    {'ครบ '}{new Date(v.next_due_date).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── ครั้งล่าสุดที่ไปหาหมอ ── */}
      {health.lastVisit && (
        <button className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 text-left"
          onClick={() => router.push('/health-book/record')}>
          <h2 className="font-semibold text-sm mb-3">{'ครั้งล่าสุดที่ไปหาหมอ'}</h2>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">{'🏥'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{health.lastVisit.hospital}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {new Date(health.lastVisit.visit_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                {health.lastVisit.doctor ? ' · ' + health.lastVisit.doctor : ''}
              </p>
              {health.lastVisit.chief_complaint && <p className="text-xs text-[var(--muted)] mt-0.5">{health.lastVisit.chief_complaint}</p>}
            </div>
            <IconChevronRight size={16} className="text-[var(--muted)] flex-shrink-0 mt-1"/>
          </div>
        </button>
      )}

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

      {/* ── ข้อมูลคลินิก ── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">{'คลินิก'}</h2>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 text-sm space-y-2">
          <div className="font-semibold">{'แฮปปี้เวลล์ คลินิกเวชกรรม'}</div>
          <div className="text-xs text-[var(--muted)]">{'ใบอนุญาตประกอบกิจการ: 10101035068'}</div>
          <a href="https://maps.app.goo.gl/vyo3zyNqkSrcYMmC8" target="_blank" rel="noopener noreferrer"
            className="flex items-start gap-1.5 text-xs text-[#185fa5] hover:underline">
            <span className="mt-px">{'📍'}</span>
            <span>{'เลขที่ 193, 195 ชั้น 1 ถนนประชาอุทิศ ตำบลบางมด อำเภอทุ่งครุ กรุงเทพฯ'}</span>
          </a>
          <div className="text-xs text-[var(--muted)]">{'จ–ศ 08:00–18:00 · ส–อา 08:00–12:00'}</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <a href="tel:020004586" className="flex items-center gap-1.5 bg-[#e6f1fb] text-[#185fa5] px-3 py-1.5 rounded-full text-xs font-medium">{'📞 02-000-4586'}</a>
            <a href="https://line.me/R/ti/p/@p49clinic" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#e8f7f3] text-[#1a8a6e] px-3 py-1.5 rounded-full text-xs font-medium">{'Line @p49clinic'}</a>
            <a href="https://maps.app.goo.gl/vyo3zyNqkSrcYMmC8" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#faeeda] text-[#c47f00] px-3 py-1.5 rounded-full text-xs font-medium">{'🗺️ Google Maps'}</a>
          </div>
        </div>
      </section>
    </div>
  )
}
