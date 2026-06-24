'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import {
  IconPlus, IconTrash, IconChevronRight, IconClock,
  IconTrendingUp, IconTrendingDown, IconMinus, IconBell, IconBellOff,
} from '@tabler/icons-react'

type Dtx      = { id: string; value: number; meal_status: string; measured_at: string }
type Bp       = { id: string; systolic: number; diastolic: number; pulse: number | null; measured_at: string }
type Med      = { id: string; name: string; dosage: string | null; frequency: string | null; times: string[] | null; reminder_enabled: boolean; source: string }
type Vaccine  = { id: string; vaccine_name: string; dose_number: number; vaccinated_date: string; next_due_date: string | null; hospital: string | null }
type Lab      = { id: string; test_name: string; value: number | null; unit: string | null; status: 'normal' | 'warning' | 'critical'; test_date: string }
type Visit    = { id: string; hospital: string; visit_date: string; doctor: string | null; chief_complaint: string | null; diagnosis: string | null; status: string }
type Pending  = { id: string }

type AForm = 'dtx' | 'bp' | 'med' | 'vaccine' | 'lab' | 'visit' | null

const MEAL: Record<string, string> = { fasting: 'อดอาหาร', before_meal: 'ก่อนอาหาร', after_meal: 'หลังอาหาร', bedtime: 'ก่อนนอน' }
const dtxSt = (v: number) => v < 70 ? { l:'ต่ำ',   c:'text-blue-400',    b:'bg-blue-500/10',    bd:'bg-blue-500/15 text-blue-400'    }
  : v <= 99  ? { l:'ปกติ',  c:'text-[#1a8a6e]',   b:'bg-[#1a8a6e]/10',  bd:'bg-[#1a8a6e]/15 text-[#1a8a6e]'  }
  : v <= 125 ? { l:'ระวัง', c:'text-yellow-400',   b:'bg-yellow-500/10', bd:'bg-yellow-500/15 text-yellow-400' }
  :            { l:'สูง',   c:'text-red-400',      b:'bg-red-500/10',    bd:'bg-red-500/15 text-red-400'       }
const bpSt  = (s: number) => s < 90 ? { l:'ต่ำ',   c:'text-blue-400',    b:'bg-blue-500/10',    bd:'bg-blue-500/15 text-blue-400'    }
  : s <= 120 ? { l:'ปกติ',  c:'text-[#1a8a6e]',   b:'bg-[#1a8a6e]/10',  bd:'bg-[#1a8a6e]/15 text-[#1a8a6e]'  }
  : s <= 139 ? { l:'ระวัง', c:'text-yellow-400',   b:'bg-yellow-500/10', bd:'bg-yellow-500/15 text-yellow-400' }
  :            { l:'สูง',   c:'text-red-400',      b:'bg-red-500/10',    bd:'bg-red-500/15 text-red-400'       }
const labSt = { normal: { l:'ปกติ',    c:'text-[#1a8a6e]',  dot:'bg-[#1a8a6e]',  bd:'bg-[#1a8a6e]/15 text-[#1a8a6e]'   },
                warning: { l:'ระวัง',   c:'text-yellow-400', dot:'bg-yellow-400',  bd:'bg-yellow-500/15 text-yellow-400'  },
                critical:{ l:'ผิดปกติ', c:'text-red-400',    dot:'bg-red-400',     bd:'bg-red-500/15 text-red-400'        } }
const trend = (cur: number, prev: number) => {
  const d = cur - prev
  if (Math.abs(d) < 1) return { Icon: IconMinus, c: 'text-[var(--muted)]', t: '' }
  return d > 0 ? { Icon: IconTrendingUp, c: 'text-red-400', t: '+' + d.toFixed(0) } : { Icon: IconTrendingDown, c: 'text-[var(--hw-green)]', t: d.toFixed(0) }
}

const ic = 'w-full border border-[var(--border)] rounded-[10px] px-4 py-3 text-sm bg-[var(--card-bg)] focus:outline-none focus:border-[var(--hw-green)]'
const lc = 'text-xs text-[var(--muted)] mb-1.5 block font-medium'
const now16 = () => new Date().toISOString().slice(0, 16)
const today0 = () => new Date().toISOString().slice(0, 10)

