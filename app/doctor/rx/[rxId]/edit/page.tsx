'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import {
  IconArrowLeft, IconPlus, IconTrash, IconDeviceFloppy, IconCheck,
} from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RxItem = {
  id?: string
  drug_name: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  quantity: string
}
type DrugOption = {
  id: string; drug_name: string; strength: string | null
  dosage: string | null; frequency: string | null; duration: string | null
  instructions: string | null; unit: string | null; price: number | null
}
type DecodedRx = { dosage: string; frequency: string; instructions: string }

// ── Mode 2 decoder (copy from appointments page) ────────────────────────────
function timeSched(n: number, bedtime = false): string {
  if (bedtime) return 'ก่อนนอน'
  return (['', 'เช้า', 'เช้า-เย็น', 'เช้า-กลางวัน-เย็น', 'เช้า-กลางวัน-เย็น-ก่อนนอน'] as const)[n] ?? `${n} ครั้ง/วัน`
}
function decodeMode2(raw: string): DecodedRx | null {
  const code = raw.trim(); if (!code) return null
  const lc = code.toLowerCase()
  if (lc === 'troche') return { dosage: '1 เม็ด', frequency: 'ทุก 6 ชม.', instructions: 'อม เวลามีอาการเจ็บคอ' }
  if (lc === 'drp') return { dosage: '', frequency: '', instructions: 'จิบเวลาไอ' }
  const edeq = lc.match(/^edeq(\d+)$/)
  if (edeq) return { dosage: '1-2 หยด', frequency: `ทุก ${edeq[1]} ชั่วโมง`, instructions: 'หยอดตาข้างที่เป็น' }
  const ed = lc.match(/^ed([rblq]?)(\d+)(hs|h)?$/)
  if (ed) {
    const sides: Record<string, string> = { r: 'ขวา', l: 'ซ้าย', b: 'ทั้ง 2 ข้าง', q: 'ข้างที่เป็น', '': '' }
    const n = parseInt(ed[2]), hs = !!ed[3]
    return { dosage: '1-2 หยด', frequency: `วันละ ${n} ครั้ง`, instructions: `หยอดตา${sides[ed[1]] ?? ''} ${hs ? 'ก่อนนอน' : timeSched(n)}`.trim() }
  }
  const ea = lc.match(/^ea([rbl]?)(\d+)$/)
  if (ea) {
    const sides: Record<string, string> = { r: 'ขวา', l: 'ซ้าย', b: 'ทั้ง 2 ข้าง', '': 'ข้างที่เป็น' }
    return { dosage: '1-2 หยด', frequency: `วันละ ${parseInt(ea[2])} ครั้ง`, instructions: `หยอดหู${sides[ea[1]] ?? 'ข้างที่เป็น'} ${timeSched(parseInt(ea[2]))}`.trim() }
  }
  const ep = lc.match(/^ep([rbl]?)(\d+)$/)
  if (ep) {
    const sides: Record<string, string> = { r: 'ขวา', l: 'ซ้าย', b: 'ทั้ง 2 ข้าง', '': 'ข้างที่เป็น' }
    return { dosage: '', frequency: `วันละ ${parseInt(ep[2])} ครั้ง`, instructions: `ป้ายตา${sides[ep[1]] ?? 'ข้างที่เป็น'} ${timeSched(parseInt(ep[2]))}`.trim() }
  }
  const apm = lc.match(/^apm(\d+)$/)
  if (apm) return { dosage: '', frequency: `วันละ ${apm[1]} ครั้ง`, instructions: `ป้ายแผลในปาก ${timeSched(parseInt(apm[1]))}` }
  const ap = lc.match(/^ap(\d+)$/)
  if (ap) return { dosage: '', frequency: `วันละ ${ap[1]} ครั้ง`, instructions: `ทาบางๆ เฉพาะที่ ${timeSched(parseInt(ap[1]))}` }
  const ns = lc.match(/^ns(\d)(\d+)$/)
  if (ns) return { dosage: '', frequency: `วันละ ${ns[2]} เวลา`, instructions: `พ่นจมูก ${ns[1] === '1' ? '1 ข้าง' : '2 ข้าง'} ${timeSched(parseInt(ns[2]))}` }
  const mdi = lc.match(/^mdi(\d+)x(\d+)$/)
  if (mdi) return { dosage: `${mdi[1]} ที`, frequency: `วันละ ${mdi[2]} ครั้ง`, instructions: timeSched(parseInt(mdi[2])) }
  if (lc.startsWith('rect')) return { dosage: '1 เม็ด', frequency: 'ตามแพทย์สั่ง', instructions: 'เหน็บทวาร' }
  if (lc.includes('prn') || lc.includes('prs')) {
    const m = lc.match(/^([\d.]+)/); const q = m ? parseFloat(m[1]) : 1
    return { dosage: `${q === 0.5 ? 'ครึ่ง' : String(q)} ช้อนชา`, frequency: 'เมื่อมีอาการ', instructions: '' }
  }
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
    const instParts = isBed ? ['ก่อนนอน'] : [when, ad ? 'วันเว้นวัน' : '', timeSched(times)].filter(Boolean)
    return { dosage: `${qText} ${unit}`, frequency: `วันละ ${times} ครั้ง`, instructions: instParts.join(' ').trim() }
  }
  return null
}

