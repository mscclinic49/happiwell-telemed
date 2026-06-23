'use client'
import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import {
  IconPlus, IconTrash, IconChevronDown, IconChevronUp,
  IconTrendingUp, IconTrendingDown, IconMinus,
} from '@tabler/icons-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MEAL_STATUS: Record<string, string> = {
  fasting: 'ก่อนอาหาร (อด)', before_meal: 'ก่อนอาหาร', after_meal: 'หลังอาหาร', bedtime: 'ก่อนนอน',
}

type Tab = 'dtx' | 'bp' | 'history'
type Dtx = { id: string; value: number; meal_status: string; measured_at: string; note: string | null }
type Bp = { id: string; systolic: number; diastolic: number; pulse: number | null; measured_at: string }
type Hist = { id: string; hospital: string; visit_date: string; doctor: string | null; chief_complaint: string | null; diagnosis: string | null; treatment: string | null; follow_up_date: string | null; status: string }

const getDtxStatus = (v: number) => {
  if (v < 70)  return { label: 'ต่ำ',   color: 'text-[var(--hw-blue)]',   bg: 'bg-[var(--hw-blue-bg)]'  }
  if (v <= 99) return { label: 'ปกติ',  color: 'text-[var(--hw-green)]',  bg: 'bg-[var(--hw-mint-bg)]'  }
  if (v <= 125)return { label: 'ระวัง', color: 'text-yellow-600',          bg: 'bg-yellow-100'            }
  return               { label: 'สูง',   color: 'text-red-600',            bg: 'bg-red-100'               }
}

const getBpStatus = (s: number) => {
  if (s < 90)  return { label: 'ต่ำ',   color: 'text-[var(--hw-blue)]',   bg: 'bg-[var(--hw-blue-bg)]'  }
  if (s <= 120)return { label: 'ปกติ',  color: 'text-[var(--hw-green)]',  bg: 'bg-[var(--hw-mint-bg)]'  }
  if (s <= 139)return { label: 'ระวัง', color: 'text-yellow-600',          bg: 'bg-yellow-100'            }
  return               { label: 'สูง',   color: 'text-red-600',            bg: 'bg-red-100'               }
}

const getTrend = (cur: number, prev: number) => {
  const d = cur - prev
  if (Math.abs(d) < 1) return { Icon: IconMinus, color: 'text-[var(--muted)]', text: 'เท่าเดิม' }
  if (d > 0) return { Icon: IconTrendingUp, color: 'text-red-500', text: '+' + d.toFixed(0) }
  return { Icon: IconTrendingDown, color: 'text-[var(--hw-green)]', text: d.toFixed(0) }
}

const inputClass = 'w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm bg-[var(--card-bg)] focus:outline-none focus:border-[var(--hw-green)]'
const labelClass = 'text-sm text-[var(--muted)] mb-1.5 block font-medium'

