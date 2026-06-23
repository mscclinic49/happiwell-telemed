import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Providers } from './providers'
import { AppShell } from '@/components/AppShell'
import './globals.css'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: 'HappiWell Clinic คลินิกเวชกรรม',
  description: 'แฮปปี้เวลล์ คลินิกเวชกรรม — ปรึกษาแพทย์ออนไลน์',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
