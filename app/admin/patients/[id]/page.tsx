'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconArrowLeft, IconShieldCheck, IconShieldOff,
  IconPill, IconVaccine, IconTestPipe, IconNotes,
  IconCheck, IconX, IconUser,
} from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Patient = {
  id: string; full_name: string | null; first_name: string | null; last_name: string | null
  title: string | null; phone: string | null; date_of_birth: string | null
  gender: string | null; blood_type: string | null; weight: number | null
  height: number | null; allergies: string | null; identity_verified: boolean
  email: string | null
}

type Medication = { id: string; name: string; dosage: string | null; frequency: string | null; start_date: string | null; hospital: string | null; status: string }
type Vaccine    = { id: string; vaccine_name: string; dose_number: number | null; vaccinated_date: string | null; hospital: string | null; status: string }
type LabResult  = { id: string; test_name: string; test_date: string | null; value: number | null; unit: string | null; hospital: string | null; approval_status: string }
type MedHistory = { id: string; visit_date: string | null; hospital: string | null; chief_complaint: string | null; diagnosis: string | null; status: string }

const TABS = [
  { key: 'info',    label: 'ข้อมูลส่วนตัว', Icon: IconUser },
  { key: 'med',     label: 'ยา',           Icon: IconPill },
  { key: 'vaccine', label: 'วัคซีน',        Icon: IconVaccine },
  { key: 'lab',     label: 'ผลตรวจ',        Icon: IconTestPipe },
  { key: 'history', label: 'ประวัติ',        Icon: IconNotes },
]

