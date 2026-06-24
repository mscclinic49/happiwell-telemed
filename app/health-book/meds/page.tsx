'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { IconArrowLeft, IconTrash, IconBell, IconBellOff, IconClock } from '@tabler/icons-react'

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

const inputClass = 'w-full border border-[var(--border)] rounded-[10px] px-4 py-3 text-sm bg-[var(--card-bg)] focus:outline-none focus:border-[var(--hw-green)]'
const labelClass = 'text-sm text-[var(--muted)] mb-1.5 block font-medium'

export default function MedsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('meds')
  const [loading, setLoading] = useState(true)
  const [meds, setMeds] = useState<Medication[]>([])
  const [medsPending, setMedsPending] = useState<Medication[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [vacPending, setVacPending] = useState<Vaccine[]>([])
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

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/health-book" className="p-2 rounded-full hover:bg-[var(--border)] transition-colors flex-shrink-0">
          <IconArrowLeft size={20}/>
        </Link>
        <div>
          <p className="text-sm text-[var(--muted)]">{'สมุดสุขภาพ'}</p>
          <h1 className="text-xl font-bold">{'ประวัติยาและวัคซีน'}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([['meds', 'ยา'], ['vaccines', 'วัคซีน']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={'px-4 py-2 rounded-full text-sm font-medium border transition-colors ' +
              (tab === k
                ? 'bg-[var(--hw-green)] text-white border-transparent'
                : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]')}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-4">

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin"/>
          </div>
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
                    <div key={rec.id} className="bg-[var(--hw-yellow-bg)] border border-yellow-200 rounded-[14px] px-4 py-3 flex items-center gap-2">
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
                  <div key={rec.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3">
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
                    <div key={rec.id} className="bg-[var(--hw-yellow-bg)] border border-yellow-200 rounded-[14px] px-4 py-3 flex items-center gap-2">
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
                  <div key={rec.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3">
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
