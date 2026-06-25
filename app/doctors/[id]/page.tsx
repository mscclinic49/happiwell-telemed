'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconStethoscope, IconStar, IconChevronLeft, IconMessageCircle2,
} from '@tabler/icons-react'

const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

type Doctor = {
  id: string; full_name: string; specialty: string | null; bio: string | null
  avatar_url: string | null; consultation_fee: number; rating: number | null
  is_online: boolean; is_active: boolean
}
type Schedule = { day_of_week: number; start_time: string; end_time: string; is_available: boolean }

function formatTime(t: string) {
  return t.slice(0, 5)
}

export default function DoctorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      sb.from('hw_doctors')
        .select('id, full_name, specialty, bio, avatar_url, consultation_fee, rating, is_online, is_active')
        .eq('id', id).single(),
      sb.from('hw_doctor_schedules')
        .select('day_of_week, start_time, end_time, is_available')
        .eq('doctor_id', id)
        .order('day_of_week'),
    ]).then(([docRes, schedRes]) => {
      if (docRes.data) setDoctor(docRes.data as Doctor)
      setSchedules((schedRes.data as Schedule[]) || [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="max-w-lg mx-auto px-5 py-12 text-center text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>
  if (!doctor) return <div className="max-w-lg mx-auto px-5 py-12 text-center text-[var(--muted)] text-sm">{'ไม่พบข้อมูลแพทย์'}</div>

  const initials = doctor.full_name.replace(/^(นพ\.|พญ\.|ทพ\.|ทพญ\.)\s*/, '').slice(0, 2)
  const scheduleByDay = Object.fromEntries(schedules.map(s => [s.day_of_week, s]))

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-12">
      <Link href="/doctors" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] mb-5 hover:text-[var(--foreground)]">
        <IconChevronLeft size={16} />{'รายชื่อแพทย์'}
      </Link>

      {/* Doctor header */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5 mb-5">
        <div className="flex items-start gap-4">
          {doctor.avatar_url ? (
            <Image src={doctor.avatar_url} alt={doctor.full_name} width={72} height={72}
              className="rounded-full object-cover flex-shrink-0" style={{ width: 72, height: 72 }} />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-[var(--hw-green-dk)] flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg leading-tight">{doctor.full_name}</div>
            {doctor.specialty && (
              <div className="flex items-center gap-1.5 mt-1">
                <IconStethoscope size={13} className="text-[var(--hw-green-dk)]" />
                <span className="text-sm text-[var(--hw-green-dk)] font-medium">{doctor.specialty}</span>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2">
              {doctor.rating != null && (
                <span className="flex items-center gap-0.5 text-sm font-bold text-[#ef9f27]">
                  <IconStar size={14} fill="#ef9f27" />{Number(doctor.rating).toFixed(1)}
                </span>
              )}
              <span className={`flex items-center gap-1 text-xs font-medium ${doctor.is_online ? 'text-[var(--hw-green-dk)]' : 'text-[var(--muted)]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${doctor.is_online ? 'bg-[var(--hw-green-dk)] animate-pulse' : 'bg-[var(--muted)]'}`} />
                {doctor.is_online ? 'ออนไลน์' : 'ออฟไลน์'}
              </span>
            </div>
          </div>
        </div>

        {doctor.bio && (
          <p className="text-sm text-[var(--muted)] mt-4 leading-relaxed">{doctor.bio}</p>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5 mb-5">
        <h2 className="font-bold mb-4">{'ตารางออกตรวจ'}</h2>
        {schedules.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-4">{'ยังไม่มีข้อมูลตารางออกตรวจ'}</p>
        ) : (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 0].map(day => {
              const s = scheduleByDay[day]
              return (
                <div key={day} className={`flex items-center justify-between py-2.5 px-3 rounded-[10px] ${s?.is_available ? 'bg-[var(--hw-mint-bg)]' : 'bg-[var(--background)]'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      s?.is_available ? 'bg-[var(--hw-green-dk)] text-white' : 'bg-[var(--border)] text-[var(--muted)]'
                    }`}>
                      {DAY_SHORT[day]}
                    </span>
                    <span className={`text-sm font-medium ${s?.is_available ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                      {DAYS[day]}
                    </span>
                  </div>
                  {s?.is_available ? (
                    <span className="text-sm font-semibold text-[var(--hw-green-dk)]">
                      {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">{'หยุด'}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CTA */}
      <Link
        href="/chat"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full font-semibold text-white text-base"
        style={{ background: 'var(--hw-green-dk)' }}
      >
        <IconMessageCircle2 size={18} />
        {'แชทกับคลินิกเพื่อนัดหมาย'}
      </Link>
    </div>
  )
}
