'use client'

import Link from 'next/link'
import Image from 'next/image'
import { IconStar, IconStethoscope, IconChevronRight } from '@tabler/icons-react'
import type { Doctor } from '@/lib/supabase'

const SPECIALTY_COLORS: Record<string, { bg: string; text: string }> = {
  'อายุรกรรม':      { bg: '#e8f7f3', text: '#1a8a6e' },
  'กุมารเวชกรรม':   { bg: '#faeeda', text: '#b97320' },
  'ผิวหนัง':        { bg: '#e6f1fb', text: '#185fa5' },
  'จิตเวช':         { bg: '#f0ebff', text: '#6d28d9' },
  'ออร์โธปีดิกส์':  { bg: '#fff0f0', text: '#b91c1c' },
  'สูตินรีเวช':     { bg: '#fdf2f8', text: '#9d174d' },
  'ตา':             { bg: '#fef9ec', text: '#92400e' },
  'หู คอ จมูก':     { bg: '#e8f7f3', text: '#065f46' },
}

function getSpecialtyColor(s: string | null) {
  if (!s) return { bg: '#f1f5f9', text: '#475569' }
  return SPECIALTY_COLORS[s] ?? { bg: '#e8f7f3', text: '#1a8a6e' }
}

function DoctorAvatar({ name, avatarUrl, size = 56 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = name.replace(/^(นพ\.|พญ\.|ทพ\.|ทพญ\.)\s*/, '').slice(0, 2)
  if (avatarUrl) {
    return <Image src={avatarUrl} alt={name} width={size} height={size} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <div className="rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-white"
      style={{ width: size, height: size, background: '#1a8a6e', fontSize: size * 0.32 }}>
      {initials}
    </div>
  )
}

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const { bg, text } = getSpecialtyColor(doctor.specialty)
  return (
    <Link href={`/doctors/${doctor.id}`} className="block rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] p-4 hover:shadow-md hover:border-[#1a8a6e]/30 transition-all">
      <div className="flex items-start gap-3">
        <DoctorAvatar name={doctor.full_name} avatarUrl={doctor.avatar_url} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-base leading-tight">{doctor.full_name}</div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {doctor.specialty && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: bg, color: text }}>
                    <IconStethoscope size={11} />{doctor.specialty}
                  </span>
                )}
                {doctor.is_online ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[#1a8a6e] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a8a6e] animate-pulse inline-block" />{'ออนไลน์'}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--muted)]">{'ออฟไลน์'}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {doctor.rating != null && (
                <span className="flex items-center gap-0.5 text-sm font-bold text-[#ef9f27]">
                  <IconStar size={14} fill="#ef9f27" />{Number(doctor.rating).toFixed(1)}
                </span>
              )}
              <IconChevronRight size={16} className="text-[var(--muted)]" />
            </div>
          </div>
          {doctor.bio && <p className="text-xs text-[var(--muted)] mt-2 line-clamp-2">{doctor.bio}</p>}
        </div>
      </div>
    </Link>
  )
}