export default function RecordPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('dtx')
  const [loading, setLoading] = useState(true)
  const [dtxRecords, setDtxRecords] = useState<Dtx[]>([])
  const [bpRecords, setBpRecords] = useState<Bp[]>([])
  const [histRecords, setHistRecords] = useState<Hist[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const now16 = () => new Date().toISOString().slice(0, 16)
  const today = () => new Date().toISOString().slice(0, 10)

  const [dtxForm, setDtxForm] = useState({ value: '', mealStatus: 'fasting', measuredAt: now16(), note: '' })
  const [bpForm, setBpForm] = useState({ systolic: '', diastolic: '', pulse: '', measuredAt: now16() })
  const [histForm, setHistForm] = useState({ visit_date: today(), hospital: '', doctor: '', chief_complaint: '', diagnosis: '', treatment: '', follow_up_date: '' })

  useEffect(() => {
    if (!user) return
    Promise.all([
      sb.from('hw_dtx_records').select('id,value,meal_status,measured_at,note').eq('user_id', user.id).order('measured_at', { ascending: false }).limit(30),
      sb.from('hw_bp_records').select('id,systolic,diastolic,pulse,measured_at').eq('user_id', user.id).order('measured_at', { ascending: false }).limit(30),
      sb.from('hw_medical_history').select('id,hospital,visit_date,doctor,chief_complaint,diagnosis,treatment,follow_up_date,status').eq('user_id', user.id).order('visit_date', { ascending: false }).limit(20),
    ]).then(([d, b, h]) => {
      setDtxRecords((d.data ?? []) as Dtx[])
      setBpRecords((b.data ?? []) as Bp[])
      setHistRecords((h.data ?? []) as Hist[])
      setLoading(false)
    })
  }, [user])

  const dtxChartData = useMemo(() =>
    [...dtxRecords].reverse().slice(-20).map(r => ({
      date: new Date(r.measured_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
      value: r.value,
    })), [dtxRecords])

  const bpChartData = useMemo(() =>
    [...bpRecords].reverse().slice(-20).map(r => ({
      date: new Date(r.measured_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
      systolic: r.systolic, diastolic: r.diastolic,
    })), [bpRecords])

  const dtxTrend = dtxRecords.length >= 2 ? getTrend(dtxRecords[0].value, dtxRecords[1].value) : null
  const bpTrend  = bpRecords.length >= 2  ? getTrend(bpRecords[0].systolic, bpRecords[1].systolic) : null

  async function saveDtx() {
    if (!dtxForm.value || !user) return
    setSaving(true)
    const { data } = await sb.from('hw_dtx_records').insert({
      user_id: user.id, value: parseFloat(dtxForm.value),
      meal_status: dtxForm.mealStatus, measured_at: dtxForm.measuredAt,
      note: dtxForm.note || null,
    }).select('id,value,meal_status,measured_at,note').single()
    if (data) setDtxRecords(p => [data as Dtx, ...p])
    setDtxForm({ value: '', mealStatus: 'fasting', measuredAt: now16(), note: '' })
    setShowForm(false); setSaving(false)
  }

  async function saveBp() {
    if (!bpForm.systolic || !bpForm.diastolic || !user) return
    setSaving(true)
    const { data } = await sb.from('hw_bp_records').insert({
      user_id: user.id, systolic: parseInt(bpForm.systolic),
      diastolic: parseInt(bpForm.diastolic),
      pulse: bpForm.pulse ? parseInt(bpForm.pulse) : null,
      measured_at: bpForm.measuredAt,
    }).select('id,systolic,diastolic,pulse,measured_at').single()
    if (data) setBpRecords(p => [data as Bp, ...p])
    setBpForm({ systolic: '', diastolic: '', pulse: '', measuredAt: now16() })
    setShowForm(false); setSaving(false)
  }

  async function saveHist() {
    if (!histForm.hospital || !user) return
    setSaving(true)
    const { data } = await sb.from('hw_medical_history').insert({
      user_id: user.id, visit_date: histForm.visit_date,
      hospital: histForm.hospital, doctor: histForm.doctor || null,
      chief_complaint: histForm.chief_complaint || null,
      diagnosis: histForm.diagnosis || null,
      treatment: histForm.treatment || null,
      follow_up_date: histForm.follow_up_date || null,
      note: null, status: 'pending', source: 'patient',
    }).select('id,hospital,visit_date,doctor,chief_complaint,diagnosis,treatment,follow_up_date,status').single()
    if (data) setHistRecords(p => [data as Hist, ...p])
    setHistForm({ visit_date: today(), hospital: '', doctor: '', chief_complaint: '', diagnosis: '', treatment: '', follow_up_date: '' })
    setShowForm(false); setSaving(false)
  }

  const TAB_COLOR: Record<Tab, string> = {
    dtx: 'var(--hw-orange)', bp: 'var(--hw-blue)', history: '#7c3aed',
  }

  return (
    <div>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ background: 'linear-gradient(135deg, var(--hw-green) 0%, var(--hw-green-dk) 100%)' }}>
        <h1 className="text-white text-lg font-bold mb-4">{'📝 บันทึกสุขภาพ'}</h1>
        <div className="flex gap-2">
          {([['dtx', '🩸 น้ำตาล'], ['bp', '💙 ความดัน'], ['history', '📋 ประวัติ']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setShowForm(false) }}
              className={'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ' +
                (tab === k ? 'bg-white text-[var(--hw-green)]' : 'bg-white/20 text-white')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 pb-10 max-w-xl mx-auto">
        {/* Add button */}
        <button onClick={() => setShowForm(v => !v)}
          className="w-full text-white rounded-2xl py-3 flex items-center justify-center gap-2 font-medium mb-4"
          style={{ background: TAB_COLOR[tab] }}>
          <IconPlus size={18}/>
          {tab === 'dtx' ? 'บันทึกค่าน้ำตาล' : tab === 'bp' ? 'บันทึกความดัน' : 'บันทึกการรักษา'}
        </button>

        {/* DTX Form */}
        {showForm && tab === 'dtx' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 mb-4 space-y-4">
            <div><label className={labelClass}>{'ค่าน้ำตาล (mg/dL) *'}</label>
              <input type="number" value={dtxForm.value} onChange={e => setDtxForm({...dtxForm, value: e.target.value})} placeholder="เช่น 95" className={inputClass}/></div>
            <div><label className={labelClass}>{'ช่วงเวลา'}</label>
              <select value={dtxForm.mealStatus} onChange={e => setDtxForm({...dtxForm, mealStatus: e.target.value})} className={inputClass}>
                {Object.entries(MEAL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label className={labelClass}>{'วันและเวลา'}</label>
              <input type="datetime-local" value={dtxForm.measuredAt} onChange={e => setDtxForm({...dtxForm, measuredAt: e.target.value})} className={inputClass}/></div>
            <div><label className={labelClass}>{'หมายเหตุ'}</label>
              <input value={dtxForm.note} onChange={e => setDtxForm({...dtxForm, note: e.target.value})} placeholder="เช่น หลังออกกำลังกาย" className={inputClass}/></div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-[var(--border)] rounded-xl py-3 text-sm text-[var(--muted)]">{'ยกเลิก'}</button>
              <button onClick={saveDtx} disabled={saving} className="flex-1 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50" style={{ background: TAB_COLOR.dtx }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        )}

        {/* BP Form */}
        {showForm && tab === 'bp' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 mb-4 space-y-4">
            <div><label className={labelClass}>{'ค่าบน (mmHg) *'}</label>
              <input type="number" value={bpForm.systolic} onChange={e => setBpForm({...bpForm, systolic: e.target.value})} placeholder="เช่น 120" className={inputClass}/></div>
            <div><label className={labelClass}>{'ค่าล่าง (mmHg) *'}</label>
              <input type="number" value={bpForm.diastolic} onChange={e => setBpForm({...bpForm, diastolic: e.target.value})} placeholder="เช่น 80" className={inputClass}/></div>
            <div><label className={labelClass}>{'ชีพจร (bpm)'}</label>
              <input type="number" value={bpForm.pulse} onChange={e => setBpForm({...bpForm, pulse: e.target.value})} placeholder="เช่น 72" className={inputClass}/></div>
            <div><label className={labelClass}>{'วันและเวลา'}</label>
              <input type="datetime-local" value={bpForm.measuredAt} onChange={e => setBpForm({...bpForm, measuredAt: e.target.value})} className={inputClass}/></div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-[var(--border)] rounded-xl py-3 text-sm text-[var(--muted)]">{'ยกเลิก'}</button>
              <button onClick={saveBp} disabled={saving} className="flex-1 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50" style={{ background: TAB_COLOR.bp }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        )}

        {/* History Form */}
        {showForm && tab === 'history' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 mb-4 space-y-4">
            <p className="text-xs text-purple-600">{'⏳ รอการยืนยันจากคลินิกก่อนแสดงผล'}</p>
            <div><label className={labelClass}>{'วันที่พบแพทย์ *'}</label>
              <input type="date" value={histForm.visit_date} onChange={e => setHistForm({...histForm, visit_date: e.target.value})} className={inputClass}/></div>
            <div><label className={labelClass}>{'โรงพยาบาล/คลินิก *'}</label>
              <input value={histForm.hospital} onChange={e => setHistForm({...histForm, hospital: e.target.value})} placeholder="เช่น HappiWell Clinic" className={inputClass}/></div>
            <div><label className={labelClass}>{'แพทย์ผู้รักษา'}</label>
              <input value={histForm.doctor} onChange={e => setHistForm({...histForm, doctor: e.target.value})} placeholder="เช่น นพ.สมชาย" className={inputClass}/></div>
            <div><label className={labelClass}>{'อาการที่มา'}</label>
              <input value={histForm.chief_complaint} onChange={e => setHistForm({...histForm, chief_complaint: e.target.value})} placeholder="เช่น ปวดหัว มีไข้" className={inputClass}/></div>
            <div><label className={labelClass}>{'การวินิจฉัย'}</label>
              <input value={histForm.diagnosis} onChange={e => setHistForm({...histForm, diagnosis: e.target.value})} className={inputClass}/></div>
            <div><label className={labelClass}>{'การรักษา'}</label>
              <textarea value={histForm.treatment} onChange={e => setHistForm({...histForm, treatment: e.target.value})} rows={3} className={inputClass + ' resize-none'}/></div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-[var(--border)] rounded-xl py-3 text-sm text-[var(--muted)]">{'ยกเลิก'}</button>
              <button onClick={saveHist} disabled={saving} className="flex-1 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50" style={{ background: TAB_COLOR.history }}>
                {saving ? 'กำลังบันทึก...' : 'ส่งเพื่อยืนยัน'}</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>
        ) : tab === 'dtx' ? (
          <div className="space-y-4">
            {dtxRecords.length > 0 && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--muted)]">{'ค่าล่าสุด'}</p>
                    <p className={"text-3xl font-bold " + getDtxStatus(dtxRecords[0].value).color}>
                      {dtxRecords[0].value} <span className="text-sm font-normal text-[var(--muted)]">{'mg/dL'}</span>
                    </p>
                    <span className={"text-xs px-2 py-0.5 rounded-full " + getDtxStatus(dtxRecords[0].value).bg + " " + getDtxStatus(dtxRecords[0].value).color}>
                      {getDtxStatus(dtxRecords[0].value).label}
                    </span>
                  </div>
                  {dtxTrend && dtxRecords.length >= 2 && (
                    <div className="text-right">
                      <p className="text-xs text-[var(--muted)] mb-1">{'เทียบครั้งก่อน'}</p>
                      <div className={"flex items-center gap-1 justify-end " + dtxTrend.color}>
                        <dtxTrend.Icon size={20}/><span className="text-lg font-bold">{dtxTrend.text}</span>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{'ครั้งก่อน: '}{dtxRecords[1].value}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {dtxChartData.length > 1 && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">{'📈 แนวโน้มน้ำตาล'}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dtxChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }}/>
                      <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']}/>
                      <Tooltip formatter={(v) => [String(v ?? '') + ' mg/dL', 'น้ำตาล']}/>
                      <ReferenceLine y={70}  stroke="#3b82f6" strokeDasharray="4 4" label={{ value: '70',  fontSize: 9, fill: '#3b82f6' }}/>
                      <ReferenceLine y={99}  stroke="#1a8a6e" strokeDasharray="4 4" label={{ value: '99',  fontSize: 9, fill: '#1a8a6e' }}/>
                      <ReferenceLine y={126} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '126', fontSize: 9, fill: '#ef4444' }}/>
                      <Line type="monotone" dataKey="value" stroke="#ef9f27" strokeWidth={2} dot={{ fill: '#ef9f27', r: 3 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-blue-400 border-dashed inline-block"/>{'<70 ต่ำ'}</span>
                  <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-[#1a8a6e] border-dashed inline-block"/>{'70-99 ปกติ'}</span>
                  <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-red-400 border-dashed inline-block">{'>126 สูง'}</span></span>
                </div>
              </div>
            )}
            {dtxRecords.length === 0 ? (
              <div className="text-center py-10"><p className="text-4xl mb-3">{'🩸'}</p><p className="text-[var(--muted)] text-sm">{'ยังไม่มีข้อมูล'}</p></div>
            ) : (
              <div className="space-y-2">
                {dtxRecords.map(rec => {
                  const st = getDtxStatus(rec.value)
                  return (
                    <div key={rec.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center gap-3">
                      <div className={"w-14 h-12 rounded-xl " + st.bg + " flex items-center justify-center flex-shrink-0"}>
                        <span className={"text-base font-bold " + st.color}>{rec.value}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={"text-xs px-2 py-0.5 rounded-full " + st.bg + " " + st.color}>{st.label}</span>
                          <span className="text-xs text-[var(--muted)]">{MEAL_STATUS[rec.meal_status]}</span>
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-0.5">{new Date(rec.measured_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        {rec.note && <p className="text-xs text-[var(--muted)] mt-0.5">{rec.note}</p>}
                      </div>
                      <button onClick={async () => { await sb.from('hw_dtx_records').delete().eq('id', rec.id); setDtxRecords(p => p.filter(r => r.id !== rec.id)) }}
                        className="p-2 text-[var(--muted)] hover:text-red-400"><IconTrash size={16}/></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : tab === 'bp' ? (
          <div className="space-y-4">
            {bpRecords.length > 0 && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[var(--muted)]">{'ค่าล่าสุด'}</p>
                    <p className={"text-3xl font-bold " + getBpStatus(bpRecords[0].systolic).color}>
                      {bpRecords[0].systolic}/{bpRecords[0].diastolic} <span className="text-sm font-normal text-[var(--muted)]">{'mmHg'}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={"text-xs px-2 py-0.5 rounded-full " + getBpStatus(bpRecords[0].systolic).bg + " " + getBpStatus(bpRecords[0].systolic).color}>
                        {getBpStatus(bpRecords[0].systolic).label}
                      </span>
                      {bpRecords[0].pulse && <span className="text-xs text-[var(--muted)]">{'💓 '}{bpRecords[0].pulse}{' bpm'}</span>}
                    </div>
                  </div>
                  {bpTrend && bpRecords.length >= 2 && (
                    <div className="text-right">
                      <p className="text-xs text-[var(--muted)] mb-1">{'เทียบครั้งก่อน'}</p>
                      <div className={"flex items-center gap-1 justify-end " + bpTrend.color}>
                        <bpTrend.Icon size={20}/><span className="text-lg font-bold">{bpTrend.text}</span>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{'ครั้งก่อน: '}{bpRecords[1].systolic}/{bpRecords[1].diastolic}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {bpChartData.length > 1 && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">{'📈 แนวโน้มความดัน'}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bpChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }}/>
                      <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']}/>
                      <Tooltip formatter={(v, name) => [String(v ?? '') + ' mmHg', name === 'systolic' ? 'ค่าบน' : 'ค่าล่าง']}/>
                      <ReferenceLine y={120} stroke="#1a8a6e" strokeDasharray="4 4" label={{ value: '120', fontSize: 9, fill: '#1a8a6e' }}/>
                      <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '140', fontSize: 9, fill: '#ef4444' }}/>
                      <Line type="monotone" dataKey="systolic"  stroke="#378add" strokeWidth={2} dot={{ fill: '#378add', r: 3 }}/>
                      <Line type="monotone" dataKey="diastolic" stroke="#93c5fd" strokeWidth={2} dot={{ fill: '#93c5fd', r: 3 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#378add] inline-block"/>{'ค่าบน'}</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-300 inline-block"/>{'ค่าล่าง'}</span>
                  <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-red-400 border-dashed inline-block">{'>140 สูง'}</span></span>
                </div>
              </div>
            )}
            {bpRecords.length === 0 ? (
              <div className="text-center py-10"><p className="text-4xl mb-3">{'💙'}</p><p className="text-[var(--muted)] text-sm">{'ยังไม่มีข้อมูล'}</p></div>
            ) : (
              <div className="space-y-2">
                {bpRecords.map(rec => {
                  const st = getBpStatus(rec.systolic)
                  return (
                    <div key={rec.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center gap-3">
                      <div className={"w-20 h-12 rounded-xl " + st.bg + " flex items-center justify-center flex-shrink-0"}>
                        <span className={"text-sm font-bold " + st.color}>{rec.systolic}/{rec.diastolic}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={"text-xs px-2 py-0.5 rounded-full " + st.bg + " " + st.color}>{st.label}</span>
                          {rec.pulse ? <span className="text-xs text-[var(--muted)]">{'💓 '}{rec.pulse}{' bpm'}</span> : null}
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-0.5">{new Date(rec.measured_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </div>
                      <button onClick={async () => { await sb.from('hw_bp_records').delete().eq('id', rec.id); setBpRecords(p => p.filter(r => r.id !== rec.id)) }}
                        className="p-2 text-[var(--muted)] hover:text-red-400"><IconTrash size={16}/></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          histRecords.length === 0 ? (
            <div className="text-center py-10"><p className="text-4xl mb-3">{'📋'}</p><p className="text-[var(--muted)] text-sm">{'ยังไม่มีประวัติการรักษา'}</p></div>
          ) : (
            <div className="space-y-2">
              {histRecords.map(rec => (
                <div key={rec.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
                  <button className="w-full px-4 py-3 flex items-center gap-3 text-left"
                    onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 text-lg">{'🏥'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{rec.hospital}</p>
                        {rec.status === 'pending' && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex-shrink-0">{'รอยืนยัน'}</span>}
                      </div>
                      <p className="text-xs text-[var(--muted)]">{new Date(rec.visit_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</p>
                      {rec.chief_complaint && <p className="text-xs text-[var(--muted)] mt-0.5">{rec.chief_complaint}</p>}
                    </div>
                    {expandedId === rec.id ? <IconChevronUp size={16} className="text-[var(--muted)]"/> : <IconChevronDown size={16} className="text-[var(--muted)]"/>}
                  </button>
                  {expandedId === rec.id && (
                    <div className="px-4 pb-4 border-t border-[var(--border)] space-y-2 pt-3">
                      {rec.doctor && <p className="text-xs text-[var(--muted)]">{'👨‍⚕️ '}{rec.doctor}</p>}
                      {rec.diagnosis && <p className="text-xs text-[var(--muted)]">{'🔍 '}{rec.diagnosis}</p>}
                      {rec.treatment && <p className="text-xs text-[var(--muted)]">{'💉 '}{rec.treatment}</p>}
                      {rec.follow_up_date && <p className="text-xs text-purple-600">{'📅 นัดติดตาม: '}{new Date(rec.follow_up_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
