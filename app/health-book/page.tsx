'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  IconPill, IconFlask, IconVaccine, IconStethoscope,
  IconChevronRight, IconAlertTriangle, IconCalendarClock,
} from '@tabler/icons-react'

type Med = { id: string; medicine_name: string; dosage: string | null; frequency: string | null; duration_days: number | null }
type Lab = { id: string; test_name: string; result_value: string; reference_range: string | null; status: string | null }
type Vaccine = { id: string; vaccine_name: string; due_date: string | null }
type Visit = { id: string; visit_date: string; diagnosis: string | null; hw_doctors: { full_name: string } | null }

const SHORTCUTS = [
  { href: '/health-book/record', label: 'ค่าสุขภาพ',     emoji: '💉' },
  { href: '/health-book/meds',   label: 'ยา',            emoji: '💊' },
  { href: '/health-book/lab',    label: 'ผลตรวจ',        emoji: '🧪' },
]

export default function HealthBookDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [meds,     setMeds]     = useState<Med[]>([])
  const [labs,     setLabs]     = useState<Lab[]>([])
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [visits,   setVisits]   = useState<Visit[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const in60  = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]

      const [medsRes, labsRes, vacRes, visitRes] = await Promise.all([
        supabase.from('hw_medications').select('id,medicine_name,dosage,frequency,duration_days')
          .eq('user_id', user!.id).eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.from('hw_lab_results').select('id,test_name,result_value,reference_range,status')
          .eq('user_id', user!.id).in('status', ['high', 'low', 'abnormal'])
          .order('tested_at', { ascending: false }).limit(5),
        supabase.from('hw_vaccines').select('id,vaccine_name,due_date')
          .eq('user_id', user!.id).gte('due_date', today).lte('due_date', in60)
          .order('due_date', { ascending: true }),
        supabase.from('hw_medical_history').select('id,visit_date,diagnosis,hw_doctors(full_name)')
          .eq('user_id', user!.id).order('visit_date', { ascending: false }).limit(3),
      ])

      setMeds((medsRes.data ?? []) as Med[])
      setLabs((labsRes.data ?? []) as Lab[])
      setVaccines((vacRes.data ?? []) as Vaccine[])
      setVisits((visitRes.data ?? []) as unknown as Visit[])
      setLoading(false)
    }
    load()
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-10 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{'สมุดสุขภาพ'}</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">{'บันทึกและติดตามสุขภาพของคุณ'}</p>
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-3 gap-2">
        {SHORTCUTS.map(s => (
          <Link key={s.href} href={s.href}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-3 text-center hover:border-[var(--hw-green)]/40 transition-colors">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-xs font-medium">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* ยาที่ต้องกิน */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <IconPill size={16} className="text-[var(--hw-orange)]" />
            <h2 className="font-semibold text-sm">{'ยาที่ต้องกินวันนี้'}</h2>
          </div>
          <Link href="/health-book/meds" className="flex items-center text-xs text-[var(--hw-green)]">
            {'ทั้งหมด'}<IconChevronRight size={13} />
          </Link>
        </div>
        {meds.length > 0 ? (
          <div className="space-y-2">
            {meds.slice(0, 4).map(m => (
              <div key={m.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--hw-peach-bg)] flex items-center justify-center flex-shrink-0">
                  <IconPill size={15} className="text-[var(--hw-orange)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{m.medicine_name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                    {m.duration_days ? ` · ${m.duration_days} วัน` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 text-center text-sm text-[var(--muted)]">
            {'ยังไม่มีรายการยา'}
          </div>
        )}
      </section>

      {/* ผลตรวจผิดปกติ */}
      {labs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconAlertTriangle size={16} className="text-yellow-500" />
              <h2 className="font-semibold text-sm">{'ผลตรวจที่ควรติดตาม'}</h2>
            </div>
            <Link href="/health-book/lab" className="flex items-center text-xs text-[var(--hw-green)]">
              {'ทั้งหมด'}<IconChevronRight size={13} />
            </Link>
          </div>
          <div className="space-y-2">
            {labs.map(l => (
              <div key={l.id} className="bg-yellow-50 border border-yellow-200 rounded-[14px] px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <IconFlask size={15} className="text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{l.test_name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {l.result_value}{l.reference_range ? ` (ปกติ ${l.reference_range})` : ''}
                  </div>
                </div>
                {l.status && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full flex-shrink-0">
                    {l.status === 'high' ? 'สูง' : l.status === 'low' ? 'ต่ำ' : 'ผิดปกติ'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* วัคซีนใกล้ครบกำหนด */}
      {vaccines.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconVaccine size={16} className="text-[var(--hw-blue)]" />
            <h2 className="font-semibold text-sm">{'วัคซีนใกล้ครบกำหนด'}</h2>
          </div>
          <div className="space-y-2">
            {vaccines.map(v => {
              const daysLeft = v.due_date
                ? Math.ceil((new Date(v.due_date).getTime() - Date.now()) / 86400000)
                : null
              return (
                <div key={v.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <IconVaccine size={15} className="text-[var(--hw-blue)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{v.vaccine_name}</div>
                    {v.due_date && (
                      <div className="text-xs text-[var(--muted)]">
                        {new Date(v.due_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                      </div>
                    )}
                  </div>
                  {daysLeft != null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${daysLeft <= 14 ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-[var(--hw-blue)]'}`}>
                      {'อีก '}{daysLeft}{' วัน'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ครั้งล่าสุดที่ไปหาหมอ */}
      {visits.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconStethoscope size={16} className="text-[var(--hw-green)]" />
            <h2 className="font-semibold text-sm">{'ประวัติการพบแพทย์'}</h2>
          </div>
          <div className="space-y-2">
            {visits.map(v => (
              <div key={v.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="text-sm font-semibold">
                    {v.hw_doctors?.full_name ?? 'แพทย์'}
                  </div>
                  <div className="text-xs text-[var(--muted)] flex-shrink-0 flex items-center gap-1">
                    <IconCalendarClock size={11} />
                    {new Date(v.visit_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                  </div>
                </div>
                {v.diagnosis && (
                  <div className="text-xs text-[var(--muted)] truncate">{'วินิจฉัย: '}{v.diagnosis}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
