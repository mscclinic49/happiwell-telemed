'use client'

import Link from 'next/link'
import { IconChevronLeft, IconBell } from '@tabler/icons-react'
import { LineConnectCard } from '@/components/LineConnectCard'
import { LIFF_ID } from '@/lib/line'

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] mb-4 hover:text-[var(--foreground)]">
        <IconChevronLeft size={16} />{'หน้าหลัก'}
      </Link>
      <h1 className="font-display text-2xl font-semibold mb-1">{'การแจ้งเตือน'}</h1>
      <p className="text-sm text-[var(--muted)] mb-6">{'เลือกช่องทางที่ต้องการรับข่าวสารเกี่ยวกับนัดหมาย'}</p>

      {LIFF_ID ? (
        <>
          <LineConnectCard context="settings" />
          <h2 className="text-sm font-semibold mt-7 mb-3">{'ข้อความที่จะได้รับ'}</h2>
          <ul className="space-y-2.5 text-sm">
            {[
              'ยืนยันทันทีเมื่อนัดหมายสำเร็จ',
              'เตือนล่วงหน้าภายใน 24 ชั่วโมงก่อนนัด',
              'เตือนอีกครั้งก่อนนัด 15 นาที พร้อมลิงก์เข้าห้อง',
              'แจ้งทันทีเมื่อแพทย์เปิดห้องปรึกษา',
              'แจ้งเมื่อนัดหมายถูกยกเลิก',
            ].map(t => (
              <li key={t} className="flex items-start gap-2.5">
                <IconBell size={16} className="text-[var(--hw-green-dk)] flex-shrink-0 mt-0.5" />{t}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="rounded-[14px] border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted)]">
          {'การแจ้งเตือนทาง LINE กำลังจะเปิดให้ใช้งานเร็วๆ นี้'}
        </div>
      )}
    </div>
  )
}
