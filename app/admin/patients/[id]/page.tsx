'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconArrowLeft, IconShieldCheck, IconShieldOff,
  IconPill, IconVaccine, IconTestPipe, IconNotes,
  IconCheck, IconX, IconUser, IconId, IconClock,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

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

type KycRecord = {
  id: string; id_type: string; id_number: string; storage_path: string
  status: string; rejection_reason: string | null; submitted_at: string
}

type Medication   = { id: string; name: string; dosage: string | null; frequency: string | null; start_date: string | null; hospital: string | null; status: string }
type Vaccine      = { id: string; vaccine_name: string; dose_number: number | null; vaccinated_date: string | null; hospital: string | null; status: string }
type LabResult    = { id: string; test_name: string; test_date: string | null; value: number | null; unit: string | null; hospital: string | null; approval_status: string }
type MedHistory   = { id: string; visit_date: string | null; hospital: string | null; chief_complaint: string | null; diagnosis: string | null; status: string }

const TABS = [
  { key: 'kyc',     label: 'ยืนยันตัวตน',   Icon: IconId },
  { key: 'info',    label: 'ข้อมูลส่วนตัว', Icon: IconUser },
  { key: 'med',     label: 'ยา',            Icon: IconPill },
  { key: 'vaccine', label: 'วัคซีน',         Icon: IconVaccine },
  { key: 'lab',     label: 'ผลตรวจ',         Icon: IconTestPipe },
  { key: 'history', label: 'ประวัติ',         Icon: IconNotes },
]
const GENDER: Record<string, string> = { male: 'ชาย', female: 'หญิง', other: 'อื่น' }

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [tab, setTab] = useState('kyc')
  const [patient, setPatient] = useState<Patient | null>(null)
  const [kyc, setKyc] = useState<KycRecord | null | undefined>(undefined)
  const [idCardUrl, setIdCardUrl] = useState<string | null>(null)
  const [meds, setMeds] = useState<Medication[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [labs, setLabs] = useState<LabResult[]>([])
  const [history, setHistory] = useState<MedHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const load = useCallback(async () => {
    const [p, k, m, v, l, h] = await Promise.all([
      sb.from('hw_users').select('id,full_name,first_name,last_name,title,phone,date_of_birth,gender,blood_type,weight,height,allergies,identity_verified,email').eq('id', id).single(),
      sb.from('hw_identity_verifications').select('id,id_type,id_number,storage_path,status,rejection_reason,submitted_at').eq('user_id', id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
      sb.from('hw_medications').select('id,name,dosage,frequency,start_date,hospital,status').eq('user_id', id).order('created_at', { ascending: false }),
      sb.from('hw_vaccines').select('id,vaccine_name,dose_number,vaccinated_date,hospital,status').eq('user_id', id).order('created_at', { ascending: false }),
      sb.from('hw_lab_results').select('id,test_name,test_date,value,unit,hospital,approval_status').eq('user_id', id).order('created_at', { ascending: false }),
      sb.from('hw_medical_history').select('id,visit_date,hospital,chief_complaint,diagnosis,status').eq('user_id', id).order('created_at', { ascending: false }),
    ])
    setPatient(p.data as Patient)
    const kycData = k.data as KycRecord | null
    setKyc(kycData)
    if (kycData?.storage_path) {
      const { data: signed } = await sb.storage.from('identity-docs').createSignedUrl(kycData.storage_path, 3600)
      setIdCardUrl(signed?.signedUrl ?? null)
    }
    setMeds((m.data as Medication[]) ?? [])
    setVaccines((v.data as Vaccine[]) ?? [])
    setLabs((l.data as LabResult[]) ?? [])
    setHistory((h.data as MedHistory[]) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function approveKyc() {
    if (!kyc || !user) return
    setSaving('kyc')
    await Promise.all([
      sb.from('hw_identity_verifications').update({ status: 'verified', reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', kyc.id),
      sb.from('hw_users').update({ identity_verified: true }).eq('id', id),
    ])
    await load()
    setSaving(null)
  }

  async function rejectKyc() {
    if (!kyc || !user) return
    setSaving('kyc-reject')
    await sb.from('hw_identity_verifications').update({
      status: 'rejected',
      rejection_reason: rejectReason || 'เอกสารไม่ถูกต้อง',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', kyc.id)
    await load()
    setSaving(null)
    setShowRejectInput(false)
    setRejectReason('')
  }

  async function approveItem(table: string, itemId: string, approved: boolean) {
    setSaving(itemId)
    const col = table === 'hw_lab_results' ? 'approval_status' : 'status'
    await sb.from(table).update({ [col]: approved ? 'approved' : 'rejected' }).eq('id', itemId)
    await load()
    setSaving(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!patient) return <div className="p-8 text-center text-[var(--muted)]">{'ไม่พบข้อมูลคนไข้'}</div>

  const displayName = patient.full_name || `${patient.title ?? ''}${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim()
  const age = patient.date_of_birth ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null

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

      {/* KYC Tab */}
      {tab === 'kyc' && (
        <div>
          {kyc === undefined ? (
            <div className="h-32 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
          ) : !kyc ? (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-8 text-center">
              <IconShieldOff size={36} className="mx-auto text-[var(--muted)] opacity-30 mb-3" />
              <p className="text-sm font-medium">{'คนไข้ยังไม่ส่งเอกสารยืนยันตัวตน'}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{'แจ้งคนไข้ให้อัปโหลดบัตรประชาชนผ่านแอป'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status banner */}
              <div className={`rounded-[14px] p-4 flex items-center gap-3 ${
                kyc.status === 'verified' ? 'bg-[#e8f7f3] border border-[#1a8a6e]/30' :
                kyc.status === 'pending'  ? 'bg-[#fef9ec] border border-[#ef9f27]/30' :
                                            'bg-red-50 border border-red-200'}`}>
                {kyc.status === 'verified' ? <IconShieldCheck size={20} className="text-[#1a8a6e]" /> :
                 kyc.status === 'pending'  ? <IconClock size={20} className="text-[#ef9f27]" /> :
                                             <IconX size={20} className="text-red-500" />}
                <div>
                  <div className="font-semibold text-sm">
                    {kyc.status === 'verified' ? 'ยืนยันตัวตนแล้ว' : kyc.status === 'pending' ? 'รอตรวจสอบ' : 'ปฏิเสธแล้ว'}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {'ส่งเมื่อ '}{new Date(kyc.submitted_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  </div>
                </div>
              </div>

              {/* ID info */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] divide-y divide-[var(--border)]">
                <div className="flex items-center px-4 py-3 gap-4">
                  <span className="text-xs text-[var(--muted)] w-28 flex-shrink-0">{'ประเภทเอกสาร'}</span>
                  <span className="text-sm font-medium">{kyc.id_type === 'national_id' ? 'บัตรประชาชน' : 'พาสปอร์ต'}</span>
                </div>
                <div className="flex items-center px-4 py-3 gap-4">
                  <span className="text-xs text-[var(--muted)] w-28 flex-shrink-0">{'เลขที่'}</span>
                  <span className="text-sm font-mono">{kyc.id_number}</span>
                </div>
                {kyc.rejection_reason && (
                  <div className="flex items-center px-4 py-3 gap-4">
                    <span className="text-xs text-[var(--muted)] w-28 flex-shrink-0">{'เหตุผล'}</span>
                    <span className="text-sm text-red-500">{kyc.rejection_reason}</span>
                  </div>
                )}
              </div>

              {/* ID card image */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
                <p className="text-xs font-semibold text-[var(--muted)] mb-3 uppercase tracking-wider">{'รูปเอกสาร'}</p>
                {idCardUrl ? (
                  <a href={idCardUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={idCardUrl} alt="บัตรประชาชน"
                      className="w-full rounded-[10px] object-contain border border-[var(--border)] hover:opacity-95 transition-opacity cursor-zoom-in" />
                  </a>
                ) : (
                  <div className="w-full aspect-[1.586/1] rounded-[10px] bg-[var(--background)] flex items-center justify-center">
                    <p className="text-xs text-[var(--muted)]">{'ไม่พบรูปเอกสาร'}</p>
                  </div>
                )}
              </div>

              {/* Approve/Reject — only for pending */}
              {kyc.status === 'pending' && (
                <div className="space-y-2">
                  {!showRejectInput ? (
                    <div className="flex gap-2">
                      <button onClick={approveKyc} disabled={saving === 'kyc' || !idCardUrl}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] bg-[#1a8a6e] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity">
                        <IconShieldCheck size={16} />
                        {saving === 'kyc' ? 'กำลังบันทึก...' : 'ยืนยันตัวตน'}
                      </button>
                      <button onClick={() => setShowRejectInput(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] border border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
                        <IconX size={16} />{'ปฏิเสธ'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder={'ระบุเหตุผล (เช่น รูปไม่ชัด / เลขบัตรไม่ตรง)'}
                        className="w-full px-4 py-2.5 rounded-[10px] border border-red-300 text-sm focus:outline-none focus:border-red-500"
                      />
                      <div className="flex gap-2">
                        <button onClick={rejectKyc} disabled={saving === 'kyc-reject'}
                          className="flex-1 py-2.5 rounded-[12px] bg-red-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                          {saving === 'kyc-reject' ? 'กำลังบันทึก...' : 'ยืนยันการปฏิเสธ'}
                        </button>
                        <button onClick={() => setShowRejectInput(false)}
                          className="px-4 py-2.5 rounded-[12px] border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                          {'ยกเลิก'}
                        </button>
                      </div>
                    </div>
                  )}
                  {!idCardUrl && (
                    <p className="text-xs text-center text-[var(--muted)]">{'ต้องเห็นรูปเอกสารก่อนจึงจะยืนยันได้'}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
  items: T[]; statusKey: string
  renderRow: (item: T) => React.ReactNode
  onApprove: (id: string, approved: boolean) => void
  saving: string | null
}) {
  const S: Record<string, string> = { approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', pending: 'bg-yellow-100 text-yellow-700' }
  const L: Record<string, string> = { approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ', pending: 'รออนุมัติ' }
  if (items.length === 0) return <div className="text-center py-12 text-sm text-[var(--muted)]">{'ไม่มีข้อมูล'}</div>
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">{renderRow(item)}</div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${S[item.status] ?? 'bg-gray-100 text-gray-600'}`}>{L[item.status] ?? item.status}</span>
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
