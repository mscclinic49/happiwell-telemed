'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  IconMessageCircle2, IconCalendarClock, IconPill,
  IconVideo, IconClock, IconCheck, IconX,
} from '@tabler/icons-react'

type Appointment = {
  id: string
  scheduled_at: string
  status: string
  symptoms: string | null
  hw_doctors: { full_name: string; specialty: string | null } | null
}

type Prescription = {
  id: string
  issued_at: string
  hw_doctors: { full_name: string } | null
}

const STATUS_CFG: Record<string, { label: string; color: string; Icon: typeof IconClock }> = {
  pending:   { label: 'รอยืนยัน',  color: 'text-yellow-600 bg-yellow-50',  Icon: IconClock },
  confirmed: { label: 'ยืนยันแล้ว', color: 'text-blue-600 bg-blue-50',      Icon: IconCheck },
  completed: { label: 'เสร็จสิ้น',  color: 'text-[#1a8a6e] bg-[#e8f7f3]',  Icon: IconCheck },
  cancelled: { label: 'ยกเลิก',    color: 'text-red-600 bg-red-50',         Icon: IconX },
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [latestRx, setLatestRx] = useState<Prescription | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    async function load() {
      const [profileRes, apptRes, rxRes] = await Promise.all([
        supabase.from('hw_users').select('first_name').eq('id', user!.id).single(),
        supabase.from('hw_appointments')
          .select('id, scheduled_at, status, symptoms, hw_doctors(full_name, specialty)')
          .eq('user_id', user!.id)
          .in('status', ['pending', 'confirmed'])
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(3),
        supabase.from('hw_prescriptions')
          .select('id, issued_at, hw_doctors(full_name)')
          .eq('user_id', user!.id)
          .order('issued_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      if (profileRes.data?.first_name) setFirstName(profileRes.data.first_name)
      setUpcoming((apptRes.data as unknown as Appointment[]) || [])
      if (rxRes.data) setLatestRx(rxRes.data as unknown as Prescription)
      setLoadingData(false)
    }
    load()
  }, [user, authLoading, router])

  if (authLoading || loadingData) {
    return <div className="h-full flex items-center justify-center text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>
  }

  const greeting = firstName ? `สวัสดี, ${firstName}` : 'สวัสดี'

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-8 space-y-5">

      {/* Greeting */}
      <div>
        <p className="text-sm text-[var(--muted)]">{greeting}</p>
        <h1 className="text-xl font-bold">{'หน้าหลัก'}</h1>
      </div>

      {/* Primary CTA — แชทกับคลินิก */}
      <Link
        href="/chat"
        className="flex items-center gap-4 p-5 rounded-[14px] text-white"
        style={{ background: 'linear-gradient(135deg, #1a8a6e 0%, #14705a 100%)' }}
      >
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <IconMessageCircle2 size={24} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-base">{'แชทกับคลินิก'}</div>
          <div className="text-sm text-white/80 mt-0.5">{'นัดหมาย ซักประวัติ หรือสอบถาม'}</div>
        </div>
      </Link>

      {/* Upcoming appointments */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconCalendarClock size={16} className="text-[#1a8a6e]" />
            <h2 className="font-semibold text-sm">{'นัดหมายที่กำลังจะมา'}</h2>
          </div>
          <div className="space-y-2">
            {upcoming.map(a => {
              const dt = new Date(a.scheduled_at)
              const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.pending
              const isNow = Math.abs(dt.getTime() - Date.now()) < 30 * 60000
              return (
                <div key={a.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-semibold text-sm">{a.hw_doctors?.full_name}</div>
                      <div className="text-xs text-[var(--muted)]">{a.hw_doctors?.specialty}</div>
                      <div className="text-xs text-[var(--muted)] mt-1">
                        {dt.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}
                        {dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} {'น.'}
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  {a.symptoms && (
                    <p className="text-xs text-[var(--muted)] mb-3 truncate">{'อาการ: '}{a.symptoms}</p>
                  )}
                  {(a.status === 'confirmed' || isNow) && (
                    <Link href={`/consult/${a.id}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold text-white"
                      style={{ background: '#1a8a6e' }}>
                      <IconVideo size={16} />{'เข้าห้องปรึกษา'}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* No upcoming */}
      {upcoming.length === 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5 text-center">
          <IconCalendarClock size={32} className="mx-auto mb-2 text-[var(--muted)] opacity-40" />
          <p className="text-sm text-[var(--muted)]">{'ยังไม่มีนัดหมาย'}</p>
          <p className="text-xs text-[var(--muted)] mt-1">{'แชทกับคลินิกเพื่อนัดหมายพบแพทย์'}</p>
        </div>
      )}

      {/* Latest prescription shortcut */}
      {latestRx && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <IconPill size={16} className="text-[#1a8a6e]" />
            <h2 className="font-semibold text-sm">{'ใบสั่งยาล่าสุด'}</h2>
          </div>
          <Link href="/prescriptions" className="flex items-center gap-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 hover:border-[#1a8a6e]/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#faeeda] flex items-center justify-center flex-shrink-0">
              <IconPill size={18} className="text-[#ef9f27]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{'ใบสั่งยา'}</div>
              <div className="text-xs text-[var(--muted)]">
                {latestRx.hw_doctors?.full_name} · {new Date(latestRx.issued_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
              </div>
            </div>
            <span className="text-xs text-[#1a8a6e] font-medium flex-shrink-0">{'ดู →'}</span>
          </Link>
        </section>
      )}

      {/* Clinic info */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">{'คลินิก'}</h2>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 text-sm space-y-2">
          <div className="font-semibold">{'แฮปปี้เวลล์ คลินิกเวชกรรม'}</div>
          <div className="text-xs text-[var(--muted)]">{'เลขที่ 193, 195 ชั้น 1 ถนนประชาอุทิศ ตำบลบางมด อำเภอทุ่งครุ กรุงเทพฯ'}</div>
          <div className="text-xs text-[var(--muted)]">{'จ–ศ 08:00–18:00 · ส–อา 08:00–12:00'}</div>
          <div className="flex gap-2 pt-1">
            <a href="tel:020004586" className="flex items-center gap-1.5 bg-[#e6f1fb] text-[#185fa5] px-3 py-1.5 rounded-full text-xs font-medium">
              {'📞 02-000-4586'}
            </a>
            <a href="https://line.me/R/ti/p/@p49clinic" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#e8f7f3] text-[#1a8a6e] px-3 py-1.5 rounded-full text-xs font-medium">
              {'Line @p49clinic'}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
