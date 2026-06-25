'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { IconSearch } from '@tabler/icons-react'
import type { Doctor, DoctorSchedule } from '@/lib/supabase'
import { DoctorCard } from '@/components/DoctorCard'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      sb.from('hw_doctors')
        .select('id, full_name, specialty, license_no, bio, avatar_url, consultation_fee, rating, is_online')
        .eq('is_active', true)
        .order('rating', { ascending: false }),
      sb.from('hw_doctor_schedules')
        .select('doctor_id, day_of_week, start_time, end_time, is_available')
        .eq('is_available', true),
    ]).then(([{ data: docs }, { data: schedules }]) => {
      const sched = (schedules ?? []) as (DoctorSchedule & { doctor_id: string })[]
      const merged = (docs ?? []).map(d => ({
        ...d,
        hw_doctor_schedules: sched.filter(s => s.doctor_id === d.id),
      })) as Doctor[]
      setDoctors(merged)
      setLoading(false)
    })
  }, [])

  const filtered = doctors.filter(d =>
    !search ||
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.specialty ?? '').includes(search)
  )

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-8">
      <h1 className="text-xl font-bold mb-1">{'ทีมแพทย์'}</h1>
      <p className="text-sm text-[var(--muted)] mb-5">{'ข้อมูลแพทย์และตารางออกตรวจ'}</p>

      <div className="relative mb-5">
        <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={'ค้นหาชื่อแพทย์ หรือสาขา...'}
          className="w-full pl-9 pr-4 py-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[var(--hw-green-dk)]"
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-[var(--muted)]">
          <IconSearch size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{'ไม่พบแพทย์ที่ตรงกับการค้นหา'}</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(doc => <DoctorCard key={doc.id} doctor={doc} />)}
      </div>
    </div>
  )
}