function Mode2Input({ onDecode }: { onDecode: (d: DecodedRx) => void }) {
  const [code, setCode] = useState('')
  const preview = code.trim() ? decodeMode2(code) : null
  function apply() { if (preview) { onDecode(preview); setCode('') } }
  return (
    <div className="space-y-1 col-span-full">
      <div className="relative">
        <input
          value={code}
          onChange={e => { const v = e.target.value; setCode(v); const d = decodeMode2(v); if (d) onDecode(d) }}
          onKeyDown={e => e.key === 'Enter' && apply()}
          placeholder="Mode 2 (เช่น 11pt, 13pt, edb4...)"
          className="w-full px-2.5 py-1.5 text-xs border border-dashed border-[var(--hw-green-dk)]/50 rounded-[8px] bg-[var(--hw-green-dk)]/5 focus:outline-none focus:border-[var(--hw-green-dk)] font-mono placeholder:font-sans placeholder:text-[var(--muted)]"
        />
        {code && <button type="button" onClick={() => setCode('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-red-400 text-[10px]">✕</button>}
      </div>
      {preview && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--hw-green-dk)] px-0.5">
          {preview.dosage && <span>ขนาด: {preview.dosage}</span>}
          {preview.frequency && <span>ความถี่: {preview.frequency}</span>}
          {preview.instructions && <span>วิธีใช้: {preview.instructions}</span>}
        </div>
      )}
    </div>
  )
}

function DrugAutocomplete({ value, onChange, onSelect }: {
  value: string; onChange: (v: string) => void; onSelect: (d: DrugOption) => void
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
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => { if (options.length > 0) setOpen(true) }}
        placeholder="ชื่อยา * (พิมพ์เพื่อค้นหา)"
        className="w-full px-2.5 py-1.5 text-sm border border-[var(--border)] rounded-[8px] bg-[var(--card-bg)] focus:outline-none focus:border-[var(--hw-green-dk)]"
      />
      {open && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--card-bg)] border border-[var(--border)] rounded-[10px] shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.map(d => (
            <button key={d.id} type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(d); setOpen(false) }}
              className="w-full text-left px-3 py-2 hover:bg-[var(--hw-green-dk)]/10 transition-colors border-b border-[var(--border)] last:border-0">
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

