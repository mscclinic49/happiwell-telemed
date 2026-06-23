'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  IconCalendarClock, IconStethoscope, IconPill, IconMessageCircle2,
  IconUser, IconId, IconLock, IconSignature,
  IconHistory, IconBook2, IconHeart, IconShield,
  IconMapPin, IconShieldCheck,
  IconFileText, IconHelp, IconLogout, IconChevronDown,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

const NAV = [
  {
    href: '/',
    label: 'นัดหมาย',
    Icon: IconCalendarClock,
    match: (p: string) => p === '/',
  },
  {
    href: '/doctors',
    label: 'แพทย์',
    Icon: IconStethoscope,
    match: (p: string) => p.startsWith('/doctors'),
  },
  {
    href: '/chat',
    label: 'แชท',
    Icon: IconMessageCircle2,
    match: (p: string) => p.startsWith('/chat'),
  },
  {
    href: '/prescriptions',
    label: 'ใบสั่งยา',
    Icon: IconPill,
    match: (p: string) => p.startsWith('/prescriptions'),
  },
]

const PROFILE_SECTIONS = [
  {
    title: 'บัญชี',
    items: [
      { href: '/account/profile',          label: 'ข้อมูลส่วนตัว',         Icon: IconUser },
      { href: '/account/change-password',  label: 'เปลี่ยนรหัสผ่าน',       Icon: IconLock },
      { href: '/account/signature',        label: 'ลายเซ็นดิจิทัล',        Icon: IconSignature },
    ],
  },
  {
    title: 'สุขภาพ',
    items: [
      { href: '/history',                  label: 'ประวัติการปรึกษา',       Icon: IconHistory },
      { href: '/health-journal',           label: 'สมุดบันทึกสุขภาพ',      Icon: IconBook2 },
      { href: '/account/favorites',        label: 'แพทย์ที่ชื่นชอบ',       Icon: IconHeart },
      { href: '/account/insurance',        label: 'สิทธิเบิกจ่าย',         Icon: IconShield },
    ],
  },
  {
    title: 'บริการ',
    items: [
      { href: '/account/delivery-address', label: 'ที่อยู่รับยา',           Icon: IconMapPin },
    ],
  },
  {
    title: 'การตั้งค่า',
    items: [
      { href: '/account/settings',         label: 'ความยินยอม PDPA',       Icon: IconShieldCheck },
      { href: '/complaint',                label: 'ร้องเรียน / แจ้งปัญหา', Icon: IconMessageCircle2 },
      { href: '/terms',                    label: 'เงื่อนไขการใช้บริการ',   Icon: IconFileText },
      { href: '/help',                     label: 'ศูนย์ช่วยเหลือ',        Icon: IconHelp },
    ],
  },
]

const NO_SHELL = ['/login', '/register', '/consent', '/auth', '/consult']

function UserAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = name.replace(/^(นาย|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/, '').slice(0, 1) || '?'
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: '#1a8a6e', fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  )
}

function MenuItems({ onClose, onSignOut }: { onClose: () => void; onSignOut: () => void }) {
  return (
    <div className="overflow-y-auto max-h-[70vh]">
      {PROFILE_SECTIONS.map((section, si) => (
        <div key={section.title}>
          {si > 0 && <div className="border-t border-[var(--border)]" />}
          <div className="px-4 py-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-1">
              {section.title}
            </div>
            {section.items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex items-center gap-2.5 px-2 py-2.5 rounded-[10px] text-sm hover:bg-[#e8f7f3] transition-colors"
              >
                <Icon size={16} className="text-[#1a8a6e] flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      ))}
      <div className="border-t border-[var(--border)]" />
      <div className="p-2">
        <button
          onClick={onSignOut}
          className="flex items-center gap-2.5 px-2 py-2.5 rounded-[10px] text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <IconLogout size={16} className="flex-shrink-0" />
          {'ออกจากระบบ'}
        </button>
      </div>
    </div>
  )
}

function ProfileDropdown({ displayName, email, onSignOut }: {
  displayName: string; email: string; onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-[#e8f7f3] transition-colors"
      >
        <UserAvatar name={displayName} size={32} />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs font-semibold truncate">{displayName}</div>
          <div className="text-xs text-[var(--muted)] truncate">{email}</div>
        </div>
        <IconChevronDown size={14} className={`text-[var(--muted)] transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] shadow-xl overflow-hidden z-50 w-56">
          <MenuItems onClose={() => setOpen(false)} onSignOut={() => { setOpen(false); onSignOut() }} />
        </div>
      )}
    </div>
  )
}

function MobileProfileDropdown({ displayName, onSignOut }: {
  displayName: string; onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}>
        <UserAvatar name={displayName} size={34} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] shadow-xl overflow-hidden z-50 w-60">
          <MenuItems onClose={() => setOpen(false)} onSignOut={() => { setOpen(false); onSignOut() }} />
        </div>
      )}
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const showShell = !NO_SHELL.some(p => pathname.startsWith(p))

  const displayName = user?.user_metadata?.first_name
    ? `${user.user_metadata.title ?? ''}${user.user_metadata.first_name}`
    : (user?.email?.split('@')[0] ?? '')

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  if (!showShell) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-[var(--card-bg)] border-r border-[var(--border)]">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <Link href="/">
            <Image src="/logo-hc.png" alt="HappiWell Clinic" width={148} height={52} className="object-contain" priority />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-3 rounded-[10px] text-base font-medium transition-colors ${
                  active
                    ? 'text-[#1a8a6e] font-semibold'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[#e8f7f3]'
                }`}
                style={active ? { background: '#e8f7f3' } : {}}
              >
                <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        {user && (
          <div className="p-3 border-t border-[var(--border)]">
            <ProfileDropdown displayName={displayName} email={user.email ?? ''} onSignOut={handleSignOut} />
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--card-bg)] border-b border-[var(--border)] flex-shrink-0">
          <Link href="/">
            <Image src="/logo-hc.png" alt="HappiWell Clinic" width={120} height={42} className="object-contain" priority />
          </Link>
          {user && <MobileProfileDropdown displayName={displayName} onSignOut={handleSignOut} />}
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex bg-[var(--card-bg)] border-t border-[var(--border)] flex-shrink-0">
          {NAV.map(({ href, label, Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  active ? 'text-[#1a8a6e]' : 'text-[var(--muted)]'
                }`}
              >
                <Icon size={25} strokeWidth={active ? 2.2 : 1.6} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
