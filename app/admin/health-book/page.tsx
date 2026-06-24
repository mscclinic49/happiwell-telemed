'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import { IconCheck, IconX, IconClock, IconBook2 } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Tab = 'med' | 'vaccine' | 'lab' | 'history'

type PendingMed = {
  id: string; name: string; dosage: string | null; frequency: string | null
  created_at: string
  hw_users: { full_name: string | null; first_name: string | null } | null
}
type PendingVaccine = {
  id: string; vaccine_name: string; dose_number: number; vaccinated_date: string
  hospital: string | null; created_at: string
  hw_users: { full_name: string | null; first_name: string | null } | null
}
type PendingLab = {
  id: string; test_name: string; value: string; unit: string | null
  test_date: string; created_at: string
  hw_users: { full_name: string | null; first_name: string | null } | null
}
type PendingHistory = {
  id: string; hospital: string | null; visit_date: string; doctor: string | null
  chief_complaint: string | null; diagnosis: string | null; created_at: string
  hw_users: { full_name: string | null; first_name: string | null } | null
}

function patientName(u: { full_name: string | null; first_name: string | null } | null) {
  return u?.full_name || u?.first_name || '—'
}

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'med',     label: 'ยา',           emoji: '💊' },
  { key: 'vaccine', label: 'วัคซีน',       emoji: '💉' },
  { key: 'lab',     label: 'ผลตรวจ',       emoji: '🧪' },
  { key: 'history', label: 'ประวัติรักษา',  emoji: '🏥' },
]

