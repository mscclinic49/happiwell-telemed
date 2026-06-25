'use client'

import { useEffect, useRef, useState } from 'react'
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
type DrugOption = { id: string; drug_name: string; strength: string | null; dosage: string | null; frequency: string | null; duration: string | null; instructions: string | null; unit: string | null; price: number | null }

// ── Mode 2 decoder ──────────────────────────────────────────────────────────
function timeSched(n: number, bedtime = false): string {
  if (bedtime) return 'ก่อนนอน'
  return (['', 'เช้า', 'เช้า-เย็น', 'เช้า-กลางวัน-เย็น', 'เช้า-กลางวัน-เย็น-ก่อนนอน'] as const)[n] ?? `${n} ครั้ง/วัน`
}
function decodeMode2(raw: string): string {
  const code = raw.trim()
  if (!code) return ''
  const lc = code.toLowerCase()

  if (lc === 'troche') return 'อมครั้งละ 1 เม็ด ทุก 6 ชม. เวลามีอาการเจ็บคอ'
  if (lc === 'drp') return 'จิบเวลาไอ'

  // edeq4
  const edeq = lc.match(/^edeq(\d+)$/)
  if (edeq) return `หยอดตาข้างที่เป็น ครั้งละ 1-2 หยด ทุก ${edeq[1]} ชั่วโมง`

  // eye drops: ed[side][times][hs]
  const ed = lc.match(/^ed([rblq]?)(\d+)(hs|h)?$/)
  if (ed) {
    const sides: Record<string, string> = { r: 'ขวา', l: 'ซ้าย', b: 'ทั้ง 2 ข้าง', q: 'ข้างที่เป็น', '': '' }
    const n = parseInt(ed[2])
    return `หยอดตา${sides[ed[1]] ?? ''}ครั้งละ 1-2 หยด วันละ ${n} ครั้ง ${timeSched(n, !!ed[3])}`
  }
  // ear drops: ea[side][times]
  const ea = lc.match(/^ea([rbl]?)(\d+)$/)
  if (ea) {
    const sides: Record<string, string> = { r: 'ขวา', l: 'ซ้าย', b: 'ทั้ง 2 ข้าง', '': 'ข้างที่เป็น' }
    const n = parseInt(ea[2])
    return `หยอดหู${sides[ea[1]] ?? 'ข้างที่เป็น'}ครั้งละ 1-2 หยด วันละ ${n} ครั้ง ${timeSched(n)}`
  }
  // eye ointment: ep[side][times]
  const ep = lc.match(/^ep([rbl]?)(\d+)$/)
  if (ep) {
    const sides: Record<string, string> = { r: 'ขวา', l: 'ซ้าย', b: 'ทั้ง 2 ข้าง', '': 'ข้างที่เป็น' }
    const n = parseInt(ep[2])
    return `ป้ายตา${sides[ep[1]] ?? 'ข้างที่เป็น'} วันละ ${n} ครั้ง ${timeSched(n)}`
  }
  // topical mouth: apm[times]
  const apm = lc.match(/^apm(\d+)$/)
  if (apm) return `ป้ายแผลในปาก วันละ ${apm[1]} ครั้ง ${timeSched(parseInt(apm[1]))}`
  // topical: ap[times]
  const ap = lc.match(/^ap(\d+)$/)
  if (ap) return `ทาบางๆ เฉพาะที่ วันละ ${ap[1]} ครั้ง ${timeSched(parseInt(ap[1]))}`
  // nasal spray: ns[1|2][times]
  const ns = lc.match(/^ns(\d)(\d+)$/)
  if (ns) return `พ่นจมูก ${ns[1] === '1' ? '1 ข้าง' : '2 ข้าง'} วันละ ${ns[2]} เวลา ${timeSched(parseInt(ns[2]))}`
  // inhaler: mdi[n]x[times]
  const mdi = lc.match(/^mdi(\d+)x(\d+)$/)
  if (mdi) return `พ่นยา ${mdi[1]} ที วันละ ${mdi[2]} ครั้ง ${timeSched(parseInt(mdi[2]))}`
  // rectal
  if (lc.startsWith('rect')) return 'เหน็บทวารตามคำแนะนำของแพทย์'
  // vaginal: [qty][times]vgsp
  const vg = lc.match(/^(\d+)(\d+)\s*vgsp?$/)
  if (vg) return `สอดช่องคลอด ครั้งละ ${vg[1]} เม็ด วันละ ${vg[2]} ครั้ง ${parseInt(vg[2]) === 1 ? 'ก่อนนอน' : timeSched(parseInt(vg[2]))}`
  // injections
  if (lc.startsWith('im')) return `ฉีดเข้ากล้ามเนื้อ${lc.slice(2).trim() ? ' ' + lc.slice(2).trim() : ''}`
  if (lc.startsWith('iv')) return `ฉีดเข้าเส้นเลือดดำ${lc.slice(2).trim() ? ' ' + lc.slice(2).trim() : ''}`
  if (lc.startsWith('sc')) return `ฉีดเข้าใต้ผิวหนัง${lc.slice(2).trim() ? ' ' + lc.slice(2).trim() : ''}`
  // prn/prs (as needed)
  if (lc.includes('prn') || lc.includes('prs')) {
    const m = lc.match(/^([\d.]+)/)
    const q = m ? parseFloat(m[1]) : 1
    const qText = q === 0.5 ? 'ครึ่ง' : String(q)
    return `รับประทานครั้งละ ${qText} ช้อนชา เมื่อมีอาการ`
  }
  // oral: [qty][times][timing][ad?][form]
  const oral = lc.match(/^([\d.]+)\s*(\d+)\s*(hs|h|a|p)?\s*(ad)?\s*(hs|h|a|p)?\s*(t|s|j|z)?$/)
  if (oral) {
    const qty = parseFloat(oral[1]), times = parseInt(oral[2])
    const timing = (oral[3] || oral[5])?.toLowerCase()
    const ad = !!oral[4], form = oral[6]?.toLowerCase()
    const qText = qty === 0.5 ? 'ครึ่ง' : qty === 1.5 ? '1 ครึ่ง' : String(qty)
    const fText: Record<string, string> = { t: 'เม็ด', s: 'ช้อนชา', j: 'ช้อนโต๊ะ', z: 'ซีซี' }
    const unit = fText[form ?? ''] ?? 'เม็ด'
    const isBed = timing === 'h' || timing === 'hs'
    const tText: Record<string, string> = { a: 'ก่อนอาหาร', p: 'หลังอาหาร', h: 'ก่อนนอน', hs: 'ก่อนนอน' }
    const when = tText[timing ?? ''] ?? ''
    let out = `รับประทานครั้งละ ${qText} ${unit} วันละ ${times} ครั้ง`
    if (isBed) { out += ' ก่อนนอน' }
    else {
      if (when) out += ` ${when}`
      if (ad) out += ' วันเว้นวัน'
      out += ` ${timeSched(times)}`
    }
    return out.replace(/\s+/g, ' ').trim()
  }
  return code
}
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

