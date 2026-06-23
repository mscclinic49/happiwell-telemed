'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import {
  IconMessageCircle2, IconCalendarClock, IconStethoscope,
  IconPill, IconLogout, IconMenu2, IconX,
} from '@tabler/icons-react'

const NAV = [
  { href: '/admin/chat',         label: 'แชท',         Icon: IconMessageCircle2 },
  { href: '/admin/appointments', label: 'นัดหมาย',     Icon: IconCalendarClock  },
  { href: '/admin/doctors',      label: 'แพทย์',        Icon: IconStethoscope   },
  { href: '/admin/prescriptions',label: 'ใบสั่งยา',     Icon: IconPill          },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    sb.from('hw_users').select('role, first_name, full_name').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.role !== 'admin') { router.replace('/'); return }
        setAdminName(data.full_name || data.first_name || 'Admin')
        setChecking(false)
      })
  }, [user, loading])

  async function signOut() {
    await sb.auth.signOut()
    router.replace('/login')
  }

  if (loading || checking) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-8 h-8 border-4 border-[var(--hw-green)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {NAV.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link key={href} href={href} onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-medium transition-colors
              ${active
                ? 'bg-[var(--hw-mint-bg)] text-[var(--hw-green)]'
                : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'}`}>
            <Icon size={19} />
            {label}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-[var(--card-bg)] border-r border-[var(--border)]">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--hw-green)] mb-0.5">{'HappiWell'}</div>
          <div className="text-[11px] text-[var(--muted)]">{'แผงควบคุมแอดมิน'}</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--muted)] mb-3 truncate">{adminName}</div>
          <button onClick={signOut}
            className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-red-500 transition-colors">
            <IconLogout size={15} />{'ออกจากระบบ'}
          </button>
        </div>
      </aside>

      {/* ── Mobile: top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-[var(--card-bg)] border-b border-[var(--border)] flex items-center px-4 h-14">
        <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5 mr-3">
          <IconMenu2 size={22} className="text-[var(--muted)]" />
        </button>
        <span className="font-bold text-sm flex-1">{'HappiWell'}<span className="text-[var(--muted)] font-normal ml-1.5 text-xs">{'แอดมิน'}</span></span>
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
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--hw-green)]">{'HappiWell'}</div>
                <div className="text-[11px] text-[var(--muted)]">{'แผงควบคุมแอดมิน'}</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-[var(--muted)]">
                <IconX size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavLinks onClick={() => setSidebarOpen(false)} />
            </nav>
            <div className="px-4 py-4 border-t border-[var(--border)]">
              <div className="text-xs text-[var(--muted)] mb-3 truncate">{adminName}</div>
              <button onClick={signOut}
                className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-red-500 transition-colors">
                <IconLogout size={15} />{'ออกจากระบบ'}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  )
}