function SectionHead({ title, href, fKey, label, color, pendingN = 0, active, toggle }: {
  title: string; href: string; fKey: AForm; label: string; color: string
  pendingN?: number; active: AForm; toggle: (k: AForm) => void
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-sm">{title}</h2>
        {pendingN > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><IconClock size={10}/>{pendingN}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => toggle(fKey)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full text-white font-medium transition-opacity"
          style={{ background: color, opacity: active === fKey ? 0.7 : 1 }}>
          <IconPlus size={12}/>{label}
        </button>
        <Link href={href} className="flex items-center text-xs text-[var(--muted)] hover:text-[var(--hw-green)]">{'ประวัติ'}<IconChevronRight size={12}/></Link>
      </div>
    </div>
  )
}

function EmptyCard({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="bg-[var(--card-bg)] border border-dashed border-[var(--border)] rounded-[14px] py-5 text-center">
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-xs text-[var(--muted)]">{text}</p>
    </div>
  )
}

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function HealthBookDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [aForm,   setAForm]     = useState<AForm>(null)
  const toggle = (k: AForm) => setAForm(f => f === k ? null : k)

  const [dtxList,    setDtxList]    = useState<Dtx[]>([])
  const [bpList,     setBpList]     = useState<Bp[]>([])
  const [medList,    setMedList]    = useState<Med[]>([])
  const [medPend,    setMedPend]    = useState<Pending[]>([])
  const [vacList,    setVacList]    = useState<Vaccine[]>([])
  const [vacPend,    setVacPend]    = useState<Pending[]>([])
  const [labList,    setLabList]    = useState<Lab[]>([])
  const [labPend,    setLabPend]    = useState(0)
  const [labDate,    setLabDate]    = useState<string | null>(null)
  const [visitList,  setVisitList]  = useState<Visit[]>([])

  const [dtxF,  setDtxF]  = useState({ value: '', meal: 'fasting', at: now16() })
  const [bpF,   setBpF]   = useState({ sys: '', dia: '', pulse: '', at: now16() })
  const [medF,  setMedF]  = useState({ name: '', dosage: '', freq: '', reminder: false })
  const [vacF,  setVacF]  = useState({ name: '', dose: '1', date: today0(), hospital: '', next: '' })
  const [labF,  setLabF]  = useState({ date: today0(), hospital: '', test: '', value: '', unit: '', status: 'normal' as 'normal'|'warning'|'critical' })
  const [labFile, setLabFile] = useState<File | null>(null)
  const [labMode, setLabMode] = useState<'file'|'manual'>('file')
  const [visF,  setVisF]  = useState({ date: today0(), hospital: '', doctor: '', complaint: '', diagnosis: '', treatment: '' })

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    ;(async () => {
      const uid = user.id
      const [d, b, m, mp, v, vp, l, lp, vis] = await Promise.all([
        sb.from('hw_dtx_records').select('id,value,meal_status,measured_at').eq('user_id', uid).order('measured_at', { ascending: false }).limit(2),
        sb.from('hw_bp_records').select('id,systolic,diastolic,pulse,measured_at').eq('user_id', uid).order('measured_at', { ascending: false }).limit(2),
        sb.from('hw_medications').select('id,name,dosage,frequency,times,reminder_enabled,source').eq('user_id', uid).eq('is_active', true).eq('status', 'approved'),
        sb.from('hw_medications').select('id').eq('user_id', uid).eq('status', 'pending'),
        sb.from('hw_vaccines').select('id,vaccine_name,dose_number,vaccinated_date,hospital,next_due_date').eq('user_id', uid).eq('status', 'approved').order('vaccinated_date', { ascending: false }).limit(5),
        sb.from('hw_vaccines').select('id').eq('user_id', uid).eq('status', 'pending'),
        sb.from('hw_lab_results').select('id,test_name,value,unit,status,test_date').eq('user_id', uid).eq('approval_status', 'approved').order('test_date', { ascending: false }).limit(20),
        sb.from('hw_lab_results').select('id').eq('user_id', uid).eq('approval_status', 'pending'),
        sb.from('hw_medical_history').select('id,hospital,visit_date,doctor,chief_complaint,diagnosis,status').eq('user_id', uid).order('visit_date', { ascending: false }).limit(3),
      ])
      setDtxList((d.data ?? []) as Dtx[])
      setBpList((b.data ?? []) as Bp[])
      setMedList((m.data ?? []) as Med[])
      setMedPend((mp.data ?? []) as Pending[])
      setVacList((v.data ?? []) as Vaccine[])
      setVacPend((vp.data ?? []) as Pending[])
      const labs = (l.data ?? []) as Lab[]
      const ld = labs[0]?.test_date ?? null
      setLabDate(ld)
      setLabList(ld ? labs.filter(x => x.test_date === ld) : [])
      setLabPend((lp.data ?? []).length)
      setVisitList((vis.data ?? []) as Visit[])
      setLoading(false)
    })()
  }, [user, authLoading, router])

  async function sdtx() {
    if (!dtxF.value || !user) return; setSaving(true)
    const { data } = await sb.from('hw_dtx_records').insert({ user_id: user.id, value: parseFloat(dtxF.value), meal_status: dtxF.meal, measured_at: dtxF.at }).select('id,value,meal_status,measured_at').single()
    if (data) setDtxList(p => [data as Dtx, ...p].slice(0, 2))
    setDtxF({ value: '', meal: 'fasting', at: now16() }); setAForm(null); setSaving(false)
  }
  async function sbp() {
    if (!bpF.sys || !bpF.dia || !user) return; setSaving(true)
    const { data } = await sb.from('hw_bp_records').insert({ user_id: user.id, systolic: +bpF.sys, diastolic: +bpF.dia, pulse: bpF.pulse ? +bpF.pulse : null, measured_at: bpF.at }).select('id,systolic,diastolic,pulse,measured_at').single()
    if (data) setBpList(p => [data as Bp, ...p].slice(0, 2))
    setBpF({ sys: '', dia: '', pulse: '', at: now16() }); setAForm(null); setSaving(false)
  }
  async function smed() {
    if (!medF.name || !user) return; setSaving(true)
    await sb.from('hw_medications').insert({ user_id: user.id, name: medF.name, dosage: medF.dosage || null, frequency: medF.freq || null, reminder_enabled: medF.reminder, is_active: true, status: 'pending', source: 'patient' })
    setMedPend(p => [...p, { id: Date.now().toString() }])
    setMedF({ name: '', dosage: '', freq: '', reminder: false }); setAForm(null); setSaving(false)
  }
  async function svac() {
    if (!vacF.name || !user) return; setSaving(true)
    await sb.from('hw_vaccines').insert({ user_id: user.id, vaccine_name: vacF.name, dose_number: +vacF.dose, vaccinated_date: vacF.date, hospital: vacF.hospital || null, next_due_date: vacF.next || null, status: 'pending', source: 'patient' })
    setVacPend(p => [...p, { id: Date.now().toString() }])
    setVacF({ name: '', dose: '1', date: today0(), hospital: '', next: '' }); setAForm(null); setSaving(false)
  }
  async function slab() {
    if (!user) return
    if (labMode === 'file' && !labFile) return
    if (labMode === 'manual' && !labF.test) return
    setSaving(true)
    let storagePath: string | null = null
    if (labFile) {
      const ext = labFile.name.split('.').pop() ?? 'pdf'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: sd } = await sb.storage.from('lab-results').upload(path, labFile, { contentType: labFile.type })
      storagePath = sd?.path ?? null
    }
    await sb.from('hw_lab_results').insert({
      user_id: user.id,
      test_date: labF.date,
      hospital: labF.hospital || null,
      test_name: labMode === 'file' ? (labFile?.name ?? 'ไฟล์ผลตรวจ') : labF.test,
      value: labF.value ? +labF.value : null,
      unit: labF.unit || null,
      status: labF.status,
      approval_status: 'pending',
      source: 'patient',
      storage_path: storagePath,
    })
    setLabPend(c => c + 1)
    setLabFile(null)
    setLabF({ date: today0(), hospital: '', test: '', value: '', unit: '', status: 'normal' })
    setAForm(null); setSaving(false)
  }
  async function svis() {
    if (!visF.hospital || !user) return; setSaving(true)
    const { data } = await sb.from('hw_medical_history').insert({ user_id: user.id, visit_date: visF.date, hospital: visF.hospital, doctor: visF.doctor || null, chief_complaint: visF.complaint || null, diagnosis: visF.diagnosis || null, treatment: visF.treatment || null, status: 'pending', source: 'patient' }).select('id,hospital,visit_date,doctor,chief_complaint,diagnosis,status').single()
    if (data) setVisitList(p => [data as Visit, ...p])
    setVisF({ date: today0(), hospital: '', doctor: '', complaint: '', diagnosis: '', treatment: '' }); setAForm(null); setSaving(false)
  }

  if (authLoading || loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const d0 = dtxList[0]; const d1 = dtxList[1]; const ds = d0 ? dtxSt(d0.value) : null
  const b0 = bpList[0];  const b1 = bpList[1];  const bs = b0 ? bpSt(b0.systolic) : null
  const dt = (d0 && d1) ? trend(d0.value, d1.value) : null
  const bt = (b0 && b1) ? trend(b0.systolic, b1.systolic) : null

  const saveBtnClass = 'flex-1 text-white rounded-full py-2.5 text-xs font-semibold disabled:opacity-50'
  const cancelBtnClass = 'flex-1 border border-[var(--border)] rounded-full py-2.5 text-xs text-[var(--muted)]'

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-10 space-y-6">
      <h1 className="text-xl font-bold">{'สมุดสุขภาพ'}</h1>

      {/* ── ค่าน้ำตาล ── */}
      <section>
        <SectionHead title="ค่าน้ำตาล" href="/health-book/record" fKey="dtx" label="บันทึก" color="var(--hw-orange)" active={aForm} toggle={toggle}/>
        {aForm === 'dtx' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 mb-3 space-y-3">
            <div><label className={lc}>ค่าน้ำตาล (mg/dL) *</label><input type="number" value={dtxF.value} onChange={e => setDtxF({...dtxF, value: e.target.value})} placeholder="เช่น 95" className={ic}/></div>
            <div><label className={lc}>ช่วงเวลา</label>
              <select value={dtxF.meal} onChange={e => setDtxF({...dtxF, meal: e.target.value})} className={ic}>
                {Object.entries(MEAL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label className={lc}>วันและเวลา</label><input type="datetime-local" value={dtxF.at} onChange={e => setDtxF({...dtxF, at: e.target.value})} className={ic}/></div>
            <div className="flex gap-3">
              <button onClick={() => setAForm(null)} className={cancelBtnClass}>ยกเลิก</button>
              <button onClick={sdtx} disabled={saving} className={saveBtnClass} style={{ background: 'var(--hw-orange)' }}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        )}
        {d0 && ds ? (
          <div className={"rounded-[14px] p-4 " + ds.b}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">{MEAL[d0.meal_status] ?? ''} · {new Date(d0.measured_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</p>
                <p className={"text-4xl font-bold " + ds.c}>{d0.value} <span className="text-sm font-normal text-[var(--muted)]">mg/dL</span></p>
                <span className={"text-xs px-2.5 py-0.5 rounded-full mt-2 inline-block " + ds.bd}>{ds.l}</span>
              </div>
              {dt && d1 && <div className={"flex flex-col items-center gap-0.5 " + dt.c}><dt.Icon size={26}/><span className="text-sm font-bold">{dt.t}</span><span className="text-xs text-[var(--muted)]">ก่อน: {d1.value}</span></div>}
            </div>
          </div>
        ) : <EmptyCard emoji="🩸" text="ยังไม่มีข้อมูลน้ำตาล"/>}
      </section>

      {/* ── ความดัน ── */}
      <section>
        <SectionHead title="ความดันโลหิต" href="/health-book/record" fKey="bp" label="บันทึก" color="var(--hw-blue)" active={aForm} toggle={toggle}/>
        {aForm === 'bp' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 mb-3 space-y-3">
            <div><label className={lc}>ค่าบน (mmHg) *</label><input type="number" value={bpF.sys} onChange={e => setBpF({...bpF, sys: e.target.value})} placeholder="เช่น 120" className={ic}/></div>
            <div><label className={lc}>ค่าล่าง (mmHg) *</label><input type="number" value={bpF.dia} onChange={e => setBpF({...bpF, dia: e.target.value})} placeholder="เช่น 80" className={ic}/></div>
            <div><label className={lc}>ชีพจร (bpm)</label><input type="number" value={bpF.pulse} onChange={e => setBpF({...bpF, pulse: e.target.value})} placeholder="เช่น 72" className={ic}/></div>
            <div><label className={lc}>วันและเวลา</label><input type="datetime-local" value={bpF.at} onChange={e => setBpF({...bpF, at: e.target.value})} className={ic}/></div>
            <div className="flex gap-3">
              <button onClick={() => setAForm(null)} className={cancelBtnClass}>ยกเลิก</button>
              <button onClick={sbp} disabled={saving} className={saveBtnClass} style={{ background: 'var(--hw-blue)' }}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        )}
        {b0 && bs ? (
          <div className={"rounded-[14px] p-4 " + bs.b}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">{new Date(b0.measured_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</p>
                <p className={"text-4xl font-bold " + bs.c}>{b0.systolic}/{b0.diastolic} <span className="text-sm font-normal text-[var(--muted)]">mmHg</span></p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={"text-xs px-2.5 py-0.5 rounded-full " + bs.bd}>{bs.l}</span>
                  {b0.pulse && <span className="text-xs text-[var(--muted)]">💓 {b0.pulse} bpm</span>}
                </div>
              </div>
              {bt && b1 && <div className={"flex flex-col items-center gap-0.5 " + bt.c}><bt.Icon size={26}/><span className="text-sm font-bold">{bt.t}</span><span className="text-xs text-[var(--muted)]">ก่อน: {b1.systolic}</span></div>}
            </div>
          </div>
        ) : <EmptyCard emoji="💙" text="ยังไม่มีข้อมูลความดัน"/>}
      </section>

      {/* ── ยา ── */}
      <section>
        <SectionHead title="ยาที่ต้องกิน" href="/health-book/meds" fKey="med" label="เพิ่มยา" color="var(--hw-orange)" pendingN={medPend.length} active={aForm} toggle={toggle}/>
        {aForm === 'med' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 mb-3 space-y-3">
            <p className="text-xs text-yellow-600">⏳ รอการยืนยันจากคลินิกก่อนแสดงผล</p>
            <div><label className={lc}>ชื่อยา *</label><input value={medF.name} onChange={e => setMedF({...medF, name: e.target.value})} placeholder="เช่น Metformin 500mg" className={ic}/></div>
            <div><label className={lc}>ขนาดยา</label><input value={medF.dosage} onChange={e => setMedF({...medF, dosage: e.target.value})} placeholder="เช่น 500mg" className={ic}/></div>
            <div><label className={lc}>ความถี่</label><input value={medF.freq} onChange={e => setMedF({...medF, freq: e.target.value})} placeholder="เช่น วันละ 2 ครั้ง" className={ic}/></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={medF.reminder} onChange={e => setMedF({...medF, reminder: e.target.checked})} className="w-4 h-4 accent-[var(--hw-green)]"/><span className="text-xs text-[var(--muted)]">เปิดแจ้งเตือน</span></label>
            <div className="flex gap-3">
              <button onClick={() => setAForm(null)} className={cancelBtnClass}>ยกเลิก</button>
              <button onClick={smed} disabled={saving} className={saveBtnClass} style={{ background: 'var(--hw-orange)' }}>{saving ? 'กำลังบันทึก...' : 'ส่งเพื่อยืนยัน'}</button>
            </div>
          </div>
        )}
        {medList.length > 0 ? (
          <div className="space-y-2">
            {medList.map(m => (
              <div key={m.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3 flex items-center gap-3">
                <span className="text-xl flex-shrink-0">💊</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    {m.reminder_enabled ? <IconBell size={13} className="text-[var(--hw-orange)] flex-shrink-0"/> : <IconBellOff size={13} className="text-[var(--muted)] flex-shrink-0"/>}
                    {m.source === 'clinic' && <span className="text-xs bg-[var(--hw-mint-bg)] text-[var(--hw-green)] px-1.5 py-0.5 rounded-full">คลินิก</span>}
                  </div>
                  <p className="text-xs text-[var(--muted)]">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</p>
                </div>
                <button onClick={async () => { await sb.from('hw_medications').delete().eq('id', m.id); setMedList(p => p.filter(r => r.id !== m.id)) }} className="p-1.5 text-[var(--muted)] hover:text-red-400"><IconTrash size={15}/></button>
              </div>
            ))}
          </div>
        ) : medPend.length === 0 && <EmptyCard emoji="💊" text="ยังไม่มีรายการยา"/>}
      </section>

      {/* ── วัคซีน ── */}
      <section>
        <SectionHead title="วัคซีน" href="/health-book/meds" fKey="vaccine" label="บันทึก" color="var(--hw-blue)" pendingN={vacPend.length} active={aForm} toggle={toggle}/>
        {aForm === 'vaccine' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 mb-3 space-y-3">
            <p className="text-xs text-yellow-600">⏳ รอการยืนยันจากคลินิกก่อนแสดงผล</p>
            <div><label className={lc}>ชื่อวัคซีน *</label><input value={vacF.name} onChange={e => setVacF({...vacF, name: e.target.value})} placeholder="เช่น COVID-19" className={ic}/></div>
            <div><label className={lc}>เข็มที่</label><input type="number" value={vacF.dose} onChange={e => setVacF({...vacF, dose: e.target.value})} className={ic}/></div>
            <div><label className={lc}>วันที่ฉีด *</label><input type="date" value={vacF.date} onChange={e => setVacF({...vacF, date: e.target.value})} className={ic}/></div>
            <div><label className={lc}>สถานที่</label><input value={vacF.hospital} onChange={e => setVacF({...vacF, hospital: e.target.value})} placeholder="เช่น HappiWell Clinic" className={ic}/></div>
            <div><label className={lc}>กำหนดครั้งถัดไป</label><input type="date" value={vacF.next} onChange={e => setVacF({...vacF, next: e.target.value})} className={ic}/></div>
            <div className="flex gap-3">
              <button onClick={() => setAForm(null)} className={cancelBtnClass}>ยกเลิก</button>
              <button onClick={svac} disabled={saving} className={saveBtnClass} style={{ background: 'var(--hw-blue)' }}>{saving ? 'กำลังบันทึก...' : 'ส่งเพื่อยืนยัน'}</button>
            </div>
          </div>
        )}
        {vacList.length > 0 ? (
          <div className="space-y-2">
            {vacList.map(v => {
              const od = v.next_due_date && new Date(v.next_due_date) < new Date()
              const ds = v.next_due_date && !od && (new Date(v.next_due_date).getTime() - Date.now()) < 60 * 86400000
              return (
                <div key={v.id} className={"bg-[var(--card-bg)] border rounded-[14px] px-4 py-3 " + (od ? 'border-red-200' : 'border-[var(--border)]')}>
                  <p className="text-sm font-semibold">{v.vaccine_name} <span className="text-xs font-normal text-[var(--muted)]">เข็มที่ {v.dose_number}</span></p>
                  <p className="text-xs text-[var(--muted)]">{new Date(v.vaccinated_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}{v.hospital ? ' · ' + v.hospital : ''}</p>
                  {v.next_due_date && <p className={"text-xs mt-0.5 " + (od ? 'text-red-500' : ds ? 'text-yellow-600' : 'text-[var(--hw-green)]')}>{od ? '⚠️ เลยกำหนด' : '📅 ครั้งถัดไป'}: {new Date(v.next_due_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</p>}
                </div>
              )
            })}
          </div>
        ) : vacPend.length === 0 && <EmptyCard emoji="💉" text="ยังไม่มีประวัติวัคซีน"/>}
      </section>

      {/* ── ผลตรวจ ── */}
      <section>
        <SectionHead title="ผลตรวจเลือด" href="/health-book/lab" fKey="lab" label="เพิ่มผล" color="var(--hw-green)" pendingN={labPend} active={aForm} toggle={toggle}/>
        {aForm === 'lab' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 mb-3 space-y-3">
            <p className="text-xs text-yellow-600">⏳ รอการยืนยันจากคลินิกก่อนแสดงผล</p>
            {/* Mode toggle */}
            <div className="flex rounded-[10px] border border-[var(--border)] overflow-hidden">
              <button onClick={() => setLabMode('file')}
                className={"flex-1 py-2 text-xs font-medium transition-colors " + (labMode === 'file' ? 'bg-[var(--hw-green)] text-white' : 'text-[var(--muted)]')}>
                {'📎 อัพโหลดไฟล์'}
              </button>
              <button onClick={() => setLabMode('manual')}
                className={"flex-1 py-2 text-xs font-medium transition-colors " + (labMode === 'manual' ? 'bg-[var(--hw-green)] text-white' : 'text-[var(--muted)]')}>
                {'✏️ กรอกเอง'}
              </button>
            </div>
            <div><label className={lc}>วันที่ตรวจ *</label><input type="date" value={labF.date} onChange={e => setLabF({...labF, date: e.target.value})} className={ic}/></div>
            <div><label className={lc}>สถานที่</label><input value={labF.hospital} onChange={e => setLabF({...labF, hospital: e.target.value})} placeholder="เช่น HappiWell Clinic" className={ic}/></div>
            {labMode === 'file' ? (
              <div>
                <label className={lc}>ไฟล์ผลตรวจ * (PDF / รูปภาพ)</label>
                <label className={"flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[10px] py-6 cursor-pointer transition-colors " + (labFile ? 'border-[var(--hw-green)] bg-[var(--hw-mint-bg)]' : 'border-[var(--border)] hover:border-[var(--hw-green)]')}>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                    onChange={e => setLabFile(e.target.files?.[0] ?? null)} />
                  {labFile
                    ? <><span className="text-2xl">📄</span><span className="text-xs font-medium text-[var(--hw-green)] text-center px-2 break-all">{labFile.name}</span><span className="text-xs text-[var(--muted)]">แตะเพื่อเปลี่ยนไฟล์</span></>
                    : <><span className="text-2xl">📂</span><span className="text-xs text-[var(--muted)]">แตะเพื่อเลือกไฟล์</span></>}
                </label>
              </div>
            ) : (
              <>
                <div><label className={lc}>รายการตรวจ *</label><input value={labF.test} onChange={e => setLabF({...labF, test: e.target.value})} placeholder="เช่น FBS, HbA1c" className={ic}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lc}>ค่าที่ได้</label><input type="number" value={labF.value} onChange={e => setLabF({...labF, value: e.target.value})} className={ic}/></div>
                  <div><label className={lc}>หน่วย</label><input value={labF.unit} onChange={e => setLabF({...labF, unit: e.target.value})} placeholder="mg/dL" className={ic}/></div>
                </div>
                <div><label className={lc}>ผลการตรวจ</label>
                  <select value={labF.status} onChange={e => setLabF({...labF, status: e.target.value as 'normal'|'warning'|'critical'})} className={ic}>
                    <option value="normal">ปกติ</option><option value="warning">ระวัง</option><option value="critical">ผิดปกติ</option>
                  </select></div>
              </>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setAForm(null); setLabFile(null) }} className={cancelBtnClass}>ยกเลิก</button>
              <button onClick={slab} disabled={saving || (labMode === 'file' && !labFile) || (labMode === 'manual' && !labF.test)}
                className={saveBtnClass} style={{ background: 'var(--hw-green)' }}>
                {saving ? 'กำลังอัพโหลด...' : 'ส่งเพื่อยืนยัน'}
              </button>
            </div>
          </div>
        )}
        {labList.length > 0 ? (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden">
            <div className="px-4 py-2 bg-[var(--background)] border-b border-[var(--border)]">
              <p className="text-xs text-[var(--muted)]">ผลตรวจวันที่ {labDate ? new Date(labDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : ''}</p>
            </div>
            {labList.map((l, i) => {
              const st = labSt[l.status] ?? labSt.normal
              return (
                <div key={l.id} className={"flex items-center px-4 py-2.5 gap-3 " + (i < labList.length - 1 ? 'border-b border-[var(--border)]' : '')}>
                  <div className={"w-2 h-2 rounded-full flex-shrink-0 " + st.dot}/>
                  <p className="text-sm flex-1 truncate">{l.test_name}</p>
                  <span className={"text-sm font-bold " + st.c}>{l.value ?? '—'}<span className="text-xs font-normal text-[var(--muted)] ml-1">{l.unit ?? ''}</span></span>
                  <span className={"text-xs px-2 py-0.5 rounded-full flex-shrink-0 " + st.bd}>{st.l}</span>
                </div>
              )
            })}
          </div>
        ) : labPend === 0 && <EmptyCard emoji="🔬" text="ยังไม่มีผลตรวจ"/>}
      </section>

      {/* ── ประวัติการรักษา ── */}
      <section>
        <SectionHead title="ประวัติการรักษา" href="/health-book/record" fKey="visit" label="บันทึก" color="#7c3aed" active={aForm} toggle={toggle}/>
        {aForm === 'visit' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 mb-3 space-y-3">
            <p className="text-xs text-purple-600">⏳ รอการยืนยันจากคลินิกก่อนแสดงผล</p>
            <div><label className={lc}>วันที่พบแพทย์ *</label><input type="date" value={visF.date} onChange={e => setVisF({...visF, date: e.target.value})} className={ic}/></div>
            <div><label className={lc}>โรงพยาบาล/คลินิก *</label><input value={visF.hospital} onChange={e => setVisF({...visF, hospital: e.target.value})} placeholder="เช่น HappiWell Clinic" className={ic}/></div>
            <div><label className={lc}>แพทย์ผู้รักษา</label><input value={visF.doctor} onChange={e => setVisF({...visF, doctor: e.target.value})} placeholder="เช่น นพ.สมชาย" className={ic}/></div>
            <div><label className={lc}>อาการที่มา</label><input value={visF.complaint} onChange={e => setVisF({...visF, complaint: e.target.value})} placeholder="เช่น ปวดหัว มีไข้" className={ic}/></div>
            <div><label className={lc}>การวินิจฉัย</label><input value={visF.diagnosis} onChange={e => setVisF({...visF, diagnosis: e.target.value})} className={ic}/></div>
            <div className="flex gap-3">
              <button onClick={() => setAForm(null)} className={cancelBtnClass}>ยกเลิก</button>
              <button onClick={svis} disabled={saving} className={saveBtnClass} style={{ background: '#7c3aed' }}>{saving ? 'กำลังบันทึก...' : 'ส่งเพื่อยืนยัน'}</button>
            </div>
          </div>
        )}
        {visitList.length > 0 ? (
          <div className="space-y-2">
            {visitList.map(v => (
              <div key={v.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{v.hospital}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {v.status === 'pending' && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">รอยืนยัน</span>}
                    <span className="text-xs text-[var(--muted)]">{new Date(v.visit_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</span>
                  </div>
                </div>
                {v.doctor && <p className="text-xs text-[var(--muted)] mt-0.5">👨‍⚕️ {v.doctor}</p>}
                {v.chief_complaint && <p className="text-xs text-[var(--muted)] mt-0.5">{v.chief_complaint}</p>}
                {v.diagnosis && <p className="text-xs text-[var(--muted)] mt-0.5">🔍 {v.diagnosis}</p>}
              </div>
            ))}
          </div>
        ) : <EmptyCard emoji="🏥" text="ยังไม่มีประวัติการรักษา"/>}
      </section>
    </div>
  )
}
