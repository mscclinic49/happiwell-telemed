'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import {
  IconMessageCircle2, IconCalendarClock, IconStethoscope,
  IconPill, IconLogout, IconMenu2, IconX, IconLayoutDashboard,
  IconUsers, IconBell, IconShieldOff, IconPill as IconMed,
  IconVaccine, IconTestPipe, IconNotes, IconChevronRight,
} from '@tabler/icons-react'

const NAV = [
  { href: '/admin',              label: 'ภาพรวม',   Icon: IconLayoutDashboard, exact: true },
  { href: '/admin/chat',         label: 'แชท',       Icon: IconMessageCircle2 },
  { href: '/admin/appointments', label: 'นัดหมาย',   Icon: IconCalendarClock  },
  { href: '/admin/doctors',      label: 'แพทย์',     Icon: IconStethoscope   },
  { href: '/admin/prescriptions',label: 'ใบสั่งยา',  Icon: IconPill          },
  { href: '/admin/patients',     label: 'คนไข้',     Icon: IconUsers         },
]

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Notif = {
  id: string
  patientId: string
  patientName: string
  type: 'kyc' | 'med' | 'vaccine' | 'lab' | 'history'
  detail: string
  createdAt: string
}

const NOTIF_ICON: Record<Notif['type'], React.ElementType> = {
  kyc:     IconShieldOff,
  med:     IconMed,
  vaccine: IconVaccine,
  lab:     IconTestPipe,
  history: IconNotes,
}
const NOTIF_LABEL: Record<Notif['type'], string> = {
  kyc: 'ยืนยันตัวตน', med: 'ยา', vaccine: 'วัคซีน', lab: 'ผลตรวจ', history: 'ประวัติ',
}

function usePending() {
  const [count, setCount] = useState(0)
  const [notifs, setNotifs] = useState<Notif[]>([])

  const refresh = useCallback(async () => {
    const [kyc, med, vac, lab, hist] = await Promise.all([
      sb.from('hw_identity_verifications').select('id, submitted_at, user_id').eq('status', 'pending').order('submitted_at', { ascending: false }).limit(10),
      sb.from('hw_medications').select('id, name, created_at, user_id').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
      sb.from('hw_vaccines').select('id, vaccine_name, created_at, user_id').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
      sb.from('hw_lab_results').select('id, test_name, created_at, user_id').eq('approval_status', 'pending').order('created_at', { ascending: false }).limit(10),
      sb.from('hw_medical_history').select('id, chief_complaint, created_at, user_id').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
    ])

    // collect unique user IDs
    const allItems = [
      ...(kyc.data ?? []).map(r => ({ ...r, type: 'kyc' as Notif['type'], detail: 'ยืนยันบัตรประชาชน', createdAt: r.submitted_at })),
      ...(med.data ?? []).map(r => ({ ...r, type: 'med' as Notif['type'], detail: (r as { name: string }).name, createdAt: r.created_at })),
      ...(vac.data ?? []).map(r => ({ ...r, type: 'vaccine' as Notif['type'], detail: (r as { vaccine_name: string }).vaccine_name, createdAt: r.created_at })),
      ...(lab.data ?? []).map(r => ({ ...r, type: 'lab' as Notif['type'], detail: (r as { test_name: string }).test_name, createdAt: r.created_at })),
      ...(hist.data ?? []).map(r => ({ ...r, type: 'history' as Notif['type'], detail: (r as { chief_complaint: string | null }).chief_complaint ?? 'ประวัติการรักษา', createdAt: r.created_at })),
    ]

    const total = allItems.length
    setCount(total)

    if (total === 0) { setNotifs([]); return }

    const uniqueIds = [...new Set(allItems.map(r => r.user_id))]
    const { data: users } = await sb.from('hw_users').select('id, full_name, first_name').in('id', uniqueIds)
    const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u.full_name || u.first_name || '—']))

    const sorted = allItems
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15)
      .map(r => ({
        id: r.id,
        patientId: r.user_id,
        patientName: userMap[r.user_id] ?? '—',
        type: r.type,
        detail: r.detail ?? '—',
        createdAt: r.createdAt,
      }))

    setNotifs(sorted)
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30000)
    return () => clearInterval(t)
  }, [refresh])

  return { count, notifs, refresh }
}

