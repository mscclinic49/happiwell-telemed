'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import {
  IconArrowLeft, IconPill, IconTrash, IconPlus,
  IconCheck, IconUser, IconPhone, IconVideo, IconChevronDown,
} from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Appt = {
  id: string; scheduled_at: string; status: string
  symptoms: string | null; notes: string | null
  hw_users: {
    id: string; full_name: string | null; first_name: string | null
    date_of_birth: string | null; gender: string | null
    phone: string | null; allergies: string | null
    blood_type: string | null; weight: number | null; height: number | null
  } | null
  hw_doctors: { id: string } | null
}

type RxItem = { id?: string; drug_name: string; dosage: string; frequency: string; duration: string; instructions: string; quantity: string }
type Vitals = {
  bp_systolic: number | null; bp_diastolic: number | null; pulse: number | null
  rr: number | null; spo2: number | null; temperature: number | null; dtx: number | null
  drug_allergy: string | null; cc: string | null
}

const EMPTY_ITEM = (): RxItem => ({ drug_name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' })

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก',
}
const GENDER: Record<string, string> = { male: 'ชาย', female: 'หญิง', other: 'อื่น' }

function calcAge(dob: string | null) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
}

export default function ConsultationPage() {
  const { id: apptId } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [appt, setAppt] = useState<Appt | null>(null)
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Video call
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [startingCall, setStartingCall] = useState(false)
  const [callError, setCallError] = useState<string | null>(null)

  // Rx
  const [diagnosis, setDiagnosis] = useState('')
  const [rxNotes, setRxNotes] = useState('')
  const [rxItems, setRxItems] = useState<RxItem[]>([EMPTY_ITEM()])
  const [savingRx, setSavingRx] = useState(false)
  const [rxSaved, setRxSaved] = useState(false)
  const [existingRxId, setExistingRxId] = useState<string | null>(null)

  const [tab, setTab] = useState<'video' | 'rx'>('video')
  const [vitals, setVitals] = useState<Vitals | null>(null)

  // Load appointment + doctor
  useEffect(() => {
    if (!user) return
    Promise.all([
      sb.from('hw_doctors').select('id').eq('user_id', user.id).single(),
      sb.from('hw_appointments')
        .select('id, scheduled_at, status, symptoms, notes, hw_users(id,full_name,first_name,date_of_birth,gender,phone,allergies,blood_type,weight,height), hw_doctors(id)')
        .eq('id', apptId).single(),
    ]).then(([doc, apptRes]) => {
      if (doc.data) setDoctorId(doc.data.id)
      if (apptRes.data) {
        setAppt(apptRes.data as unknown as Appt)
        const patientId = (apptRes.data as unknown as Appt).hw_users?.id
        if (patientId) {
          sb.from('hw_vitals')
            .select('bp_systolic,bp_diastolic,pulse,rr,spo2,temperature,dtx,drug_allergy,cc')
            .eq('patient_id', patientId)
            .order('recorded_at', { ascending: false }).limit(1).maybeSingle()
            .then(({ data }) => { if (data) setVitals(data as Vitals) })
        }
      }
      setLoading(false)
    })
  }, [user, apptId])

  // Load existing room URL
  useEffect(() => {
    if (!apptId) return
    sb.from('hw_consultations').select('room_url').eq('appointment_id', apptId).maybeSingle()
      .then(({ data }) => { if (data?.room_url) setRoomUrl(data.room_url) })
  }, [apptId])

  // Load existing Rx
  useEffect(() => {
    if (!doctorId || !apptId) return
    sb.from('hw_rx')
      .select('id, diagnosis, notes, hw_rx_items(id, drug_name, dosage, frequency, duration, instructions, quantity, sort_order)')
      .eq('appointment_id', apptId).eq('doctor_id', doctorId).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setExistingRxId(data.id)
        setDiagnosis(data.diagnosis ?? '')
        setRxNotes(data.notes ?? '')
        const items = ((data as unknown as { hw_rx_items: (RxItem & { sort_order: number })[] }).hw_rx_items ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(i => ({ ...i, quantity: String(i.quantity ?? '') }))
        if (items.length > 0) setRxItems(items)
      })
  }, [doctorId, apptId])

  async function startCall() {
    setStartingCall(true)
    setCallError(null)
    try {
      const res = await fetch('/api/video/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: apptId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'เกิดข้อผิดพลาด')
      setRoomUrl(json.roomUrl)
    } catch (e) {
      setCallError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    }
    setStartingCall(false)
  }

  async function updateStatus(status: string) {
    setUpdatingStatus(true)
    await sb.from('hw_appointments').update({ status }).eq('id', apptId)
    setAppt(prev => prev ? { ...prev, status } : prev)
    setUpdatingStatus(false)
  }

  async function saveRx() {
    if (!doctorId || !appt?.hw_users?.id) return
    setSavingRx(true)
    const validItems = rxItems.filter(i => i.drug_name.trim())

    if (existingRxId) {
      await sb.from('hw_rx').update({ diagnosis, notes: rxNotes }).eq('id', existingRxId)
      await sb.from('hw_rx_items').delete().eq('rx_id', existingRxId)
      if (validItems.length > 0) {
        await sb.from('hw_rx_items').insert(
          validItems.map((i, idx) => ({
            rx_id: existingRxId, drug_name: i.drug_name, dosage: i.dosage,
            frequency: i.frequency, duration: i.duration, instructions: i.instructions,
            quantity: i.quantity ? parseInt(i.quantity) : null, sort_order: idx,
          }))
        )
      }
    } else {
      const { data: rxData } = await sb.from('hw_rx').insert({
        appointment_id: apptId, patient_id: appt.hw_users!.id,
        doctor_id: doctorId, diagnosis, notes: rxNotes,
      }).select('id').single()
      if (rxData && validItems.length > 0) {
        setExistingRxId(rxData.id)
        await sb.from('hw_rx_items').insert(
          validItems.map((i, idx) => ({
            rx_id: rxData.id, drug_name: i.drug_name, dosage: i.dosage,
            frequency: i.frequency, duration: i.duration, instructions: i.instructions,
            quantity: i.quantity ? parseInt(i.quantity) : null, sort_order: idx,
          }))
        )
      }
    }
    setSavingRx(false)
    setRxSaved(true)
    setTimeout(() => setRxSaved(false), 2500)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-[#1a8a6e] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!appt) return <div className="p-8 text-center text-[var(--muted)]">{'ไม่พบนัดหมาย'}</div>

  const patient = appt.hw_users
  const patientName = patient?.full_name || patient?.first_name || '—'
  const age = calcAge(patient?.date_of_birth ?? null)
  const dt = new Date(appt.scheduled_at)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--card-bg)] border-b border-[var(--border)] flex-shrink-0">
        <button onClick={() => router.back()} className="p-1.5 -ml-1 text-[var(--muted)] hover:text-[var(--foreground)]">
          <IconArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base truncate text-[var(--foreground)]">{patientName}</div>
          <div className="text-xs text-[var(--muted)]">
            {dt.toLocaleDateString('th-TH', { dateStyle: 'medium' })} · {dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <select value={appt.status} disabled={updatingStatus}
            onChange={e => updateStatus(e.target.value)}
            className="text-xs pl-2 pr-6 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card-bg)] font-medium appearance-none cursor-pointer focus:outline-none">
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <IconChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT: Patient info */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-[var(--border)] overflow-y-auto bg-[var(--card-bg)]">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1a8a6e]/15 flex items-center justify-center flex-shrink-0">
                <IconUser size={22} className="text-[#1a8a6e]" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate text-[var(--foreground)]">{patientName}</div>
                <div className="text-xs text-[var(--muted)]">
                  {GENDER[patient?.gender ?? ''] ?? '—'}{age !== null ? ` · ${age} ปี` : ''}
                </div>
              </div>
            </div>

            {[
              { label: 'เบอร์โทร', value: patient?.phone },
              { label: 'กรุ๊ปเลือด', value: patient?.blood_type },
              { label: 'น้ำหนัก', value: patient?.weight ? `${patient.weight} กก.` : null },
              { label: 'ส่วนสูง', value: patient?.height ? `${patient.height} ซม.` : null },
            ].map(r => r.value ? (
              <div key={r.label} className="flex items-start gap-2">
                <span className="text-xs text-[var(--muted)] w-20 flex-shrink-0 pt-0.5">{r.label}</span>
                <span className="text-xs font-medium text-[var(--foreground)]">{r.value}</span>
              </div>
            ) : null)}

            {(vitals?.drug_allergy || patient?.allergies) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-[10px] p-3">
                <div className="text-xs font-semibold text-red-400 mb-1">{'แพ้ยา'}</div>
                <div className="text-xs text-[var(--foreground)]">{vitals?.drug_allergy || patient?.allergies}</div>
              </div>
            )}
            {appt.symptoms && (
              <div className="bg-[var(--background)] rounded-[10px] p-3">
                <div className="text-xs font-semibold text-[var(--muted)] mb-1 uppercase tracking-wide">{'อาการ'}</div>
                <div className="text-xs text-[var(--foreground)]">{appt.symptoms}</div>
              </div>
            )}

            {/* Vitals */}
            {vitals && (
              <div className="border-t border-[var(--border)] pt-3 space-y-1.5">
                <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">{'Vitals'}</div>
                {[
                  vitals.bp_systolic && vitals.bp_diastolic ? { label: 'ความดัน', value: `${vitals.bp_systolic}/${vitals.bp_diastolic}`, unit: 'mmHg' } : null,
                  vitals.pulse   ? { label: 'ชีพจร',    value: vitals.pulse,       unit: 'bpm'   } : null,
                  vitals.rr      ? { label: 'RR',        value: vitals.rr,          unit: '/min'  } : null,
                  vitals.spo2    ? { label: 'SpO2',      value: vitals.spo2,        unit: '%'     } : null,
                  vitals.temperature ? { label: 'อุณหภูมิ', value: vitals.temperature, unit: '°C' } : null,
                  vitals.dtx     ? { label: 'Dtx',       value: vitals.dtx,         unit: 'mg/dL' } : null,
                ].filter(Boolean).map(r => (
                  <div key={r!.label} className="flex justify-between items-baseline">
                    <span className="text-xs text-[var(--muted)]">{r!.label}</span>
                    <span className="text-xs font-semibold">{r!.value} <span className="text-[var(--muted)] font-normal">{r!.unit}</span></span>
                  </div>
                ))}
                {vitals.cc && (
                  <div className="bg-[var(--background)] rounded-[10px] p-2.5 mt-2">
                    <div className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">{'CC'}</div>
                    <div className="text-xs text-[var(--foreground)]">{vitals.cc}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER: Video call */}
        <div className={`flex flex-col flex-1 overflow-hidden min-w-0 ${tab === 'rx' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Mobile patient info strip */}
          <div className="lg:hidden px-4 py-2 bg-[var(--background)] border-b border-[var(--border)] text-xs text-[var(--muted)] flex gap-4">
            {patient?.phone && <span className="flex items-center gap-1"><IconPhone size={11} />{patient.phone}</span>}
            {patient?.allergies && <span className="text-red-400 truncate">{'แพ้: '}{patient.allergies}</span>}
          </div>

          {roomUrl ? (
            <iframe
              src={roomUrl}
              allow="camera; microphone; fullscreen; display-capture"
              className="flex-1 w-full border-0"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-20 h-20 rounded-full bg-[#1a8a6e]/10 flex items-center justify-center">
                <IconVideo size={36} className="text-[#1a8a6e]" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-[var(--foreground)] mb-1">{'วีดีโอคอล'}</div>
                <div className="text-sm text-[var(--muted)]">{'กดเริ่มเพื่อเปิดห้องวีดีโอกับคนไข้'}</div>
              </div>
              {callError && (
                <div className="text-xs text-red-400 bg-red-500/10 px-4 py-2 rounded-[10px]">{callError}</div>
              )}
              <button onClick={startCall} disabled={startingCall}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ background: '#1a8a6e' }}>
                <IconVideo size={18} />
                {startingCall ? 'กำลังเปิดห้อง...' : 'เริ่มวีดีโอคอล'}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Rx form */}
        <div className={`flex flex-col w-full lg:w-96 flex-shrink-0 border-l border-[var(--border)] overflow-y-auto bg-[var(--card-bg)] ${tab === 'video' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="px-4 pt-4 pb-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <IconPill size={16} className="text-[#1a8a6e]" />
              <span className="font-bold text-sm text-[var(--foreground)]">{'ใบสั่งยา'}</span>
              {existingRxId && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full font-medium ml-auto">{'บันทึกแล้ว'}</span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4 flex-1">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wide">{'วินิจฉัย'}</label>
              <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
                rows={2} placeholder={'การวินิจฉัยโรค...'}
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[10px] bg-[var(--background)] focus:outline-none focus:border-[#1a8a6e] resize-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">{'รายการยา'}</label>
                <button onClick={() => setRxItems(prev => [...prev, EMPTY_ITEM()])}
                  className="flex items-center gap-1 text-xs text-[#1a8a6e] font-medium">
                  <IconPlus size={13} />{'เพิ่มยา'}
                </button>
              </div>
              <div className="space-y-3">
                {rxItems.map((item, idx) => (
                  <div key={idx} className="bg-[var(--background)] rounded-[10px] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={item.drug_name}
                        onChange={e => setRxItems(prev => prev.map((x, i) => i === idx ? { ...x, drug_name: e.target.value } : x))}
                        placeholder={'ชื่อยา *'}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-[var(--border)] rounded-[8px] bg-[var(--card-bg)] focus:outline-none focus:border-[#1a8a6e]" />
                      {rxItems.length > 1 && (
                        <button onClick={() => setRxItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-[var(--muted)] hover:text-red-400 transition-colors flex-shrink-0">
                          <IconTrash size={15} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'dosage', label: 'ขนาด' },
                        { key: 'frequency', label: 'ความถี่' },
                        { key: 'duration', label: 'จำนวนวัน' },
                        { key: 'quantity', label: 'จำนวน' },
                      ].map(f => (
                        <input key={f.key}
                          value={(item as Record<string, string>)[f.key]}
                          onChange={e => setRxItems(prev => prev.map((x, i) => i === idx ? { ...x, [f.key]: e.target.value } : x))}
                          placeholder={f.label}
                          className="px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-[8px] bg-[var(--card-bg)] focus:outline-none focus:border-[#1a8a6e]" />
                      ))}
                    </div>
                    <input value={item.instructions}
                      onChange={e => setRxItems(prev => prev.map((x, i) => i === idx ? { ...x, instructions: e.target.value } : x))}
                      placeholder={'คำแนะนำเพิ่มเติม...'}
                      className="w-full px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-[8px] bg-[var(--card-bg)] focus:outline-none focus:border-[#1a8a6e]" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wide">{'หมายเหตุ'}</label>
              <textarea value={rxNotes} onChange={e => setRxNotes(e.target.value)}
                rows={2} placeholder={'หมายเหตุเพิ่มเติม...'}
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[10px] bg-[var(--background)] focus:outline-none focus:border-[#1a8a6e] resize-none" />
            </div>
          </div>

          <div className="px-4 pb-4 flex-shrink-0 space-y-2">
            <button onClick={saveRx} disabled={savingRx}
              className="w-full py-3 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ background: '#1a8a6e' }}>
              {rxSaved ? <><IconCheck size={16} />{'บันทึกแล้ว'}</> : savingRx ? 'กำลังบันทึก...' : <><IconPill size={16} />{'บันทึกใบสั่งยา'}</>}
            </button>
            <button
              onClick={async () => {
                await updateStatus('completed')
                router.push('/doctor/appointments')
              }}
              disabled={updatingStatus}
              className="w-full py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 border-2 border-[#1a8a6e] text-[#1a8a6e] hover:bg-[#1a8a6e] hover:text-white disabled:opacity-50 transition-all">
              <IconCheck size={16} />{'เสร็จสิ้นการรักษา'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom tabs */}
      <div className="lg:hidden flex border-t border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
        {[
          { key: 'video' as const, label: 'วีดีโอคอล', Icon: IconVideo },
          { key: 'rx'    as const, label: 'ใบสั่งยา',  Icon: IconPill },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              tab === t.key ? 'text-[#1a8a6e]' : 'text-[var(--muted)]'
            }`}>
            <t.Icon size={20} strokeWidth={tab === t.key ? 2.2 : 1.6} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
