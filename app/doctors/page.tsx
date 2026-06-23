'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { IconSearch } from '@tabler/icons-react'
import { supabase, type Doctor } from '@/lib/supabase'
import { DoctorCard } from '@/components/DoctorCard'
import { useAuth } from '@/lib/auth-context'

export default function DoctorsPage() {
  const { user } = useAuth()
  const browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase
      .from('hw_doctors')
      .select('id, full_name, specialty, bio, avatar_url, consultation_fee, rating, is_online')
      .eq('is_active', true)
      .order('is_online', { ascending: false })
      .order('rating', { ascending: false })
      .then(({ data }) => { setDoctors((data as Doctor[]) || []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!user) return
    browserClient
      .from('hw_favorite_doctors')
      .select('doctor_id')
      .eq('user_id', user.id)
      .then(({ data }) => setFavorites(new Set((data ?? []).map((r: { doctor_id: string }) => r.doctor_id))))
  }, [user])

  async function toggleFavorite(doctorId: string, isFav: boolean) {
    if (!user) return
    if (isFav) {
      await browserClient.from('hw_favorite_doctors').delete().eq('user_id', user.id).eq('doctor_id', doctorId)
      setFavorites(prev => { const s = new Set(prev); s.delete(doctorId); return s })
    } else {
      await browserClient.from('hw_favorite_doctors').insert({ user_id: user.id, doctor_id: doctorId })
      setFavorites(prev => new Set([...prev, doctorId]))
    }
  }

  const filtered = doctors.filter(d =>
    !search ||
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.specialty ?? '').includes(search)
  )

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-8">
      <h1 className="text-xl font-bold mb-5">{'ปรึกษาแพทย์'}</h1>

      <div className="relative mb-5">
        <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={'ค้นหาชื่อแพทย์ หรือสาขา...'}
          className="w-full pl-9 pr-4 py-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[#1a8a6e]"
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
        {filtered.map(doc => (
          <DoctorCard
            key={doc.id}
            doctor={doc}
            isFavorited={favorites.has(doc.id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </div>
    </div>
  )
}