const GENDER: Record<string, string> = { male: 'ชาย', female: 'หญิง', other: 'อื่น' }

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('info')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [meds, setMeds] = useState<Medication[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [labs, setLabs] = useState<LabResult[]>([])
  const [history, setHistory] = useState<MedHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [p, m, v, l, h] = await Promise.all([
      sb.from('hw_users').select('id,full_name,first_name,last_name,title,phone,date_of_birth,gender,blood_type,weight,height,allergies,identity_verified,email').eq('id', id).single(),
      sb.from('hw_medications').select('id,name,dosage,frequency,start_date,hospital,status').eq('user_id', id).order('created_at', { ascending: false }),
      sb.from('hw_vaccines').select('id,vaccine_name,dose_number,vaccinated_date,hospital,status').eq('user_id', id).order('created_at', { ascending: false }),
      sb.from('hw_lab_results').select('id,test_name,test_date,value,unit,hospital,approval_status').eq('user_id', id).order('created_at', { ascending: false }),
      sb.from('hw_medical_history').select('id,visit_date,hospital,chief_complaint,diagnosis,status').eq('user_id', id).order('created_at', { ascending: false }),
    ])
    setPatient(p.data as Patient)
    setMeds((m.data as Medication[]) ?? [])
    setVaccines((v.data as Vaccine[]) ?? [])
    setLabs((l.data as LabResult[]) ?? [])
    setHistory((h.data as MedHistory[]) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function approveItem(table: string, itemId: string, approved: boolean) {
    setSaving(itemId)
    const statusCol = table === 'hw_lab_results' ? 'approval_status' : 'status'
    const val = approved ? 'approved' : 'rejected'
    await sb.from(table).update({ [statusCol]: val }).eq('id', itemId)
    await load()
    setSaving(null)
  }

  async function verifyIdentity(verified: boolean) {
    setSaving('identity')
    await sb.from('hw_users').update({ identity_verified: verified }).eq('id', id)
    setPatient(p => p ? { ...p, identity_verified: verified } : p)
    setSaving(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!patient) return (
    <div className="p-8 text-center text-[var(--muted)]">{'ไม่พบข้อมูลคนไข้'}</div>
  )

  const displayName = patient.full_name || `${patient.title ?? ''}${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim()
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-12">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="p-1.5 -ml-1 text-[var(--muted)] hover:text-[var(--foreground)]">
          <IconArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg truncate">{displayName || '(ไม่ระบุชื่อ)'}</h1>
            {patient.identity_verified
              ? <IconShieldCheck size={18} className="text-[#1a8a6e] flex-shrink-0" />
              : <IconShieldOff size={18} className="text-orange-400 flex-shrink-0" />}
          </div>
          {age !== null && <p className="text-xs text-[var(--muted)]">{GENDER[patient.gender ?? ''] ?? ''} · {age} ปี</p>}
        </div>
        {/* Identity verification button */}
        {patient.identity_verified ? (
          <button onClick={() => verifyIdentity(false)} disabled={saving === 'identity'}
            className="text-xs px-3 py-1.5 rounded-full border border-[#1a8a6e] text-[#1a8a6e] hover:bg-red-50 hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-50">
            {'ยืนยันแล้ว'}
          </button>
        ) : (
          <button onClick={() => verifyIdentity(true)} disabled={saving === 'identity'}
            className="text-xs px-3 py-1.5 rounded-full bg-[#1a8a6e] text-white hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving === 'identity' ? '...' : 'ยืนยันตัวตน'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0
              ${tab === t.key ? 'bg-[#1a8a6e] text-white' : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
            <t.Icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && <InfoTab patient={patient} />}
      {tab === 'med' && <HealthTab items={meds} statusKey="status" renderRow={(m: Medication) => (
        <><span className="font-medium text-sm">{m.name}</span>
          <span className="text-xs text-[var(--muted)]">{[m.dosage, m.frequency, m.hospital].filter(Boolean).join(' · ')}</span></>
      )} onApprove={(id, ok) => approveItem('hw_medications', id, ok)} saving={saving} />}
      {tab === 'vaccine' && <HealthTab items={vaccines} statusKey="status" renderRow={(v: Vaccine) => (
        <><span className="font-medium text-sm">{v.vaccine_name}</span>
          <span className="text-xs text-[var(--muted)]">{[v.vaccinated_date, v.hospital].filter(Boolean).join(' · ')}</span></>
      )} onApprove={(id, ok) => approveItem('hw_vaccines', id, ok)} saving={saving} />}
      {tab === 'lab' && <HealthTab items={labs.map(l => ({ ...l, status: l.approval_status }))} statusKey="status" renderRow={(l: LabResult & { status: string }) => (
        <><span className="font-medium text-sm">{l.test_name}</span>
          <span className="text-xs text-[var(--muted)]">{[l.test_date, l.value != null ? `${l.value} ${l.unit ?? ''}` : null, l.hospital].filter(Boolean).join(' · ')}</span></>
      )} onApprove={(id, ok) => approveItem('hw_lab_results', id, ok)} saving={saving} />}
      {tab === 'history' && <HealthTab items={history} statusKey="status" renderRow={(h: MedHistory) => (
        <><span className="font-medium text-sm">{h.chief_complaint || h.diagnosis || '—'}</span>
          <span className="text-xs text-[var(--muted)]">{[h.visit_date, h.hospital].filter(Boolean).join(' · ')}</span></>
      )} onApprove={(id, ok) => approveItem('hw_medical_history', id, ok)} saving={saving} />}
    </div>
  )
}

function InfoTab({ patient }: { patient: Patient }) {
  const rows = [
    { label: 'อีเมล', value: patient.email },
    { label: 'เบอร์โทร', value: patient.phone },
    { label: 'วันเกิด', value: patient.date_of_birth },
    { label: 'กรุ๊ปเลือด', value: patient.blood_type },
    { label: 'น้ำหนัก', value: patient.weight ? `${patient.weight} กก.` : null },
    { label: 'ส่วนสูง', value: patient.height ? `${patient.height} ซม.` : null },
    { label: 'การแพ้ยา', value: patient.allergies },
  ]
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] divide-y divide-[var(--border)]">
      {rows.map(r => (
        <div key={r.label} className="flex items-center px-4 py-3 gap-4">
          <span className="text-xs text-[var(--muted)] w-24 flex-shrink-0">{r.label}</span>
          <span className="text-sm">{r.value || '—'}</span>
        </div>
      ))}
    </div>
  )
}

function HealthTab<T extends { id: string; status: string }>({
  items, renderRow, onApprove, saving,
}: {
  items: T[]
  statusKey: string
  renderRow: (item: T) => React.ReactNode
  onApprove: (id: string, approved: boolean) => void
  saving: string | null
}) {
  const STATUS_STYLE: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    pending:  'bg-yellow-100 text-yellow-700',
  }
  const STATUS_LABEL: Record<string, string> = {
    approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ', pending: 'รออนุมัติ',
  }

  if (items.length === 0) return (
    <div className="text-center py-12 text-[var(--muted)]">
      <p className="text-sm">{'ไม่มีข้อมูล'}</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              {renderRow(item)}
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLE[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
          </div>
          {item.status === 'pending' && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => onApprove(item.id, true)} disabled={saving === item.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] bg-[#1a8a6e] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                <IconCheck size={13} />{'อนุมัติ'}
              </button>
              <button onClick={() => onApprove(item.id, false)} disabled={saving === item.id}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] border border-red-300 text-red-500 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
                <IconX size={13} />{'ปฏิเสธ'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
