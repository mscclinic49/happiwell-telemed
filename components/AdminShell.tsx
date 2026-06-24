'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import {
  IconMessageCircle2, IconCalendarClock, IconStethoscope,
  IconPill, IconLogout, IconMenu2, IconX, IconLayoutDashboard,
  IconUsers, IconBell,
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


function useUnreadChat(userId: string | undefined) {
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    if (!userId) return
    const { count } = await sb
      .from('hw_messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', userId)
      .is('read_at', null)
    setUnread(count ?? 0)
  }, [userId])

  useEffect(() => {
    refresh()
    const channel = sb.channel('admin-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hw_messages' }, refresh)
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [refresh])

  return { unread, refresh }
}

function usePending() {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    const [kyc, med, vac, lab, hist] = await Promise.all([
      sb.from('hw_identity_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('hw_medications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('hw_vaccines').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('hw_lab_results').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
      sb.from('hw_medical_history').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setCount((kyc.count ?? 0) + (med.count ?? 0) + (vac.count ?? 0) + (lab.count ?? 0) + (hist.count ?? 0))
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30000)
    return () => clearInterval(t)
  }, [refresh])

  return { count, refresh }
}


export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { count: pendingCount } = usePending()
  const { unread: unreadChat } = useUnreadChat(user?.id)

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
    <Link href="/admin/patients"
      className="relative p-2.5 rounded-[10px] text-[var(--muted)] hover:text-[var(--hw-green)] hover:bg-[#1a8a6e]/10 transition-colors flex items-center justify-center">
      <IconBell size={24} />
      {pendingCount > 0 && (
        <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </Link>
  )

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {NAV.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link key={href} href={href} onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium transition-colors
              ${active ? 'bg-[#1a8a6e]/15 text-[#1a8a6e]' : 'text-[var(--muted)] hover:bg-[#1a8a6e]/10 hover:text-[var(--foreground)]'}`}>
            <Icon size={19} />
            {label}
            {href === '/admin/patients' && pendingCount > 0 && (
              <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                {pendingCount}
              </span>
            )}
            {href === '/admin/chat' && unreadChat > 0 && (
              <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none animate-pulse">
                {unreadChat}
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

      {/* Floating bell — desktop only */}
      <div className="hidden md:block fixed top-4 right-4 z-40">
        <Bell />
      </div>

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  )
}
