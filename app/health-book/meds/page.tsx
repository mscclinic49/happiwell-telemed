'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import { IconPlus, IconTrash, IconBell, IconBellOff, IconClock } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Medication = {
  id: string; name: string; dosage: string | null; frequency: string | null
  times: string[] | null; prescribed_by: string | null; hospital: string | null
  reminder_enabled: boolean; status: string; source: string
}
type Vaccine = {
  id: string; vaccine_name: string; dose_number: number; vaccinated_date: string
  hospital: string | null; next_due_date: string | null; status: string
}

type Tab = 'meds' | 'vaccines'

const isOverdue = (d: string | null) => d ? new Date(d) < new Date() : false

const inputClass = 'w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm bg-[var(--card-bg)] focus:outline-none focus:border-[var(--hw-green)]'
const labelClass = 'text-sm text-[var(--muted)] mb-1.5 block font-medium'

export default function MedsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('meds')
  const [loading, setLoading] = useState(true)
  const [meds, setMeds] = useState<Medication[]>([])
  const [medsPending, setMedsPending] = useState<Medication[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [vacPending, setVacPending] = useState<Vaccine[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [medForm, setMedForm] = useState({ name: '', dosage: '', frequency: '', times: '', prescribed_by: '', hospital: '', reminder_enabled: false })
  const [vacForm, setVacForm] = useState({ vaccine_name: '', dose_number: '1', vaccinated_date: new Date().toISOString().slice(0, 10), hospital: '', next_due_date: '' })

  useEffect(() => {
    if (!user) return
    Promise.all([
      sb.from('hw_medications').select('id,name,dosage,frequency,times,prescribed_by,hospital,reminder_enabled,status,source').eq('user_id', user.id).eq('is_active', true).eq('status', 'approved'),
      sb.from('hw_medications').select('id,name,status').eq('user_id', user.id).eq('status', 'pending'),
      sb.from('hw_vaccines').select('id,vaccine_name,dose_number,vaccinated_date,hospital,next_due_date,status').eq('user_id', user.id).eq('status', 'approved').order('vaccinated_date', { ascending: false }),
      sb.from('hw_vaccines').select('id,vaccine_name,status').eq('user_id', user.id).eq('status', 'pending'),
    ]).then(([m, mp, v, vp]) => {
      setMeds((m.data ?? []) as Medication[])
      setMedsPending((mp.data ?? []) as Medication[])
      setVaccines((v.data ?? []) as Vaccine[])
      setVacPending((vp.data ?? []) as Vaccine[])
      setLoading(false)
    })
  }, [user])

  async function saveMed() {
    if (!medForm.name || !user) return
    setSaving(true)
    const { data } = await sb.from('hw_medications').insert({
      user_id: user.id, name: medForm.name, dosage: medForm.dosage || null,
      frequency: medForm.frequency || null,
      times: medForm.times ? medForm.times.split(',').map(t => t.trim()) : null,
      prescribed_by: medForm.prescribed_by || null, hospital: medForm.hospital || null,
      note: null, reminder_enabled: medForm.reminder_enabled,
      is_active: true, start_date: null, end_date: null,
      status: 'pending', source: 'patient',
    }).select('id,name,status').single()
    if (data) setMedsPending(p => [data as Medication, ...p])
    setMedForm({ name: '', dosage: '', frequency: '', times: '', prescribed_by: '', hospital: '', reminder_enabled: false })
    setShowForm(false); setSaving(false)
  }

  async function saveVac() {
    if (!vacForm.vaccine_name || !user) return
    setSaving(true)
    const { data } = await sb.from('hw_vaccines').insert({
      user_id: user.id, vaccine_name: vacForm.vaccine_name,
      dose_number: parseInt(vacForm.dose_number),
      vaccinated_date: vacForm.vaccinated_date,
      hospital: vacForm.hospital || null,
      next_due_date: vacForm.next_due_date || null,
      lot_number: null, note: null, status: 'pending', source: 'patient',
    }).select('id,vaccine_name,status').single()
    if (data) setVacPending(p => [data as Vaccine, ...p])
    setVacForm({ vaccine_name: '', dose_number: '1', vaccinated_date: new Date().toISOString().slice(0, 10), hospital: '', next_due_date: '' })
    setShowForm(false); setSaving(false)
  }

  return (
    <div>
      <div className="px-5 pt-6 pb-4" style={{ background: 'linear-gradient(135deg, var(--hw-green) 0%, var(--hw-green-dk) 100%)' }}>
        <h1 className="text-white text-lg font-bold mb-4">{'💊 ยาและวัคซีน'}</h1>
        <div className="flex gap-2">
          {([['meds', '💊 ยา'], ['vaccines', '💉 วัคซีน']] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setShowForm(false) }}
              className={'px-4 py-2 rounded-xl text-sm font-medium ' + (tab === k ? 'bg-white text-[var(--hw-green)]' : 'bg-white/20 text-white')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 pb-10 max-w-xl mx-auto">
        <button onClick={() => setShowForm(v => !v)}
          className="w-full text-white rounded-2xl py-3 flex items-center justify-center gap-2 font-medium mb-4"
          style={{ background: 'var(--hw-orange)' }}>
          <IconPlus size={18}/>
          {tab === 'meds' ? 'เพิ่มรายการยา' : 'เพิ่มประวัติวัคซีน'}
        </button>

        {/* Med form */}
        {showForm && tab === 'meds' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 mb-4 space-y-4">
            <p className="text-xs text-[var(--hw-orange)]">{'⏳ รอการยืนยันจากคลินิกก่อนแสดงผล'}</p>
            <div><label className={labelClass}>{'ชื่อยา *'}</label><input value={medForm.name} onChange={e => setMedForm({...medForm, name: e.target.value})} placeholder="เช่น Metformin" className={inputClass}/></div>
            <div><label className={labelClass}>{'ขนาดยา'}</label><input value={medForm.dosage} onChange={e => setMedForm({...medForm, dosage: e.target.value})} placeholder="เช่น 500mg" className={inputClass}/></div>
            <div><label className={labelClass}>{'ความถี่'}</label><input value={medForm.frequency} onChange={e => setMedForm({...medForm, frequency: e.target.value})} placeholder="เช่น วันละ 2 ครั้ง" className={inputClass}/></div>
            <div><label className={labelClass}>{'เวลากินยา'}</label><input value={medForm.times} onChange={e => setMedForm({...medForm, times: e.target.value})} placeholder="เช่น 08:00, 20:00" className={inputClass}/></div>
            <div><label className={labelClass}>{'แพทย์ผู้สั่งยา'}</label><input value={medForm.prescribed_by} onChange={e => setMedForm({...medForm, prescribed_by: e.target.value})} placeholder="เช่น นพ.สมชาย" className={inputClass}/></div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={medForm.reminder_enabled} onChange={e => setMedForm({...medForm, reminder_enabled: e.target.checked})} className="w-4 h-4 accent-[var(--hw-green)]"/>
              <span className="text-sm text-[var(--muted)]">{'เปิดแจ้งเตือน'}</span>
            </label>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-[var(--border)] rounded-xl py-3 text-sm text-[var(--muted)]">{'ยกเลิก'}</button>
              <button onClick={saveMed} disabled={saving} className="flex-1 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--hw-orange)' }}>
                {saving ? 'กำลังบันทึก...' : 'ส่งเพื่อยืนยัน'}</button>
            </div>
          </div>
        )}

        {/* Vaccine form */}
        {showForm && tab === 'vaccines' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 mb-4 space-y-4">
            <p className="text-xs text-[var(--hw-green)]">{'⏳ รอการยืนยันจากคลินิกก่อนแสดงผล'}</p>
            <div><label className={labelClass}>{'ชื่อวัคซีน *'}</label><input value={vacForm.vaccine_name} onChange={e => setVacForm({...vacForm, vaccine_name: e.target.value})} placeholder="เช่น COVID-19" className={inputClass}/></div>
            <div><label className={labelClass}>{'เข็มที่'}</label><input type="number" value={vacForm.dose_number} onChange={e => setVacForm({...vacForm, dose_number: e.target.value})} className={inputClass}/></div>
            <div><label className={labelClass}>{'วันที่ฉีด *'}</label><input type="date" value={vacForm.vaccinated_date} onChange={e => setVacForm({...vacForm, vaccinated_date: e.target.value})} className={inputClass}/></div>
            <div><label className={labelClass}>{'สถานที่ฉีด'}</label><input value={vacForm.hospital} onChange={e => setVacForm({...vacForm, hospital: e.target.value})} placeholder="เช่น HappiWell Clinic" className={inputClass}/></div>
            <div><label className={labelClass}>{'กำหนดฉีดครั้งถัดไป'}</label><input type="date" value={vacForm.next_due_date} onChange={e => setVacForm({...vacForm, next_due_date: e.target.value})} className={inputClass}/></div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-[var(--border)] rounded-xl py-3 text-sm text-[var(--muted)]">{'ยกเลิก'}</button>
              <button onClick={saveVac} disabled={saving} className="flex-1 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--hw-green)' }}>
                {saving ? 'กำลังบันทึก...' : 'ส่งเพื่อยืนยัน'}</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>
        ) : tab === 'meds' ? (
          <>
            {medsPending.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconClock size={16} className="text-yellow-500"/>
                  <p className="text-sm font-medium text-yellow-600">{'รอการยืนยัน ('}{medsPending.length}{')'}</p>
                </div>
                <div className="space-y-2">
                  {medsPending.map(rec => (
                    <div key={rec.id} className="bg-[var(--hw-yellow-bg)] border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <p className="font-medium text-sm flex-1">{rec.name}</p>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{'รอยืนยัน'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {meds.length === 0 && medsPending.length === 0 ? (
              <div className="text-center py-10"><p className="text-4xl mb-3">{'💊'}</p><p className="text-[var(--muted)] text-sm">{'ยังไม่มีรายการยา'}</p></div>
            ) : (
              <div className="space-y-2">
                {meds.map(rec => (
                  <div key={rec.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{rec.name}</p>
                          {rec.reminder_enabled
                            ? <IconBell size={14} className="text-[var(--hw-orange)]"/>
                            : <IconBellOff size={14} className="text-[var(--muted)]"/>}
                          {rec.source === 'clinic' && <span className="text-xs bg-[var(--hw-mint-bg)] text-[var(--hw-green)] px-1.5 py-0.5 rounded-full">{'คลินิก'}</span>}
                        </div>
                        {rec.dosage && <p className="text-xs text-[var(--muted)] mt-0.5">{rec.dosage}{rec.frequency ? ' · ' + rec.frequency : ''}</p>}
                        {rec.times && rec.times.length > 0 && <p className="text-xs text-[var(--hw-orange)] mt-1">{'⏰ '}{rec.times.join(', ')}{' น.'}</p>}
                      </div>
                      <button onClick={async () => { await sb.from('hw_medications').delete().eq('id', rec.id); setMeds(p => p.filter(r => r.id !== rec.id)) }}
                        className="p-2 text-[var(--muted)] hover:text-red-400 flex-shrink-0"><IconTrash size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {vacPending.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconClock size={16} className="text-yellow-500"/>
                  <p className="text-sm font-medium text-yellow-600">{'รอการยืนยัน ('}{vacPending.length}{')'}</p>
                </div>
                <div className="space-y-2">
                  {vacPending.map(rec => (
                    <div key={rec.id} className="bg-[var(--hw-yellow-bg)] border border-yellow-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <p className="font-medium text-sm flex-1">{rec.vaccine_name}</p>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{'รอยืนยัน'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {vaccines.length === 0 && vacPending.length === 0 ? (
              <div className="text-center py-10"><p className="text-4xl mb-3">{'💉'}</p><p className="text-[var(--muted)] text-sm">{'ยังไม่มีประวัติวัคซีน'}</p></div>
            ) : (
              <div className="space-y-2">
                {vaccines.map(rec => (
                  <div key={rec.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--hw-mint-bg)] flex items-center justify-center flex-shrink-0 text-xl">{'💉'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{rec.vaccine_name}</p>
                        <p className="text-xs text-[var(--muted)]">{'เข็มที่ '}{rec.dose_number}</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {new Date(rec.vaccinated_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                          {rec.hospital ? ' · ' + rec.hospital : ''}
                        </p>
                        {rec.next_due_date && (
                          <p className={"text-xs mt-1 " + (isOverdue(rec.next_due_date) ? 'text-red-500' : 'text-[var(--hw-green)]')}>
                            {isOverdue(rec.next_due_date) ? '⚠️ เลยกำหนด: ' : '📅 ฉีดครั้งถัดไป: '}
                            {new Date(rec.next_due_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
