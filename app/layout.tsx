import type { Metadata } from 'next'
import { Sarabun, Kanit } from 'next/font/google'
import { Providers } from './providers'
import { AppShell } from '@/components/AppShell'
import './globals.css'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const kanit = Kanit({
  subsets: ['thai', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-kanit',
})

export const metadata: Metadata = {
  title: 'HappiWell Clinic คลินิกเวชกรรม',
  description: 'แฮปปี้เวลล์ คลินิกเวชกรรม — ปรึกษาแพทย์ออนไลน์',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${sarabun.className} ${kanit.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Apply dark class before first paint — no flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('hw-theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})()` }} />
      </head>
      <body className="h-full">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