function Mode2Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [code, setCode] = useState('')
  const decoded = decodeMode2(code)
  const isDecoded = code.trim() !== '' && decoded !== code.trim()

  function apply(text: string) {
    onChange(text)
    setCode('')
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5 items-center">
        <input
          value={code}
          onChange={e => {
            const v = e.target.value
            setCode(v)
            const d = decodeMode2(v)
            if (d !== v.trim()) onChange(d)   // live-apply decoded
            else if (!v.trim()) onChange('')
          }}
          placeholder="Mode 2 (เช่น 11pt, edb4) หรือพิมพ์วิธีใช้โดยตรง"
          className="flex-1 px-2.5 py-1.5 text-xs border border-[var(--border)] rounded-[8px] bg-[var(--card-bg)] focus:outline-none focus:border-[#1a8a6e]"
        />
        {code.trim() && (
          <button type="button" onClick={() => setCode('')}
            className="text-[10px] text-[var(--muted)] hover:text-red-400 px-1">✕</button>
        )}
      </div>
      {isDecoded && (
        <div className="text-[11px] px-2.5 py-1 bg-[#1a8a6e]/10 text-[#1a8a6e] rounded-[6px] cursor-pointer"
          onClick={() => apply(decoded)}>
          {'→ '}{decoded}
        </div>
      )}
      {value && !isDecoded && (
        <div className="text-[11px] text-[var(--muted)] px-1">{value}</div>
      )}
    </div>
  )
}

