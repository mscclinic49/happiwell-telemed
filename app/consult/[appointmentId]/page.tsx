'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DailyIframe, { DailyCall } from '@daily-co/daily-js'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type Role = 'patient' | 'doctor' | null

type Vitals = {
  weight_kg: number | null; height_cm: number | null
  bp_systolic: number | null; bp_diastolic: number | null; pulse: number | null
  rr: number | null; spo2: number | null; temperature: number | null; dtx: number | null
  drug_allergy: string | null; cc: string | null
}

type PatientInfo = {
  full_name: string | null; first_name: string | null; last_name: string | null
  title: string | null; date_of_birth: string | null; blood_type: string | null
}

function calcAge(dob: string | null) {
  if (!dob) return null
  const d = new Date(dob), now = new Date()
  let y = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) y--
  return y
}

function VRow({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-white/10 last:border-0">
      <span className="text-xs text-white/60">{label}</span>
      <span className="text-sm font-semibold text-white">{value}{unit ? <span className="text-xs font-normal text-white/60 ml-1">{unit}</span> : null}</span>
    </div>
  )
}

function DoctorVitalsPanel({ patientId }: { patientId: string }) {
  const [info, setInfo] = useState<PatientInfo | null>(null)
  const [vitals, setVitals] = useState<Vitals | null>(null)

  useEffect(() => {
    if (!patientId) return
    Promise.all([
      supabase.from('hw_users')
        .select('full_name, first_name, last_name, title, date_of_birth, blood_type')
        .eq('id', patientId).single(),
      supabase.from('hw_vitals')
        .select('weight_kg,height_cm,bp_systolic,bp_diastolic,pulse,rr,spo2,temperature,dtx,drug_allergy,cc')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([uRes, vRes]) => {
      if (uRes.data) setInfo(uRes.data as PatientInfo)
      if (vRes.data) setVitals(vRes.data as Vitals)
    })
  }, [patientId])

  const bmi = vitals?.weight_kg && vitals?.height_cm
    ? (vitals.weight_kg / Math.pow(vitals.height_cm / 100, 2)).toFixed(1)
    : null

  const name = info
    ? `${info.title ?? ''}${info.first_name ?? info.full_name ?? ''} ${info.last_name ?? ''}`.trim()
    : '...'

  return (
    <div className="w-64 flex-shrink-0 flex flex-col h-full overflow-y-auto"
      style={{ background: 'rgba(15,17,21,0.92)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Patient header */}
      <div className="px-4 py-3 border-b border-white/10" style={{ background: 'var(--hw-green)' }}>
        <p className="text-xs text-white/70 font-medium uppercase tracking-wider">{'ผู้รับบริการ'}</p>
        <p className="text-sm font-bold text-white mt-0.5 leading-snug">{name}</p>
        {info && (
          <div className="flex gap-2 mt-1">
            {calcAge(info.date_of_birth) && (
              <span className="text-xs text-white/80">{`${calcAge(info.date_of_birth)} ปี`}</span>
            )}
            {info.blood_type && (
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded font-bold text-white">{`หมู่ ${info.blood_type}`}</span>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3 space-y-3 flex-1">
        {!vitals ? (
          <p className="text-xs text-white/40 text-center pt-4">{'ยังไม่มีข้อมูล Vitals'}</p>
        ) : (
          <>
            {/* Vitals */}
            <div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{'สัญญาณชีพ'}</p>
              {vitals.bp_systolic && vitals.bp_diastolic && (
                <VRow label="ความดัน" value={`${vitals.bp_systolic}/${vitals.bp_diastolic}`} unit="mmHg" />
              )}
              <VRow label="ชีพจร" value={vitals.pulse} unit="bpm" />
              <VRow label="RR" value={vitals.rr} unit="/min" />
              <VRow label="SpO2" value={vitals.spo2} unit="%" />
              <VRow label="อุณหภูมิ" value={vitals.temperature} unit="°C" />
              <VRow label="Dtx" value={vitals.dtx} unit="mg/dL" />
              <VRow label="น้ำหนัก" value={vitals.weight_kg} unit="kg" />
              <VRow label="ส่วนสูง" value={vitals.height_cm} unit="cm" />
              {bmi && <VRow label="BMI" value={bmi} />}
            </div>

            {/* Drug allergy */}
            {vitals.drug_allergy && (
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{'การแพ้ยา'}</p>
                <p className="text-xs text-red-300 leading-relaxed">{vitals.drug_allergy}</p>
              </div>
            )}

            {/* CC */}
            {vitals.cc && (
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{'CC (อาการสำคัญ)'}</p>
                <p className="text-xs text-white/80 leading-relaxed">{vitals.cc}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ConsultPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const appointmentId = params.appointmentId as string

  const callRef = useRef<DailyCall | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [role, setRole] = useState<Role>(null)
  const [patientUserId, setPatientUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'consent' | 'doctor-verify' | 'joining' | 'in-call' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [identityConfirmed, setIdentityConfirmed] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return

    async function detectRole() {
      const { data: appt } = await supabase
        .from('hw_appointments')
        .select('user_id, hw_doctors!inner(user_id)')
        .eq('id', appointmentId)
        .single()

      if (!appt) { setError('ไม่พบข้อมูลการนัดหมาย'); setStatus('error'); return }

      const doctorUserId = (appt.hw_doctors as unknown as { user_id: string | null })?.user_id
      const detectedRole: Role = doctorUserId === user!.id ? 'doctor' : 'patient'
      setRole(detectedRole)
      setPatientUserId(appt.user_id)
      setStatus(detectedRole === 'doctor' ? 'doctor-verify' : 'consent')
    }

    detectRole()
  }, [user, authLoading, appointmentId])

  async function cleanupCall() {
    if (callRef.current) {
      try { await callRef.current.destroy() } catch { /* ignore */ }
      callRef.current = null
    }
  }

  async function createAndJoinRoom() {
    await cleanupCall()
    setStatus('joining')
    setError(null)

    try {
      const res = await fetch('/api/video/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create room')

      setRoomUrl(data.roomUrl)
      await new Promise(r => setTimeout(r, 200))
      if (!containerRef.current) throw new Error('Container not ready')

      const callFrame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: { width: '100%', height: '100%', border: '0' },
        showLeaveButton: true,
      })
      callRef.current = callFrame

      callFrame.on('left-meeting', async () => { await cleanupCall(); setStatus(role === 'doctor' ? 'doctor-verify' : 'consent') })
      callFrame.on('joined-meeting', () => setStatus('in-call'))
      callFrame.on('error', (e) => { setError('เกิดข้อผิดพลาด: ' + (e?.errorMsg || 'unknown')); setStatus('error'); })

      await callFrame.join({ url: data.roomUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
      await cleanupCall()
    }
  }

  async function handleDoctorVerify() {
    if (!identityConfirmed) return
    setVerifying(true)
    const res = await fetch('/api/consultation/verify-identity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error || 'เกิดข้อผิดพลาด'); setStatus('error'); return }
    setVerifying(false)
    await createAndJoinRoom()
  }

  async function handleCancelUnverified() {
    if (!confirm('ยืนยันการยกเลิก? การนัดหมายจะถูกยกเลิกทันที')) return
    setCancelling(true)
    await fetch('/api/consultation/cancel-unverified', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    })
    router.push('/')
  }

  useEffect(() => () => { cleanupCall() }, [])

  if (authLoading || status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">{'กำลังโหลด...'}</div>
  }

  const isInCall = status === 'in-call' || status === 'joining'

  return (
    <main className="min-h-screen bg-black">

      {/* ── In-call layout ── */}
      {isInCall && (
        <div className="flex h-screen">
          {/* Vitals panel — doctor only */}
          {role === 'doctor' && patientUserId && (
            <DoctorVitalsPanel patientId={patientUserId} />
          )}
          {/* Video */}
          <div ref={containerRef} className="flex-1 h-full bg-black" />
        </div>
      )}

      {/* ── Pre-call screens (video container still needed for joining state) ── */}
      {!isInCall && <div ref={containerRef} className="hidden" />}

      {/* Patient consent */}
      {status === 'consent' && (
        <div className="p-6 max-w-md mx-auto">
          <a href="/" className="text-[var(--hw-blue)] mb-4 inline-block">{'← กลับ'}</a>
          <h1 className="text-2xl font-bold mb-4">{'เตรียมเข้าห้องปรึกษา'}</h1>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mb-4">
            <h2 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">{'⚠️ การยินยอมบันทึกวิดีโอ'}</h2>
            <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1 list-disc list-inside">
              <li>{'การปรึกษานี้อาจถูกบันทึกเพื่อเก็บเป็นเวชระเบียน'}</li>
              <li>{'ข้อมูลจะถูกเก็บรักษาตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)'}</li>
            </ul>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 mb-6">
            <h2 className="font-semibold mb-2">{'ก่อนเข้าห้อง โปรดตรวจสอบ:'}</h2>
            <ul className="text-sm text-[var(--muted)] space-y-1">
              <li>{'✓ กล้องและไมโครโฟนทำงานปกติ'}</li>
              <li>{'✓ อินเทอร์เน็ตเสถียร'}</li>
              <li>{'✓ อยู่ในที่เงียบและเป็นส่วนตัว'}</li>
            </ul>
          </div>
          <button onClick={createAndJoinRoom}
            className="w-full text-white py-3 rounded-full font-medium hover:opacity-90"
            style={{ background: 'var(--hw-green)' }}>
            {'ยินยอมและเข้าห้องปรึกษา'}
          </button>
        </div>
      )}

      {/* Doctor identity verification */}
      {status === 'doctor-verify' && (
        <div className="p-6 max-w-md mx-auto">
          <a href="/doctor/appointments" className="text-[var(--hw-blue)] mb-4 inline-block">{'← กลับ'}</a>
          <h1 className="text-2xl font-bold mb-1">{'ยืนยันตัวตนคนไข้'}</h1>
          <p className="text-sm text-[var(--muted)] mb-6">{'ก่อนเริ่มการปรึกษา กรุณายืนยันว่าได้ตรวจสอบตัวตนคนไข้แล้ว'}</p>
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={identityConfirmed}
                onChange={e => setIdentityConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{'ข้าพเจ้าได้ตรวจสอบยืนยันตัวตนคนไข้แล้ว โดยข้อมูลตรงกับที่ลงทะเบียนไว้ในระบบ'}</span>
            </label>
          </div>
          <div className="space-y-3">
            <button onClick={handleDoctorVerify} disabled={!identityConfirmed || verifying}
              className="w-full text-white py-3 rounded-full font-medium hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--hw-green)' }}>
              {verifying ? 'กำลังยืนยัน...' : 'ยืนยันและเริ่มการปรึกษา'}
            </button>
            <button onClick={handleCancelUnverified} disabled={cancelling}
              className="w-full border border-red-300 dark:border-red-700 text-red-500 py-3 rounded-full font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40">
              {cancelling ? 'กำลังยกเลิก...' : 'ไม่สามารถยืนยันตัวตนได้ — ยกเลิกการปรึกษา'}
            </button>
          </div>
        </div>
      )}

      {/* Joining overlay */}
      {status === 'joining' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 z-50">
          <div className="text-4xl mb-4">{'⏳'}</div>
          <p className="text-white mb-4">{'กำลังเข้าห้องปรึกษา...'}</p>
          {roomUrl && (
            <a href={roomUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline text-sm">
              {'เปิดในแท็บใหม่ (ถ้าค้างนาน)'}
            </a>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="p-6 max-w-md mx-auto">
          <a href="/" className="text-[var(--hw-blue)] mb-4 inline-block">{'← กลับ'}</a>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-4">
            <h2 className="font-semibold text-red-600 mb-2">{'เกิดข้อผิดพลาด'}</h2>
            <p className="text-sm text-red-500">{error}</p>
          </div>
          <button onClick={() => { setStatus(role === 'doctor' ? 'doctor-verify' : 'consent'); setError(null) }}
            className="w-full text-white py-3 rounded-full font-medium hover:opacity-90"
            style={{ background: 'var(--hw-green)' }}>
            {'ลองอีกครั้ง'}
          </button>
        </div>
      )}
    </main>
  )
}
