'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// ─── Icons ───────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.092 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function DoctorIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M7.5 5.25a3 3 0 013-3h3a3 3 0 013 3V15a3 3 0 01-3 3h-3a3 3 0 01-3-3V5.25zm3-1.5a1.5 1.5 0 00-1.5 1.5V15a1.5 1.5 0 001.5 1.5h3a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5h-3zM3 10.5a.75.75 0 01.75-.75H6a.75.75 0 010 1.5H3.75A.75.75 0 013 10.5zm14.25 0a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H18a.75.75 0 01-.75-.75zM12 18.75a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V19.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const NAV = [
  { href: '/',                  label: 'หน้าหลัก', Icon: HomeIcon,     match: (p: string) => p === '/' },
  { href: '/doctors',           label: 'แพทย์',    Icon: DoctorIcon,   match: (p: string) => p.startsWith('/doctors') || p.startsWith('/book') },
  { href: '/account/profile',   label: 'โปรไฟล์',  Icon: ProfileIcon,  match: (p: string) => p === '/account/profile' },
  { href: '/account/settings',  label: 'ตั้งค่า',  Icon: SettingsIcon, match: (p: string) => p === '/account/settings' },
]

// Pages that render WITHOUT the shell (auth, video call)
const NO_SHELL = ['/login', '/register', '/consent', '/auth', '/consult']

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showShell = !NO_SHELL.some(p => pathname.startsWith(p))

  if (!showShell) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-700">
          <Image src="/logo-transparent.png" alt="HappiWell Clinic" width={148} height={50} className="object-contain" priority />
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ href, label, Icon, match }) => {
            const active = match(pathname)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon active={active} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Clinic name at bottom */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">แฮปปี้เวลล์ คลินิกเวชกรรม</p>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <Image src="/logo-transparent.png" alt="HappiWell Clinic" width={120} height={40} className="object-contain" priority />
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex-shrink-0 safe-area-bottom">
          {NAV.map(({ href, label, Icon, match }) => {
            const active = match(pathname)
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <Icon active={active} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
