'use client'
import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import {
  IconArrowLeft, IconClock, IconTrendingUp, IconTrendingDown, IconMinus,
  IconChevronDown, IconChevronUp, IconInfoCircle,
} from '@tabler/icons-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type LabResult = {
  id: string; user_id: string; test_date: string; hospital: string | null
  test_name: string; value: number | null; unit: string | null
  ref_min: number | null; ref_max: number | null
  status: 'normal' | 'warning' | 'critical'; note: string | null
  approval_status: string; source: string; sort_order: number | null
}

const STATUS_MAP = {
  normal:   { label: 'ปกติ ✓',  color: 'text-[var(--hw-green)]', bg: 'bg-[#1a8a6e]/15', dot: 'bg-[var(--hw-green)]'  },
  warning:  { label: 'ระวัง ↑', color: 'text-yellow-400',        bg: 'bg-yellow-500/15', dot: 'bg-yellow-500'         },
  critical: { label: 'สูง ↑',   color: 'text-red-400',           bg: 'bg-red-500/15',    dot: 'bg-red-500'            },
}

const CATEGORIES: Record<string, { label: string; emoji: string; tests: string[] }> = {
  blood:   { label: 'ความสมบูรณ์ของเลือด (CBC)', emoji: '🩸', tests: ['WBC Count','RBC Count','Hemoglobin','Hematocrit','MCV','MCH','MCHC','RDW','Platelet Count','Neutrophil','Lymphocyte','Monocyte','Eosinophil','Basophil'] },
  sugar:   { label: 'น้ำตาลในเลือด',              emoji: '🍬', tests: ['Glucose','FBS','HbA1c'] },
  lipid:   { label: 'ไขมันในเลือด',               emoji: '🫀', tests: ['Cholesterol Total','Triglyceride','HDL-Cholesterol','LDL-Cholesterol'] },
  kidney:  { label: 'ตับ / ไต',                   emoji: '🫁', tests: ['Creatinine','BUN','eGFR','Uric acid','SGOT(AST)','SGPT(ALT)','Alkaline phosphatase','Total Protein','Albumin','Total bilirubin'] },
  immune:  { label: 'ภูมิคุ้มกัน',                emoji: '🛡️', tests: ['VDRL','HBs Ag','HBs Ab'] },
}

const TEST_INFO: Record<string, { desc: string; tip: string }> = {
  'FBS':               { desc: 'น้ำตาลในเลือดหลังอดอาหาร 8 ชั่วโมง', tip: 'ค่าปกติ <100 mg/dL' },
  'HbA1c':            { desc: 'น้ำตาลสะสมเฉลี่ย 3 เดือน',            tip: 'ค่าปกติ <5.7%' },
  'Cholesterol Total':{ desc: 'ไขมันรวมในเลือด',                      tip: 'ควรต่ำกว่า 200 mg/dL' },
  'LDL-Cholesterol':  { desc: 'ไขมันเลว สะสมในหลอดเลือด',            tip: 'ควรต่ำกว่า 130 mg/dL' },
  'HDL-Cholesterol':  { desc: 'ไขมันดี ช่วยขจัดไขมันเลว',            tip: 'ยิ่งสูงยิ่งดี >60 mg/dL' },
  'Creatinine':       { desc: 'บ่งบอกการทำงานของไต',                   tip: 'สูงแสดงว่าไตอาจทำงานได้ไม่ดี' },
  'Hemoglobin':       { desc: 'ฮีโมโกลบิน โปรตีนในเม็ดเลือดแดง',     tip: 'ต่ำบ่งชี้ภาวะโลหิตจาง' },
  'SGPT(ALT)':        { desc: 'เอนไซม์ตับที่จำเพาะ',                  tip: 'สูงบ่งชี้ตับอักเสบ' },
  'Uric acid':        { desc: 'กรดยูริก ของเสียจากพิวรีน',            tip: 'สูงเสี่ยงโรคเกาต์' },
}

function getCategoryKey(testName: string): string {
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (cat.tests.some(t => testName.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(testName.toLowerCase()))) return key
  }
  return 'other'
}

const inputClass = 'w-full border border-[var(--border)] rounded-[10px] px-4 py-3 text-sm bg-[var(--card-bg)] focus:outline-none focus:border-[var(--hw-green)]'
const labelClass = 'text-sm text-[var(--muted)] mb-1.5 block font-medium'

