import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import { Providers } from './providers'
import { AppShell } from '@/components/AppShell'
import './globals.css'

const sarabun = Sarabun({
  variable: '--font-sarabun',
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'HappiWell Clinic คลินิกเวชกรรม',
  description: 'แฮปปี้เวลล์ คลินิกเวชกรรม — ปรึกษาแพทย์ออนไลน์',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full antialiased`}>
      <body className="h-full">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
