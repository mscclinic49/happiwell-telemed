'use client'

import Link from 'next/link'
import Image from 'next/image'
import { IconStethoscope, IconChevronRight, IconClock } from '@tabler/icons-react'
import type { Doctor, DoctorSchedule } from '@/lib/supabase'

const SPECIALTY_COLORS: Record<string, { bg: string; text: string }> = {
  'อายุรกรรม':           { bg: 'var(--hw-mint-bg)',  text: 'var(--hw-green)' },
  'กุมารเวชกรรม':        { bg: 'var(--hw-peach-bg)', text: 'var(--hw-orange)' },
  'ผิวหนัง':             { bg: 'var(--hw-blue-bg)',  text: 'var(--hw-blue)' },
  'จิตเวช':              { bg: 'var(--hw-blue-bg)',  text: 'var(--hw-blue)' },
  'ออร์โธปีดิกส์':       { bg: 'var(--hw-red-bg)',   text: '#F87171' },
  'สูตินรีเวช':          { bg: 'var(--hw-red-bg)',   text: '#F87171' },
  'ตา':                  { bg: 'var(--hw-peach-bg)', text: 'var(--hw-orange)' },
  'หู คอ จมูก':          { bg: 'var(--hw-mint-bg)',  text: 'var(--hw-green)' },
  'เวชกรรม':             { bg: 'var(--hw-mint-bg)',  text: 'var(--hw-green)' },
  'เวชปฏิบัติทั่วไป':    { bg: 'var(--hw-blue-bg)',  text: 'var(--hw-blue)' },
}

const DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function getSpecialtyColor(s: string | null) {
  if (!s) return { bg: 'var(--hw-mint-bg)', text: 'var(--hw-green)' }
  return SPECIALTY_COLORS[s] ?? { bg: 'var(--hw-mint-bg)', text: 'var(--hw-green)' }
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
              <span key={d} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--hw-mint-bg)] text-[var(--hw-green)]">
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
      className="flex gap-0 rounded-[16px] bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden hover:shadow-md hover:border-[var(--hw-green-dk)]/40 transition-all">

      {/* Photo */}
      <div className="w-[110px] flex-shrink-0 relative bg-[var(--hw-mint-bg)]">
        {doctor.avatar_url ? (
          <Image
            src={doctor.avatar_url}
            alt={doctor.full_name}
            fill
            className="object-cover object-top"
            sizes="110px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--hw-green)] font-bold text-2xl">
            {initials}
          </div>
        )}
        {doctor.is_online && (
          <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[var(--hw-green-dk)] border-2 border-white animate-pulse" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1">
            <div>
              <h3 className="font-bold text-[15px] leading-snug">{doctor.full_name}</h3>
              {doctor.license_no && (
                <p className="text-[11px] text-[var(--muted)] mt-0.5">{doctor.license_no}</p>
              )}
            </div>
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