export default function LabResultsPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState<LabResult[]>([])
  const [pending, setPending] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChart, setSelectedChart] = useState<string | null>(null)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null)
  useEffect(() => {
    if (!user) return
    Promise.all([
      sb.from('hw_lab_results').select('*').eq('user_id', user.id).eq('approval_status', 'approved').order('test_date', { ascending: false }).order('sort_order', { ascending: true }),
      sb.from('hw_lab_results').select('id,test_name,test_date').eq('user_id', user.id).eq('approval_status', 'pending'),
    ]).then(([a, p]) => {
      const approved = (a.data ?? []) as LabResult[]
      setRecords(approved)
      setPending((p.data ?? []) as LabResult[])
      if (approved.length > 0) {
        const tests = [...new Set(approved.filter(r => r.value !== null).map(r => r.test_name))]
        setSelectedChart(tests[0] ?? null)
      }
      setLoading(false)
    })
  }, [user])

  const grouped = useMemo(() =>
    records.reduce((acc: Record<string, LabResult[]>, rec) => {
      if (!acc[rec.test_date]) acc[rec.test_date] = []
      acc[rec.test_date].push(rec); return acc
    }, {}), [records])

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const latestDate = dates[0]; const prevDate = dates[1]

  const latestByCategory = useMemo(() => {
    if (!latestDate) return {}
    const cats: Record<string, LabResult[]> = {}
    ;(grouped[latestDate] || []).forEach(item => {
      const key = getCategoryKey(item.test_name)
      if (!cats[key]) cats[key] = []
      cats[key].push(item)
    })
    return cats
  }, [grouped, latestDate])

  const chartData = useMemo(() => {
    if (!selectedChart) return []
    return records.filter(r => r.test_name === selectedChart && r.value !== null)
      .sort((a, b) => a.test_date.localeCompare(b.test_date))
      .map(r => ({ date: r.test_date.slice(0, 7), value: r.value, ref_max: r.ref_max }))
  }, [records, selectedChart])

  const uniqueTests = [...new Set(records.filter(r => r.value !== null).map(r => r.test_name))]

  const getTrend = (testName: string) => {
    if (!latestDate || !prevDate) return null
    const latest = grouped[latestDate]?.find(r => r.test_name === testName)
    const prev = grouped[prevDate]?.find(r => r.test_name === testName)
    if (!latest?.value || !prev?.value) return null
    const diff = latest.value - prev.value
    if (Math.abs(diff) < 0.1) return { Icon: IconMinus, color: 'text-[var(--muted)]', text: '' }
    if (diff > 0) return { Icon: IconTrendingUp, color: 'text-red-500', text: '+' + diff.toFixed(1) }
    return { Icon: IconTrendingDown, color: 'text-[var(--hw-green)]', text: diff.toFixed(1) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/health-book" className="p-2 rounded-full hover:bg-[var(--border)] transition-colors flex-shrink-0">
          <IconArrowLeft size={20}/>
        </Link>
        <div>
          <p className="text-sm text-[var(--muted)]">{'สมุดสุขภาพ'}</p>
          <h1 className="text-xl font-bold">{'ประวัติผลตรวจ'}</h1>
        </div>
      </div>

      <div className="space-y-4">

        {pending.length > 0 && (
          <div className="bg-[var(--hw-yellow-bg)] border border-yellow-200 rounded-[14px] p-4">
            <div className="flex items-center gap-2 mb-2"><IconClock size={16} className="text-yellow-500"/><p className="text-sm font-medium text-yellow-600">{'รอการยืนยันจากคลินิก ('}{pending.length}{')'}</p></div>
            {pending.map(rec => (
              <div key={rec.id} className="flex items-center justify-between py-1.5 border-b border-yellow-100 last:border-0">
                <p className="text-sm">{rec.test_name}</p>
                <span className="text-xs bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full">{'รอยืนยัน'}</span>
              </div>
            ))}
          </div>
        )}

        {records.length === 0 ? (
          <div className="text-center py-10"><p className="text-4xl mb-3">{'🔬'}</p><p className="text-[var(--muted)] text-sm">{'ยังไม่มีผลตรวจ'}</p></div>
        ) : (
          <>
            {/* ผลตรวจล่าสุด */}
            {latestDate && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden">
                <div className="px-4 py-3 bg-[var(--background)] border-b border-[var(--border)]">
                  <p className="font-semibold text-sm">{'ผลตรวจล่าสุด'}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {new Date(latestDate).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                    {grouped[latestDate]?.[0]?.hospital ? ' · ' + grouped[latestDate][0].hospital : ''}
                  </p>
                </div>
                {Object.entries(latestByCategory).map(([catKey, items]) => {
                  const catInfo = CATEGORIES[catKey] || { label: 'อื่นๆ', emoji: '📋' }
                  return (
                    <div key={catKey}>
                      <div className="px-4 py-2 bg-[var(--background)] border-b border-[var(--border)]">
                        <p className="text-xs font-bold text-[var(--muted)]">{catInfo.emoji}{' '}{catInfo.label}</p>
                      </div>
                      {items.map((rec, idx) => {
                        const st = STATUS_MAP[rec.status] || STATUS_MAP.normal
                        const trend = getTrend(rec.test_name)
                        const info = TEST_INFO[rec.test_name]
                        const isInfoOpen = expandedInfo === rec.id
                        return (
                          <div key={rec.id} className={idx < items.length - 1 ? 'border-b border-[var(--border)]' : ''}>
                            <div className="flex items-center px-4 py-3 gap-3">
                              <div className={"w-2 h-2 rounded-full flex-shrink-0 " + st.dot}/>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium truncate">{rec.test_name}</p>
                                  {info && (
                                    <button onClick={() => setExpandedInfo(isInfoOpen ? null : rec.id)}>
                                      <IconInfoCircle size={14} className="text-[var(--muted)] flex-shrink-0"/>
                                    </button>
                                  )}
                                </div>
                                {rec.ref_min != null && rec.ref_max != null
                                  ? <p className="text-xs text-[var(--muted)]">{'ค่าปกติ: '}{rec.ref_min}{'–'}{rec.ref_max}{' '}{rec.unit ?? ''}</p>
                                  : rec.ref_max != null
                                  ? <p className="text-xs text-[var(--muted)]">{'ค่าปกติ: <'}{rec.ref_max}{' '}{rec.unit ?? ''}</p>
                                  : null}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="flex items-center gap-1 justify-end">
                                  <p className={"text-sm font-bold " + st.color}>{rec.value ?? '—'}</p>
                                  <span className="text-xs text-[var(--muted)]">{rec.unit ?? ''}</span>
                                  {trend && <trend.Icon size={12} className={trend.color}/>}
                                </div>
                                <span className={"text-xs px-2 py-0.5 rounded-full " + st.bg + " " + st.color}>{st.label}</span>
                              </div>
                            </div>
                            {isInfoOpen && info && (
                              <div className="mx-4 mb-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-3">
                                <p className="text-xs font-medium text-[var(--hw-blue-dk)] mb-1">{info.desc}</p>
                                <p className="text-xs text-[var(--hw-blue)]">{'💡 '}{info.tip}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}

            {/* กราฟแนวโน้ม */}
            {uniqueTests.length > 0 && chartData.length > 1 && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">{'📈 แนวโน้มผลตรวจ'}</p>
                <div className="flex gap-2 flex-wrap mb-4">
                  {uniqueTests.slice(0, 8).map(test => (
                    <button key={test} onClick={() => setSelectedChart(test)}
                      className={"text-xs px-3 py-1.5 rounded-full font-medium transition-colors " +
                        (selectedChart === test ? 'text-white' : 'bg-[var(--background)] text-[var(--muted)]')}
                      style={selectedChart === test ? { background: 'var(--hw-green)' } : {}}>
                      {test}
                    </button>
                  ))}
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }}/>
                      <YAxis tick={{ fontSize: 10 }}/>
                      <Tooltip formatter={(v) => [String(v ?? '') + ' ' + (records.find(r => r.test_name === selectedChart)?.unit || ''), selectedChart ?? '']}/>
                      {chartData[0]?.ref_max && (
                        <ReferenceLine y={chartData[0].ref_max} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'เกณฑ์', fontSize: 9, fill: '#ef4444' }}/>
                      )}
                      <Line type="monotone" dataKey="value" stroke="#1a8a6e" strokeWidth={2} dot={{ fill: '#1a8a6e', r: 4 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ประวัติย้อนหลัง */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
                <p className="font-semibold text-sm">{'📅 ประวัติตรวจย้อนหลัง'}</p>
              </div>
              {dates.map((date, idx) => {
                const items = grouped[date]
                const abnormal = items.filter(r => r.status !== 'normal').length
                const isExpanded = expandedDates[date]
                return (
                  <div key={date} className={idx < dates.length - 1 ? 'border-b border-[var(--border)]' : ''}>
                    <button className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[var(--background)]"
                      onClick={() => setExpandedDates(p => ({...p, [date]: !p[date]}))}>
                      <div className={"w-2.5 h-2.5 rounded-full flex-shrink-0 " + (abnormal > 0 ? 'bg-red-400' : 'bg-[var(--hw-green)]')}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{new Date(date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {items[0]?.hospital || 'ไม่ระบุสถานที่'}{' · '}{items.length}{' รายการ'}
                          {abnormal > 0 && <span className="text-red-400 ml-1">{'· '}{abnormal}{' ค่าผิดปกติ'}</span>}
                        </p>
                      </div>
                      {isExpanded ? <IconChevronUp size={16} className="text-[var(--muted)]"/> : <IconChevronDown size={16} className="text-[var(--muted)]"/>}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-1 border-t border-[var(--border)]">
                        {items.map(rec => {
                          const st = STATUS_MAP[rec.status] || STATUS_MAP.normal
                          return (
                            <div key={rec.id} className="flex items-center justify-between py-1">
                              <p className="text-xs text-[var(--muted)]">{rec.test_name}</p>
                              <span className={"text-xs font-medium " + st.color}>{rec.value}{' '}{rec.unit ?? ''}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