function DrugAutocomplete({ value, onChange, onSelect }: {
  value: string
  onChange: (v: string) => void
  onSelect: (d: DrugOption) => void
}) {
  const [options, setOptions] = useState<DrugOption[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.length < 1) { setOptions([]); return }
    const t = setTimeout(() => {
      sb.from('hw_drugs').select('id,drug_name,strength,dosage,frequency,duration,instructions,unit,price')
        .ilike('drug_name', `%${value}%`).eq('is_active', true).limit(10)
        .then(({ data }) => { setOptions((data as DrugOption[]) ?? []); setOpen(true) })
    }, 200)
    return () => clearTimeout(t)
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => { if (options.length > 0) setOpen(true) }}
        placeholder="ชื่อยา * (พิมพ์เพื่อค้นหา)"
        className="w-full px-2.5 py-1.5 text-sm border border-[var(--border)] rounded-[8px] bg-[var(--card-bg)] focus:outline-none focus:border-[#1a8a6e]"
      />
      {open && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--card-bg)] border border-[var(--border)] rounded-[10px] shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.map(d => (
            <button key={d.id} type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(d); setOpen(false) }}
              className="w-full text-left px-3 py-2 hover:bg-[#1a8a6e]/10 transition-colors border-b border-[var(--border)] last:border-0">
              <div className="text-sm font-medium">{d.drug_name}{d.strength ? ` ${d.strength}` : ''}</div>
              <div className="text-[11px] text-[var(--muted)] flex flex-wrap gap-x-2 mt-0.5">
                {d.dosage && <span>{d.dosage}</span>}
                {d.frequency && <span>{d.frequency}</span>}
                {d.unit && <span>หน่วย: {d.unit}</span>}
                {d.price != null && <span>฿{d.price}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
            quantity: i.quantity ? parseInt(i.quantity) : null,
            sort_order: idx,
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
            quantity: i.quantity ? parseInt(i.quantity) : null,
            sort_order: idx,
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
                      <DrugAutocomplete
                        value={item.drug_name}
                        onChange={name => setRxItems(prev => prev.map((x, i) => i === idx ? { ...x, drug_name: name } : x))}
                        onSelect={drug => setRxItems(prev => prev.map((x, i) => i === idx ? {
                          ...x,
                          drug_name: drug.strength ? `${drug.drug_name} ${drug.strength}` : drug.drug_name,
                          dosage: drug.dosage ?? x.dosage,
                          frequency: drug.frequency ?? x.frequency,
                          duration: drug.duration ?? x.duration,
                          instructions: drug.instructions ?? x.instructions,
                        } : x))}
                      />
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
                    <Mode2Input
                      value={item.instructions}
                      onChange={v => setRxItems(prev => prev.map((x, i) => i === idx ? { ...x, instructions: v } : x))}
                    />
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
            {existingRxId && (
              <button
                onClick={() => window.open(`/rx/${existingRxId}/print`, '_blank')}
                className="w-full py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 border-2 border-gray-400 text-[var(--foreground)] hover:border-[#1a8a6e] hover:text-[#1a8a6e] transition-all">
                {'🖨️ พิมพ์ใบสั่งยา'}
              </button>
            )}
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
