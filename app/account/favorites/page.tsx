'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { IconHeart, IconHeartOff, IconStethoscope } from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type FavDoctor = {
  doctor_id: string
  hw_doctors: {
    id: string
    full_name: string
    specialty: string | null
    avatar_url: string | null
    consultation_fee: number
    is_online: boolean
  } | null
}

export default function FavoritesPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const [favs, setFavs] = useState<FavDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('hw_favorite_doctors')
      .select('doctor_id, hw_doctors(id, full_name, specialty, avatar_url, consultation_fee, is_online)')
      .eq('user_id', user.id)
      .then(({ data }) => { setFavs((data as unknown as FavDoctor[]) || []); setLoading(false) })
  }, [user])

  async function removeFavorite(doctorId: string) {
    setRemoving(doctorId)
    await supabase.from('hw_favorite_doctors').delete().eq('user_id', user!.id).eq('doctor_id', doctorId)
    setFavs(prev => prev.filter(f => f.doctor_id !== doctorId))
    setRemoving(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <IconHeart size={22} className="text-[#1a8a6e]" />
        <h1 className="text-xl font-bold">{'แพทย์ที่ชื่นชอบ'}</h1>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-24 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />)}
        </div>
      )}

      {!loading && favs.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <IconHeartOff size={44} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">{'ยังไม่มีแพทย์ที่ชื่นชอบ'}</p>
          <p className="text-xs mt-1 opacity-70">{'กดไอคอนหัวใจบนการ์ดแพทย์เพื่อเพิ่ม'}</p>
          <Link href="/doctors" className="inline-block mt-4 px-5 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: '#1a8a6e' }}>
            {'ค้นหาแพทย์'}
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {favs.map(({ doctor_id, hw_doctors: doc }) => {
          if (!doc) return null
          return (
            <div key={doctor_id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 flex items-center gap-4">
              {doc.avatar_url ? (
                <img src={doc.avatar_url} alt={doc.full_name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#1a8a6e] flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {doc.full_name.replace(/^(นาย|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|พญ\.|นพ\.)\s*/, '').slice(0, 1)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{doc.full_name}</div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] mt-0.5">
                  <IconStethoscope size={12} />
                  <span>{doc.specialty ?? 'ทั่วไป'}</span>
                  {doc.is_online && <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" />}
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5">{'฿'}{doc.consultation_fee} / ครั้ง</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/book/${doc.id}`}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                  style={{ background: '#1a8a6e' }}
                >
                  {'นัดหมาย'}
                </Link>
                <button
                  onClick={() => removeFavorite(doctor_id)}
                  disabled={removing === doctor_id}
                  className="p-2 rounded-full text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="นำออกจากรายการ"
                >
                  <IconHeart size={18} fill="currentColor" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
