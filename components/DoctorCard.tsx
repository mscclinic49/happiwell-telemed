'use client'

import Link from 'next/link'
import Image from 'next/image'
import { IconStethoscope, IconChevronRight, IconClock } from '@tabler/icons-react'
import type { Doctor, DoctorSchedule } from '@/lib/supabase'

const SPECIALTY_COLORS: Record<string, { bg: string; text: string }> = {
  'อายุรกรรม':           { bg: '#e8f7f3', text: '#1a8a6e' },
  'กุมารเวชกรรม':        { bg: '#faeeda', text: '#b97320' },
  'ผิวหนัง':             { bg: '#e6f1fb', text: '#185fa5' },
  'จิตเวช':              { bg: '#f0ebff', text: '#6d28d9' },
  'ออร์โธปีดิกส์':       { bg: '#fff0f0', text: '#b91c1c' },
  'สูตินรีเวช':          { bg: '#fdf2f8', text: '#9d174d' },
  'ตา':                  { bg: '#fef9ec', text: '#92400e' },
  'หู คอ จมูก':          { bg: '#e8f7f3', text: '#065f46' },
  'เวชกรรม':             { bg: '#e8f7f3', text: '#1a8a6e' },
  'เวชปฏิบัติทั่วไป':    { bg: '#e6f1fb', text: '#185fa5' },
}

const DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function getSpecialtyColor(s: string | null) {
  if (!s) return { bg: '#f1f5f9', text: '#475569' }
  return SPECIALTY_COLORS[s] ?? { bg: '#e8f7f3', text: '#1a8a6e' }
}

function ScheduleBadges({ schedules }: { schedules: DoctorSchedule[] }) {
  if (!schedules || schedules.length === 0) return null
  const active = schedules.filter(s => s.is_available)
  if (active.length === 0) return null

  const groups: Record<string, { start: string; end: string; days: number[] }> = {}
  for (const s of active) {
    const key = `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`
    if (!groups[key]) groups[key] = { start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5), days: [] }
    groups[key].days.push(s.day_of_week)
  }

  return (
    <div className="space-y-1.5">
      {Object.values(groups).map((g, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-wrap">
          <IconClock size={12} className="text-[var(--muted)] flex-shrink-0" />
          <div className="flex gap-1">
            {DAY_ORDER.filter(d => g.days.includes(d)).map(d => (
              <span key={d} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#e8f7f3] text-[#1a8a6e]">
                {DAY_SHORT[d]}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-[var(--muted)]">{g.start}{'–'}{g.end}{' น.'}</span>
        </div>
      ))}
    </div>
  )
}

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const { bg, text } = getSpecialtyColor(doctor.specialty)
  const initials = doctor.full_name.replace(/^(นพ\.|พญ\.|ทพ\.|ทพญ\.)\s*/, '').slice(0, 2)

  return (
    <Link href={`/doctors/${doctor.id}`}
      className="flex gap-0 rounded-[16px] bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden hover:shadow-md hover:border-[#1a8a6e]/40 transition-all">

      {/* Photo */}
      <div className="w-[110px] flex-shrink-0 relative bg-[#e8f7f3]">
        {doctor.avatar_url ? (
          <Image
            src={doctor.avatar_url}
            alt={doctor.full_name}
            fill
            className="object-cover object-top"
            sizes="110px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#1a8a6e] font-bold text-2xl">
            {initials}
          </div>
        )}
        {doctor.is_online && (
          <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[#1a8a6e] border-2 border-white animate-pulse" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-bold text-[15px] leading-snug">{doctor.full_name}</h3>
            <IconChevronRight size={16} className="text-[var(--muted)] flex-shrink-0 mt-0.5" />
          </div>
          {doctor.specialty && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold mt-1.5" style={{ background: bg, color: text }}>
              <IconStethoscope size={10} />{doctor.specialty}
            </span>
          )}
          {doctor.bio && (
            <p className="text-xs text-[var(--muted)] mt-2 line-clamp-2">{doctor.bio}</p>
          )}
        </div>
        {doctor.hw_doctor_schedules && doctor.hw_doctor_schedules.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <ScheduleBadges schedules={doctor.hw_doctor_schedules} />
          </div>
        )}
      </div>
    </Link>
  )
}