export default function AdminHealthBookPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('med')
  const [loading, setLoading] = useState(true)
  const [meds,     setMeds]     = useState<PendingMed[]>([])
  const [vaccines, setVaccines] = useState<PendingVaccine[]>([])
  const [labs,     setLabs]     = useState<PendingLab[]>([])
  const [history,  setHistory]  = useState<PendingHistory[]>([])

  useEffect(() => {
    if (!user) return
    Promise.all([
      sb.from('hw_medications').select('id,name,dosage,frequency,created_at,hw_users(full_name,first_name)')
        .eq('status', 'pending').order('created_at'),
      sb.from('hw_vaccines').select('id,vaccine_name,dose_number,vaccinated_date,hospital,created_at,hw_users(full_name,first_name)')
        .eq('status', 'pending').order('created_at'),
      sb.from('hw_lab_results').select('id,test_name,value,unit,test_date,created_at,hw_users(full_name,first_name)')
        .eq('approval_status', 'pending').order('created_at'),
      sb.from('hw_medical_history').select('id,hospital,visit_date,doctor,chief_complaint,diagnosis,created_at,hw_users(full_name,first_name)')
        .eq('status', 'pending').order('created_at'),
    ]).then(([m, v, l, h]) => {
      setMeds((m.data as unknown as PendingMed[]) ?? [])
      setVaccines((v.data as unknown as PendingVaccine[]) ?? [])
      setLabs((l.data as unknown as PendingLab[]) ?? [])
      setHistory((h.data as unknown as PendingHistory[]) ?? [])
      setLoading(false)
    })
  }, [user])

  async function approveMed(id: string) {
    await sb.from('hw_medications').update({ status: 'approved' }).eq('id', id)
    setMeds(p => p.filter(x => x.id !== id))
  }
  async function rejectMed(id: string) {
    await sb.from('hw_medications').update({ status: 'rejected' }).eq('id', id)
    setMeds(p => p.filter(x => x.id !== id))
  }
  async function approveVaccine(id: string) {
    await sb.from('hw_vaccines').update({ status: 'approved' }).eq('id', id)
    setVaccines(p => p.filter(x => x.id !== id))
  }
  async function rejectVaccine(id: string) {
    await sb.from('hw_vaccines').update({ status: 'rejected' }).eq('id', id)
    setVaccines(p => p.filter(x => x.id !== id))
  }
  async function approveLab(id: string) {
    await sb.from('hw_lab_results').update({ approval_status: 'approved' }).eq('id', id)
    setLabs(p => p.filter(x => x.id !== id))
  }
  async function rejectLab(id: string) {
    await sb.from('hw_lab_results').update({ approval_status: 'rejected' }).eq('id', id)
    setLabs(p => p.filter(x => x.id !== id))
  }
  async function approveHistory(id: string) {
    await sb.from('hw_medical_history').update({ status: 'approved' }).eq('id', id)
    setHistory(p => p.filter(x => x.id !== id))
  }
  async function rejectHistory(id: string) {
    await sb.from('hw_medical_history').update({ status: 'rejected' }).eq('id', id)
    setHistory(p => p.filter(x => x.id !== id))
  }

  const counts = { med: meds.length, vaccine: vaccines.length, lab: labs.length, history: history.length }
  const totalPending = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-12">
      <div className="flex items-center gap-2 mb-1">
        <IconBook2 size={20} className="text-[#1a8a6e]" />
        <h1 className="text-lg font-bold">{'อนุมัติสมุดสุขภาพ'}</h1>
        {totalPending > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalPending}</span>
        )}
      </div>
      <p className="text-xs text-[var(--muted)] mb-5">{'ตรวจสอบและอนุมัติข้อมูลที่คนไข้บันทึกเข้ามา'}</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ' +
              (tab === t.key
                ? 'bg-[var(--hw-green)] text-white border-transparent'
                : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]')}>
            <span>{t.emoji}</span>{t.label}
            {counts[t.key] > 0 && (
              <span className={'text-[10px] font-bold px-1.5 rounded-full ' +
                (tab === t.key ? 'bg-white/30 text-white' : 'bg-red-100 text-red-600')}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* MEDICATIONS */}
          {tab === 'med' && (meds.length === 0 ? <Empty emoji="💊" label="ไม่มีรายการรอ" /> :
            meds.map(m => (
              <PendingCard key={m.id}
                patient={patientName(m.hw_users)}
                date={m.created_at}
                onApprove={() => approveMed(m.id)}
                onReject={() => rejectMed(m.id)}>
                <div className="font-semibold text-sm">{m.name}</div>
                {m.dosage && <div className="text-xs text-[var(--muted)]">{m.dosage}{m.frequency ? ' · ' + m.frequency : ''}</div>}
              </PendingCard>
            ))
          )}

          {/* VACCINES */}
          {tab === 'vaccine' && (vaccines.length === 0 ? <Empty emoji="💉" label="ไม่มีรายการรอ" /> :
            vaccines.map(v => (
              <PendingCard key={v.id}
                patient={patientName(v.hw_users)}
                date={v.created_at}
                onApprove={() => approveVaccine(v.id)}
                onReject={() => rejectVaccine(v.id)}>
                <div className="font-semibold text-sm">{v.vaccine_name} <span className="font-normal text-[var(--muted)]">เข็มที่ {v.dose_number}</span></div>
                <div className="text-xs text-[var(--muted)]">
                  {new Date(v.vaccinated_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  {v.hospital ? ' · ' + v.hospital : ''}
                </div>
              </PendingCard>
            ))
          )}

          {/* LAB RESULTS */}
          {tab === 'lab' && (labs.length === 0 ? <Empty emoji="🧪" label="ไม่มีรายการรอ" /> :
            labs.map(l => (
              <PendingCard key={l.id}
                patient={patientName(l.hw_users)}
                date={l.created_at}
                onApprove={() => approveLab(l.id)}
                onReject={() => rejectLab(l.id)}>
                <div className="font-semibold text-sm">{l.test_name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {l.value}{l.unit ? ' ' + l.unit : ''} · {new Date(l.test_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                </div>
              </PendingCard>
            ))
          )}

          {/* MEDICAL HISTORY */}
          {tab === 'history' && (history.length === 0 ? <Empty emoji="🏥" label="ไม่มีรายการรอ" /> :
            history.map(h => (
              <PendingCard key={h.id}
                patient={patientName(h.hw_users)}
                date={h.created_at}
                onApprove={() => approveHistory(h.id)}
                onReject={() => rejectHistory(h.id)}>
                <div className="font-semibold text-sm">{h.hospital ?? 'ไม่ระบุสถานพยาบาล'}</div>
                <div className="text-xs text-[var(--muted)]">
                  {new Date(h.visit_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  {h.doctor ? ' · ' + h.doctor : ''}
                </div>
                {h.chief_complaint && <div className="text-xs text-[var(--muted)] mt-0.5">{'อาการ: '}{h.chief_complaint}</div>}
                {h.diagnosis && <div className="text-xs text-[var(--muted)]">{'วินิจฉัย: '}{h.diagnosis}</div>}
              </PendingCard>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function PendingCard({ patient, date, children, onApprove, onReject }: {
  patient: string; date: string; children: React.ReactNode
  onApprove: () => void; onReject: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-semibold text-[var(--hw-green)] bg-[#e8f7f3] px-2 py-0.5 rounded-full">{patient}</span>
        <span className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
          <IconClock size={10} />{new Date(date).toLocaleDateString('th-TH', { dateStyle: 'short' })}
        </span>
      </div>
      <div className="mb-3">{children}</div>
      <div className="flex gap-2">
        <button disabled={busy}
          onClick={async () => { setBusy(true); await onApprove() }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold text-white bg-[#1a8a6e] hover:opacity-90 disabled:opacity-40 transition-opacity">
          <IconCheck size={13} />{'อนุมัติ'}
        </button>
        <button disabled={busy}
          onClick={async () => { setBusy(true); await onReject() }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-40 transition-colors">
          <IconX size={13} />{'ปฏิเสธ'}
        </button>
      </div>
    </div>
  )
}

function Empty({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="text-center py-14">
      <div className="text-4xl mb-2">{emoji}</div>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="text-xs text-[var(--muted)] mt-1">{'ทุกรายการได้รับการตรวจสอบแล้ว'}</p>
    </div>
  )
}
