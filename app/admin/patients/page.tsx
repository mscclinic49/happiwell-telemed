'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { IconUsers, IconSearch, IconPhone, IconChevronRight, IconShieldCheck, IconShieldOff } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Patient = {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  date_of_birth: string | null
  gender: string | null
  created_at: string
  identity_verified: boolean
}

const GENDER: Record<string, string> = { male: 'ชาย', female: 'หญิง', other: 'อื่น' }

export default function AdminPatientsPage() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    sb.from('hw_users')
      .select('id, full_name, first_name, last_name, phone, date_of_birth, gender, created_at, identity_verified')
      .eq('role', 'patient')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPatients((data as Patient[]) ?? [])
        setLoading(false)
      })
  }, [user])

  const filtered = patients.filter(p => {
    if (!search) return true
    const name = p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
    return name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone ?? '').includes(search)
  })

  function displayName(p: Patient) {
    return p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || `(${p.id.slice(0, 8)})`
  }

  function calcAge(dob: string | null) {
    if (!dob) return null
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-12">
      <div className="flex items-center gap-2 mb-1">
        <IconUsers size={20} className="text-[var(--hw-green-dk)]" />
        <h1 className="text-lg font-bold">{'รายชื่อคนไข้'}</h1>
        <span className="text-xs text-[var(--muted)] bg-[var(--border)] px-2 py-0.5 rounded-full">{patients.length}</span>
      </div>
      <p className="text-xs text-[var(--muted)] mb-5">{'คลิกเพื่อดูและจัดการข้อมูลคนไข้'}</p>

      <div className="relative mb-5">
        <IconSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={'ค้นหาชื่อ หรือเบอร์โทร...'}
          className="w-full pl-9 pr-4 py-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[var(--hw-green-dk)]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-[var(--muted)]">
          <IconUsers size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">{'ไม่พบคนไข้'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const age = calcAge(p.date_of_birth)
            return (
              <Link key={p.id} href={`/admin/patients/${p.id}`}
                className="block bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3 hover:border-[var(--hw-green-dk)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{displayName(p)}</span>
                      {p.identity_verified
                        ? <IconShieldCheck size={14} className="text-[var(--hw-green-dk)] flex-shrink-0" />
                        : <IconShieldOff size={14} className="text-orange-400 flex-shrink-0" />}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {p.phone && (
                        <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                          <IconPhone size={11} />{p.phone}
                        </span>
                      )}
                      {age !== null && (
                        <span className="text-xs text-[var(--muted)]">
                          {GENDER[p.gender ?? ''] ?? ''}{age > 0 ? ` · ${age} ปี` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <IconChevronRight size={16} className="text-[var(--muted)] flex-shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
