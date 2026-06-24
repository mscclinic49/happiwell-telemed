'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import {
  IconLayoutDashboard, IconCalendarClock, IconMessageCircle2,
  IconLogout, IconMenu2, IconX, IconPill,
} from '@tabler/icons-react'

const NAV = [
  { href: '/doctor',              label: 'ภาพรวม',  Icon: IconLayoutDashboard, exact: true },
  { href: '/doctor/appointments', label: 'นัดหมาย',  Icon: IconCalendarClock },
  { href: '/doctor/chat',         label: 'แชท',      Icon: IconMessageCircle2 },
  { href: '/doctor/rx',           label: 'ใบสั่งยา', Icon: IconPill },
]

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DoctorShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [doctorName, setDoctorName] = useState('')
  const [unread, setUnread] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    sb.from('hw_users').select('role, first_name, full_name').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.role !== 'doctor') { router.replace('/'); return }
        setDoctorName(data.full_name || data.first_name || 'แพทย์')
        setChecking(false)
      })
  }, [user, loading])

  const refreshUnread = useCallback(async () => {
    if (!user) return
    const { data: doc } = await sb.from('hw_doctors').select('id').eq('user_id', user.id).single()
    if (!doc) return
    const { data: convs } = await sb.from('hw_conversations').select('id').eq('doctor_id', doc.id)
    const convIds = (convs ?? []).map(c => c.id)
    if (convIds.length === 0) return
    const { count } = await sb
      .from('hw_messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', user.id)
      .is('read_at', null)
      .in('conversation_id', convIds)
    setUnread(count ?? 0)
  }, [user])

  useEffect(() => {
    if (!user || checking) return
    refreshUnread()
    const ch = sb.channel('doctor-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hw_messages' }, refreshUnread)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [user, checking, refreshUnread])

  async function signOut() { await sb.auth.signOut(); router.replace('/login') }

  if (loading || checking) return (
    <div className="h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-8 h-8 border-4 border-[#1a8a6e] border-t-transparent rounded-full animate-spin" />
    </div>
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
            {href === '/doctor/chat' && unread > 0 && (
              <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none animate-pulse">
                {unread}
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
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a8a6e] mb-0.5">{'HappiWell'}</div>
          <div className="text-[11px] text-[var(--muted)]">{'พอร์ทัลแพทย์'}</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="px-4 py-4 border-t border-[var(--border)]">
          <div className="text-xs font-semibold text-[var(--foreground)] mb-0.5 truncate">{doctorName}</div>
          <button onClick={signOut} className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-red-500 transition-colors mt-2">
            <IconLogout size={15} />{'ออกจากระบบ'}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-[var(--card-bg)] border-b border-[var(--border)] flex items-center px-4 h-14">
        <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5 mr-3">
          <IconMenu2 size={22} className="text-[var(--muted)]" />
        </button>
        <span className="font-bold text-sm flex-1">
          {'HappiWell'}<span className="text-[var(--muted)] font-normal ml-1.5 text-xs">{'แพทย์'}</span>
        </span>
        <button onClick={signOut} className="text-[var(--muted)] hover:text-red-500">
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
                <div className="text-xs font-bold uppercase tracking-widest text-[#1a8a6e]">{'HappiWell'}</div>
                <div className="text-[11px] text-[var(--muted)]">{'พอร์ทัลแพทย์'}</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-[var(--muted)]">
                <IconX size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavLinks onClick={() => setSidebarOpen(false)} />
            </nav>
            <div className="px-4 py-4 border-t border-[var(--border)]">
              <div className="text-xs font-semibold truncate text-[var(--foreground)]">{doctorName}</div>
              <button onClick={signOut} className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-red-500 transition-colors mt-2">
                <IconLogout size={15} />{'ออกจากระบบ'}
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  )
}
