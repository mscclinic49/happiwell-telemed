'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { IconCalendarClock, IconPlus, IconX, IconCheck, IconAlertCircle, IconChevronDown } from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Patient = { id: string; full_name: string | null; phone: string | null; first_name: string | null; last_name: string | null }
type Doctor  = { id: string; full_name: string; specialty: string | null }
type Appt = {
  id: string; scheduled_at: string; status: string; symptoms: string | null
  hw_users: { full_name: string | null; first_name: string | null } | null
  hw_doctors: { full_name: string; specialty: string | null } | null
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'รอยืนยัน',  color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'ยืนยันแล้ว', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'เสร็จสิ้น',  color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก',    color: 'bg-red-100 text-red-700' },
}

const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[#1a8a6e]'

export default function AdminAppointmentsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [checking, setChecking] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [appts, setAppts] = useState<Appt[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    patient_id: '', doctor_id: '', scheduled_date: '', scheduled_time: '09:00', symptoms: '',
  })

  useEffect(() => {
    if (!user) return
    sb.from('hw_users').select('role').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.role !== 'admin') router.replace('/')
        else setChecking(false)
      })
  }, [user])

  useEffect(() => {
    if (checking) return
    Promise.all([
      sb.from('hw_users').select('id, full_name, first_name, last_name, phone').order('first_name'),
      sb.from('hw_doctors').select('id, full_name, specialty').eq('is_active', true).order('full_name'),
      sb.from('hw_appointments')
        .select('id, scheduled_at, status, symptoms, hw_users(full_name, first_name), hw_doctors(full_name, specialty)')
        .order('scheduled_at', { ascending: false })
        .limit(50),
    ]).then(([pRes, dRes, aRes]) => {
      setPatients((pRes.data as Patient[]) || [])
      setDoctors((dRes.data as Doctor[]) || [])
      setAppts((aRes.data as unknown as Appt[]) || [])
    })
  }, [checking])

  function loadAppts() {
    sb.from('hw_appointments')
      .select('id, scheduled_at, status, symptoms, hw_users(full_name, first_name), hw_doctors(full_name, specialty)')
      .order('scheduled_at', { ascending: false }).limit(50)
      .then(({ data }) => setAppts((data as unknown as Appt[]) || []))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patient_id || !form.doctor_id || !form.scheduled_date) return
    setSaving(true); setError(null)
    const scheduledAt = `${form.scheduled_date}T${form.scheduled_time}:00+07:00`
    const { error: err } = await sb.from('hw_appointments').insert({
      user_id: form.patient_id,
      doctor_id: form.doctor_id,
      scheduled_at: scheduledAt,
      duration_minutes: 15,
      status: 'confirmed',
      consultation_type: 'video',
      symptoms: form.symptoms.trim() || null,
    })
    if (err) { setError(err.message) } else {
      setSuccess(true)
      setForm({ patient_id: '', doctor_id: '', scheduled_date: '', scheduled_time: '09:00', symptoms: '' })
      setShowForm(false)
      loadAppts()
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await sb.from('hw_appointments').update({ status }).eq('id', id)
    setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  function patientLabel(p: Patient) {
    return p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || `(${p.id.slice(0, 8)})`
  }

  if (checking) return null

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <IconCalendarClock size={20} className="text-[#1a8a6e]" />
          <h1 className="text-lg font-bold">{'จัดการนัดหมาย'}</h1>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(null) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white"
          style={{ background: 'var(--hw-green)' }}
        >
          {showForm ? <IconX size={15} /> : <IconPlus size={15} />}
          {showForm ? 'ยกเลิก' : 'สร้างนัดหมาย'}
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-[#e8f7f3] border border-[#1a8a6e]/30 rounded-[10px] text-[#1a8a6e] text-sm mb-4">
          <IconCheck size={15} />{'สร้างนัดหมายเรียบร้อยแล้ว'}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5 mb-6 space-y-4">
          <h2 className="font-semibold">{'สร้างนัดหมายใหม่'}</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">{'คนไข้'}</label>
            <div className="relative">
              <select
                required value={form.patient_id}
                onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">{'เลือกคนไข้...'}</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{patientLabel(p)}{p.phone ? ` · ${p.phone}` : ''}</option>
                ))}
              </select>
              <IconChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{'แพทย์'}</label>
            <div className="relative">
              <select
                required value={form.doctor_id}
                onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">{'เลือกแพทย์...'}</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name}{d.specialty ? ` · ${d.specialty}` : ''}</option>
                ))}
              </select>
              <IconChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{'วันที่'}</label>
              <input type="date" required value={form.scheduled_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'เวลา'}</label>
              <input type="time" required value={form.scheduled_time}
                onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{'อาการ / ประวัติ (ไม่บังคับ)'}</label>
            <textarea value={form.symptoms}
              onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))}
              rows={3} placeholder={'จากการซักประวัติในแชท...'}
              className={`${inputClass} resize-none`} />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-sm">
              <IconAlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-full font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            style={{ background: 'var(--hw-green)' }}>
            {saving ? 'กำลังบันทึก...' : 'สร้างนัดหมาย (ยืนยันแล้ว)'}
          </button>
        </form>
      )}

      {/* Appointment list */}
      <div className="space-y-3">
        {appts.length === 0 && (
          <div className="text-center py-12 text-[var(--muted)] text-sm">{'ยังไม่มีนัดหมาย'}</div>
        )}
        {appts.map(a => {
          const dt = new Date(a.scheduled_at)
          const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.pending
          const pName = a.hw_users?.full_name || a.hw_users?.first_name || '—'
          return (
            <div key={a.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-sm">{pName}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {a.hw_doctors?.full_name} · {a.hw_doctors?.specialty}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {dt.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    {' '}{dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} {'น.'}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              {a.symptoms && <p className="text-xs text-[var(--muted)] mb-3 line-clamp-2">{'อาการ: '}{a.symptoms}</p>}
              {a.status !== 'completed' && a.status !== 'cancelled' && (
                <div className="flex gap-2">
                  {a.status === 'pending' && (
                    <button onClick={() => updateStatus(a.id, 'confirmed')}
                      className="flex-1 text-xs py-2 rounded-full font-medium text-white"
                      style={{ background: 'var(--hw-green)' }}>
                      {'ยืนยัน'}
                    </button>
                  )}
                  <button onClick={() => updateStatus(a.id, 'completed')}
                    className="flex-1 text-xs py-2 rounded-full font-medium bg-blue-600 text-white">
                    {'เสร็จสิ้น'}
                  </button>
                  <button onClick={() => updateStatus(a.id, 'cancelled')}
                    className="flex-1 text-xs py-2 rounded-full font-medium border border-red-200 text-red-600">
                    {'ยกเลิก'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