function BellDropdown({ count, notifs, onClose }: { count: number; notifs: Notif[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-80 bg-[var(--card-bg)] border border-[var(--border)] rounded-[16px] shadow-xl z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <span className="font-bold text-sm">{'การแจ้งเตือน'}</span>
        {count > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{count} รายการ</span>}
      </div>
      <div className="overflow-y-auto max-h-80">
        {notifs.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--muted)]">{'ไม่มีการแจ้งเตือน'}</div>
        ) : notifs.map(n => {
          const Icon = NOTIF_ICON[n.type]
          return (
            <Link key={`${n.type}-${n.id}`} href={`/admin/patients/${n.patientId}`} onClick={onClose}
              className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--background)] transition-colors border-b border-[var(--border)] last:border-0">
              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={13} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{n.patientName}</div>
                <div className="text-xs text-[var(--muted)] truncate">
                  <span className="text-orange-500 font-medium">{NOTIF_LABEL[n.type]}</span>{' · '}{n.detail}
                </div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">
                  {new Date(n.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
              <IconChevronRight size={13} className="text-[var(--muted)] mt-1 flex-shrink-0" />
            </Link>
          )
        })}
      </div>
      {count > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border)] text-center">
          <Link href="/admin/patients" onClick={onClose} className="text-xs text-[var(--hw-green)] font-medium">{'ดูคนไข้ทั้งหมด'}</Link>
        </div>
      )}
    </div>
  )
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const { count: pendingCount, notifs } = usePending()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    sb.from('hw_users').select('role, first_name, full_name').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.role !== 'admin' && data?.role !== 'superadmin') { router.replace('/'); return }
        setAdminName(data.full_name || data.first_name || 'Admin')
        setChecking(false)
      })
  }, [user, loading])

  async function signOut() { await sb.auth.signOut(); router.replace('/login') }

  if (loading || checking) return (
    <div className="h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const Bell = () => (
    <div className="relative">
      <button onClick={() => setBellOpen(v => !v)}
        className="relative p-1.5 text-[var(--muted)] hover:text-[var(--hw-green)] transition-colors">
        <IconBell size={18} />
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center animate-pulse">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>
      {bellOpen && <BellDropdown count={pendingCount} notifs={notifs} onClose={() => setBellOpen(false)} />}
    </div>
  )

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {NAV.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link key={href} href={href} onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium transition-colors
              ${active ? 'bg-[var(--hw-mint-bg)] text-[var(--hw-green)]' : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'}`}>
            <Icon size={19} />
            {label}
            {href === '/admin/patients' && pendingCount > 0 && (
              <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                {pendingCount}
              </span>
            )}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-[var(--card-bg)] border-r border-[var(--border)]">
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--hw-green)] mb-0.5">{'HappiWell'}</div>
          <div className="text-[11px] text-[var(--muted)]">{'แผงควบคุมแอดมิน'}</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="px-4 py-4 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--muted)] mb-3 truncate">{adminName}</div>
          <button onClick={signOut} className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-red-500 transition-colors">
            <IconLogout size={15} />{'ออกจากระบบ'}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-[var(--card-bg)] border-b border-[var(--border)] flex items-center px-4 h-14">
        <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5 mr-3">
          <IconMenu2 size={22} className="text-[var(--muted)]" />
        </button>
        <span className="font-bold text-sm flex-1">{'HappiWell'}<span className="text-[var(--muted)] font-normal ml-1.5 text-xs">{'แอดมิน'}</span></span>
        <div className="mr-1"><Bell /></div>
        <button onClick={signOut} className="text-[var(--muted)] hover:text-red-500 ml-1">
          <IconLogout size={18} />
        </button>
      </div>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-[var(--card-bg)] border-r border-[var(--border)] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--hw-green)]">{'HappiWell'}</div>
                <div className="text-[11px] text-[var(--muted)]">{'แผงควบคุมแอดมิน'}</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-[var(--muted)]"><IconX size={18} /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto"><NavLinks onClick={() => setSidebarOpen(false)} /></nav>
            <div className="px-4 py-4 border-t border-[var(--border)]">
              <div className="text-xs text-[var(--muted)] mb-3 truncate">{adminName}</div>
              <button onClick={signOut} className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-red-500 transition-colors">
                <IconLogout size={15} />{'ออกจากระบบ'}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Right column: top bar + content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-end px-5 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0 h-14">
          <Bell />
        </div>
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
      </div>
    </div>
  )
}
