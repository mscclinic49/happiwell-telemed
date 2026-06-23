'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import {
  IconTrendingUp, IconTrendingDown, IconMinus, IconChevronRight,
} from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Data = {
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

const EMPTY: Data = {
  lastDtx: null, prevDtx: null, lastBp: null, prevBpSystolic: null,
  weight: null, height: null, todayMeds: [], abnormalLabs: [],
  latestLabDate: '', latestLabHospital: '', dueSoonVaccines: [], lastVisit: null,
}

const getBpStatus = (s: number) => {
  if (s <= 120) return { label: 'ปกติ', color: 'text-[var(--hw-green)]', bg: 'bg-[var(--hw-mint-bg)]', badge: 'bg-[var(--hw-mint-bg)] text-[var(--hw-green)]' }
  if (s <= 139) return { label: 'ระวัง', color: 'text-yellow-600', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' }
  return { label: 'สูง', color: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' }
}

const getDtxStatus = (v: number) => {
  if (v <= 99) return { label: 'ปกติ', color: 'text-[var(--hw-green)]', bg: 'bg-[var(--hw-mint-bg)]', badge: 'bg-[var(--hw-mint-bg)] text-[var(--hw-green)]' }
  if (v <= 125) return { label: 'ระวัง', color: 'text-yellow-600', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' }
  return { label: 'สูง', color: 'text-red-600', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' }
}

const getBMIStatus = (bmi: number) => {
  if (bmi < 23) return { label: 'ปกติ', color: 'text-[var(--hw-green)]', badge: 'bg-[var(--hw-mint-bg)] text-[var(--hw-green)]' }
  if (bmi < 25) return { label: 'น้ำหนักเกิน', color: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' }
  return { label: 'อ้วน', color: 'text-red-600', badge: 'bg-red-100 text-red-700' }
}

const getTrend = (cur: number, prev: number | null) => {
  if (!prev) return null
  const d = cur - prev
  if (Math.abs(d) < 1) return { Icon: IconMinus, color: 'text-[var(--muted)]', text: '' }
  if (d > 0) return { Icon: IconTrendingUp, color: 'text-red-400', text: '+' + d.toFixed(0) }
  return { Icon: IconTrendingDown, color: 'text-[var(--hw-green)]', text: d.toFixed(0) }
}

export default function HealthBookDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [data, setData] = useState<Data>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [dtxRes, bpRes, labRes, medsRes, vacRes, histRes, profileRes] = await Promise.all([
        sb.from('hw_dtx_records').select('value').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(2),
        sb.from('hw_bp_records').select('systolic,diastolic,pulse').eq('user_id', user!.id).order('measured_at', { ascending: false }).limit(2),
        sb.from('hw_lab_results').select('test_name,value,unit,status,test_date,hospital').eq('user_id', user!.id).eq('approval_status', 'approved').order('test_date', { ascending: false }).limit(30),
        sb.from('hw_medications').select('name,times,dosage').eq('user_id', user!.id).eq('is_active', true).eq('status', 'approved').limit(5),
        sb.from('hw_vaccines').select('vaccine_name,next_due_date').eq('user_id', user!.id).eq('status', 'approved'),
        sb.from('hw_medical_history').select('hospital,visit_date,doctor,chief_complaint').eq('user_id', user!.id).eq('status', 'approved').order('visit_date', { ascending: false }).limit(1),
        sb.from('hw_users').select('first_name,weight,height').eq('id', user!.id).single(),
      ])

      const dtx = (dtxRes.data ?? []) as { value: number }[]
      const bp = (bpRes.data ?? []) as { systolic: number; diastolic: number; pulse: number | null }[]
      const labs = (labRes.data ?? []) as { test_name: string; value: number | null; unit: string | null; status: string; test_date: string; hospital: string | null }[]
      const meds = (medsRes.data ?? []) as { name: string; times: string[] | null; dosage: string | null }[]
      const vacs = (vacRes.data ?? []) as { vaccine_name: string; next_due_date: string | null }[]
      const hist = (histRes.data ?? []) as { hospital: string; visit_date: string; doctor: string | null; chief_complaint: string | null }[]
      const profile = profileRes.data as { first_name: string | null; weight: number | null; height: number | null } | null

      if (profile?.first_name) setFirstName(profile.first_name)

      const latestDate = labs.length > 0 ? labs[0].test_date : ''
      const latestLabs = labs.filter(l => l.test_date === latestDate)
      const abnormal = latestLabs.filter(l => l.status !== 'normal')

      const soon = new Date(); soon.setDate(soon.getDate() + 60)
      const dueSoon = vacs.filter(v => v.next_due_date && new Date(v.next_due_date) <= soon)

      setData({
        lastDtx: dtx[0]?.value ?? null,
        prevDtx: dtx[1]?.value ?? null,
        lastBp: bp[0] ?? null,
        prevBpSystolic: bp[1]?.systolic ?? null,
        weight: profile?.weight ?? null,
        height: profile?.height ?? null,
        todayMeds: meds,
        abnormalLabs: abnormal.slice(0, 4),
        latestLabDate: latestDate,
        latestLabHospital: latestLabs[0]?.hospital ?? '',
        dueSoonVaccines: dueSoon.slice(0, 2),
        lastVisit: hist[0] ?? null,
      })
      setLoading(false)
    }
    load()
  }, [user])

  const bmi = (data.weight && data.height)
    ? (data.weight / ((data.height / 100) ** 2)).toFixed(1) : null

  const bpSt = data.lastBp ? getBpStatus(data.lastBp.systolic) : null
  const dtxSt = data.lastDtx != null ? getDtxStatus(data.lastDtx) : null
  const bmiSt = bmi ? getBMIStatus(parseFloat(bmi)) : null
  const bpTrend = data.lastBp ? getTrend(data.lastBp.systolic, data.prevBpSystolic) : null
  const dtxTrend = data.lastDtx != null ? getTrend(data.lastDtx, data.prevDtx) : null
  const hasVitals = data.lastBp || data.lastDtx != null || bmi
  const hasData = hasVitals || data.todayMeds.length > 0 || data.abnormalLabs.length > 0 || data.lastVisit

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-10 space-y-5">

      {/* Header */}
      <div>
        <p className="text-sm text-[var(--muted)]">สวัสดี{firstName ? `, ${firstName}` : ''}</p>
        <h1 className="text-xl font-bold">{'สมุดสุขภาพ'}</h1>
      </div>

      {/* Shortcut tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'น้ำตาล/ความดัน', href: '/health-book/record' },
          { label: 'ผลตรวจเลือด', href: '/health-book/lab' },
          { label: 'ยา/วัคซีน', href: '/health-book/meds' },
        ].map(t => (
          <button key={t.href} onClick={() => router.push(t.href)}
            className="px-4 py-2 rounded-full text-sm font-medium border border-[var(--border)] text-[var(--muted)] hover:border-[var(--hw-green)] hover:text-[var(--hw-green)] transition-colors">
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">

        {/* Vital Signs */}
        {hasVitals && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">{'Vital Signs'}</p>
            <div className="grid grid-cols-2 gap-2">
              {data.lastBp && bpSt && (
                <button className={"rounded-xl p-3 text-left w-full " + bpSt.bg} onClick={() => router.push('/health-book/record')}>
                  <p className="text-xs text-[var(--muted)] mb-1">{'ความดัน'}</p>
                  <p className={"text-lg font-bold " + bpSt.color}>
                    {data.lastBp.systolic}/{data.lastBp.diastolic}
                    <span className="text-xs font-normal text-[var(--muted)] ml-1">{'mmHg'}</span>
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={"text-xs px-2 py-0.5 rounded-full " + bpSt.badge}>{bpSt.label}</span>
                    {bpTrend && <span className={"text-xs flex items-center gap-0.5 " + bpTrend.color}><bpTrend.Icon size={12}/>{bpTrend.text}</span>}
                  </div>
                </button>
              )}
              {data.lastBp?.pulse && (
                <button className="rounded-xl p-3 bg-[var(--hw-mint-bg)] text-left w-full" onClick={() => router.push('/health-book/record')}>
                  <p className="text-xs text-[var(--muted)] mb-1">{'ชีพจร'}</p>
                  <p className="text-lg font-bold text-[var(--hw-green)]">
                    {data.lastBp.pulse}
                    <span className="text-xs font-normal text-[var(--muted)] ml-1">{'bpm'}</span>
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--hw-mint-bg)] text-[var(--hw-green)] mt-1 inline-block">
                    {data.lastBp.pulse >= 60 && data.lastBp.pulse <= 100 ? 'ปกติ' : 'ผิดปกติ'}
                  </span>
                </button>
              )}
              {data.lastDtx != null && dtxSt && (
                <button className={"rounded-xl p-3 text-left w-full " + dtxSt.bg} onClick={() => router.push('/health-book/record')}>
                  <p className="text-xs text-[var(--muted)] mb-1">{'น้ำตาล'}</p>
                  <p className={"text-lg font-bold " + dtxSt.color}>
                    {data.lastDtx}
                    <span className="text-xs font-normal text-[var(--muted)] ml-1">{'mg/dL'}</span>
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={"text-xs px-2 py-0.5 rounded-full " + dtxSt.badge}>{dtxSt.label}</span>
                    {dtxTrend && <span className={"text-xs flex items-center gap-0.5 " + dtxTrend.color}><dtxTrend.Icon size={12}/>{dtxTrend.text}</span>}
                  </div>
                </button>
              )}
              {bmi && bmiSt && (
                <div className="rounded-xl p-3 bg-purple-50">
                  <p className="text-xs text-[var(--muted)] mb-1">{'BMI'}</p>
                  <p className={"text-lg font-bold " + bmiSt.color}>{bmi}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={"text-xs px-2 py-0.5 rounded-full " + bmiSt.badge}>{bmiSt.label}</span>
                    {data.weight && <span className="text-xs text-[var(--muted)]">{data.weight} kg</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ยาวันนี้ */}
        {data.todayMeds.length > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">{'💊 ยาวันนี้'}</p>
              <button onClick={() => router.push('/health-book/meds')} className="text-xs text-[var(--hw-green)]">{'ดูทั้งหมด'}</button>
            </div>
            <div className="space-y-2">
              {data.todayMeds.map((med, i) => (
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
          </div>
        )}

        {/* ผลตรวจผิดปกติ */}
        {data.abnormalLabs.length > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">{'🔬 ผลตรวจล่าสุด'}</p>
                {data.latestLabDate && (
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {new Date(data.latestLabDate).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                    {data.latestLabHospital ? ' · ' + data.latestLabHospital : ''}
                  </p>
                )}
              </div>
              <button onClick={() => router.push('/health-book/lab')} className="text-xs text-[var(--hw-green)]">{'ดูทั้งหมด'}</button>
            </div>
            <div className="space-y-1.5">
              {data.abnormalLabs.map((lab, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-[var(--border)] last:border-0">
                  <p className="text-sm">{lab.test_name}</p>
                  <span className={`text-sm font-bold ${lab.status === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {lab.value} {lab.unit} {'↑'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* วัคซีนใกล้ครบกำหนด */}
        {data.dueSoonVaccines.length > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">{'💉 วัคซีนใกล้ครบกำหนด'}</p>
              <button onClick={() => router.push('/health-book/meds')} className="text-xs text-[var(--hw-green)]">{'ดูทั้งหมด'}</button>
            </div>
            {data.dueSoonVaccines.map((v, i) => (
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
        )}

        {/* ครั้งล่าสุดที่ไปหาหมอ */}
        {data.lastVisit && (
          <button className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 text-left"
            onClick={() => router.push('/health-book/record')}>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">{'🏥 ครั้งล่าสุดที่ไปหาหมอ'}</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[var(--hw-blue-bg)] rounded-xl flex items-center justify-center flex-shrink-0 text-lg">{'🏥'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{data.lastVisit.hospital}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {new Date(data.lastVisit.visit_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  {data.lastVisit.doctor ? ' · ' + data.lastVisit.doctor : ''}
                </p>
                {data.lastVisit.chief_complaint && <p className="text-xs text-[var(--muted)] mt-0.5">{data.lastVisit.chief_complaint}</p>}
              </div>
              <IconChevronRight size={16} className="text-[var(--muted)] flex-shrink-0"/>
            </div>
          </button>
        )}

        {/* Empty state */}
        {!hasData && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">{'📓'}</p>
            <p className="text-[var(--muted)] font-medium">{'ยังไม่มีข้อมูลสุขภาพ'}</p>
            <p className="text-[var(--muted)] text-sm mt-1">{'เริ่มบันทึกได้ที่ "น้ำตาล/ความดัน" ด้านบน'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