const EMPTY = (): RxItem => ({ drug_name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' })

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-[var(--border)] rounded-[8px] bg-[var(--card-bg)] focus:outline-none focus:border-[var(--hw-green-dk)]'

export default function DoctorRxEditPage() {
  const { rxId } = useParams<{ rxId: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patientName, setPatientName] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [rxNotes, setRxNotes] = useState('')
  const [items, setItems] = useState<RxItem[]>([EMPTY()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    sb.from('hw_doctors').select('id').eq('user_id', user.id).single()
      .then(({ data: doc }) => {
        if (!doc) { router.replace('/doctor'); return }

        sb.from('hw_rx')
          .select('id,diagnosis,notes,doctor_id,hw_rx_items(id,drug_name,dosage,frequency,duration,instructions,quantity,sort_order),hw_appointments(hw_users(full_name))')
          .eq('id', rxId).single()
          .then(({ data: rxData, error: e }) => {
            if (e || !rxData) { setError('ไม่พบใบสั่งยา'); setLoading(false); return }
            // Only the doctor who created it can edit
            if ((rxData as { doctor_id: string }).doctor_id !== doc.id) {
              setError('คุณไม่มีสิทธิ์แก้ไขใบสั่งยานี้')
              setLoading(false)
              return
            }
            const r = rxData as unknown as {
              diagnosis: string | null; notes: string | null
              hw_rx_items: (RxItem & { sort_order: number })[]
              hw_appointments: { hw_users: { full_name: string | null } | null } | null
            }
            setDiagnosis(r.diagnosis ?? '')
            setRxNotes(r.notes ?? '')
            setPatientName(r.hw_appointments?.hw_users?.full_name ?? '—')
            const sorted = [...r.hw_rx_items]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(i => ({ ...i, quantity: String(i.quantity ?? '') }))
            if (sorted.length > 0) setItems(sorted)
            setLoading(false)
          })
      })
  }, [user, rxId, router])

  function updateItem(idx: number, field: keyof RxItem, value: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }
  function decodeInto(idx: number, d: DecodedRx) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, dosage: d.dosage || it.dosage, frequency: d.frequency || it.frequency, instructions: d.instructions || it.instructions } : it))
  }
  function selectDrug(idx: number, d: DrugOption) {
    setItems(prev => prev.map((it, i) => i === idx ? {
      ...it, drug_name: d.drug_name + (d.strength ? ` ${d.strength}` : ''),
      dosage: d.dosage ?? '', frequency: d.frequency ?? '',
      duration: d.duration ?? '', instructions: d.instructions ?? '',
    } : it))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    const valid = items.filter(i => i.drug_name.trim())
    try {
      await sb.from('hw_rx').update({ diagnosis, notes: rxNotes }).eq('id', rxId)
      await sb.from('hw_rx_items').delete().eq('rx_id', rxId)
      if (valid.length > 0) {
        await sb.from('hw_rx_items').insert(
          valid.map((i, idx) => ({
            rx_id: rxId, drug_name: i.drug_name, dosage: i.dosage,
            frequency: i.frequency, duration: i.duration, instructions: i.instructions,
            quantity: i.quantity ? parseInt(i.quantity) : null, sort_order: idx,
          }))
        )
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--hw-green-dk)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10 text-center text-[var(--muted)]">
        <p>{error}</p>
        <Link href="/doctor/rx" className="text-sm text-[var(--hw-green-dk)] mt-4 inline-block">← กลับ</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-10">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/doctor/rx" className="p-2 rounded-full hover:bg-[var(--border)] transition-colors flex-shrink-0">
          <IconArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold">{'แก้ไขใบสั่งยา'}</h1>
          <p className="text-xs text-[var(--muted)]">{patientName}</p>
        </div>
      </div>

      {/* Diagnosis + notes */}
      <div className="space-y-3 mb-5">
        <input
          value={diagnosis}
          onChange={e => setDiagnosis(e.target.value)}
          placeholder="การวินิจฉัย"
          className={inputCls}
        />
        <input
          value={rxNotes}
          onChange={e => setRxNotes(e.target.value)}
          placeholder="หมายเหตุ (ไม่บังคับ)"
          className={inputCls}
        />
      </div>

      {/* Drug items */}
      <div className="space-y-3 mb-5">
        {items.map((item, idx) => (
          <div key={idx} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted)] w-5 flex-shrink-0">{idx + 1}.</span>
              <DrugAutocomplete
                value={item.drug_name}
                onChange={v => updateItem(idx, 'drug_name', v)}
                onSelect={d => selectDrug(idx, d)}
              />
              {items.length > 1 && (
                <button type="button"
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1.5 text-[var(--muted)] hover:text-red-400 flex-shrink-0">
                  <IconTrash size={15} />
                </button>
              )}
            </div>

            <Mode2Input onDecode={d => decodeInto(idx, d)} />

            <div className="grid grid-cols-2 gap-2">
              <input value={item.dosage} onChange={e => updateItem(idx, 'dosage', e.target.value)} placeholder="ขนาดยา" className={inputCls} />
              <input value={item.frequency} onChange={e => updateItem(idx, 'frequency', e.target.value)} placeholder="ความถี่" className={inputCls} />
              <input value={item.duration} onChange={e => updateItem(idx, 'duration', e.target.value)} placeholder="จำนวนวัน" className={inputCls} />
              <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="จำนวน (เม็ด)" className={inputCls} />
            </div>
            <input value={item.instructions} onChange={e => updateItem(idx, 'instructions', e.target.value)} placeholder="วิธีกิน / คำแนะนำ" className={inputCls} />
          </div>
        ))}
      </div>

      <button type="button"
        onClick={() => setItems(prev => [...prev, EMPTY()])}
        className="flex items-center gap-2 text-sm text-[var(--hw-green-dk)] hover:underline mb-6">
        <IconPlus size={16} />{'เพิ่มยา'}
      </button>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <div className="flex gap-3">
        <Link href="/doctor/rx"
          className="flex-1 py-2.5 rounded-full text-sm font-semibold text-center border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--background)] transition-colors">
          {'ยกเลิก'}
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold text-white bg-[var(--hw-green-dk)] hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saved
            ? <><IconCheck size={16} />{'บันทึกแล้ว'}</>
            : saving
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <><IconDeviceFloppy size={16} />{'บันทึก'}</>}
        </button>
      </div>
    </div>
  )
}
