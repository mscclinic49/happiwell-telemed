'use client'

import { useState } from 'react'
import { IconHelp, IconChevronDown, IconPhone, IconBrandLine } from '@tabler/icons-react'

const FAQS = [
  {
    q: 'บริการ Telemedicine คืออะไร?',
    a: 'บริการปรึกษาแพทย์ออนไลน์ผ่านวิดีโอคอล โดยไม่ต้องเดินทางมาคลินิก เหมาะสำหรับอาการเจ็บป่วยทั่วไป เช่น ไข้หวัด ปวดหัว ผื่นคัน หรือการติดตามอาการหลังการรักษา',
  },
  {
    q: 'วิธีนัดหมายแพทย์',
    a: 'ไปที่เมนู "ปรึกษาแพทย์" เลือกแพทย์ที่ต้องการ กดปุ่ม "นัดปรึกษา" จากนั้นเลือกวันและเวลา กรอกอาการ แล้วกดยืนยัน',
  },
  {
    q: 'วิธีเข้าร่วมวิดีโอคอล',
    a: 'เมื่อถึงเวลานัด ไปที่เมนู "นัดหมายของฉัน" แล้วกดปุ่ม "เข้าห้องปรึกษา" ระบบจะเปิดวิดีโอคอลในหน้าต่างใหม่ กรุณาอนุญาตการใช้กล้องและไมโครโฟนของเบราว์เซอร์',
  },
  {
    q: 'ใบสั่งยาอยู่ที่ไหน?',
    a: 'หลังการปรึกษาแพทย์ เจ้าหน้าที่จะอัพโหลดใบสั่งยาให้ในเมนู "ใบสั่งยา" ท่านสามารถดาวน์โหลดและนำไปซื้อยาที่ร้านขายยาทั่วไปได้',
  },
  {
    q: 'สามารถใช้สิทธิประกันได้ไหม?',
    a: 'ขึ้นอยู่กับประเภทสิทธิ์และเงื่อนไขของประกันของท่าน กรุณาบันทึกข้อมูลสิทธิ์ในเมนู "สิทธิเบิกจ่าย" และแจ้งแพทย์ระหว่างการปรึกษา',
  },
  {
    q: 'ลืมรหัสผ่านทำอย่างไร?',
    a: 'กดลิงก์ "ลืมรหัสผ่าน" ที่หน้าเข้าสู่ระบบ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลที่ลงทะเบียนไว้',
  },
  {
    q: 'ต้องการแก้ไขหรือยกเลิกนัดหมาย',
    a: 'กรุณาติดต่อคลินิกโดยตรงที่ โทร 02-000-4586 หรือ Line @p49clinic ล่วงหน้าอย่างน้อย 2 ชั่วโมงก่อนเวลานัด',
  },
  {
    q: 'ข้อมูลส่วนตัวปลอดภัยไหม?',
    a: 'ข้อมูลทั้งหมดถูกเข้ารหัสและจัดเก็บอย่างปลอดภัยตามมาตรฐาน PDPA ข้อมูลสุขภาพจะไม่ถูกเปิดเผยต่อบุคคลที่สามโดยไม่ได้รับความยินยอม',
  },
  {
    q: 'อายุขั้นต่ำในการใช้บริการ',
    a: 'ต้องมีอายุ 20 ปีบริบูรณ์ขึ้นไปจึงจะสามารถสมัครและใช้บริการได้',
  },
  {
    q: 'มีปัญหาด้านเทคนิคระหว่างวิดีโอคอล',
    a: 'ลองรีเฟรชหน้าหรือปิดแล้วเปิดเบราว์เซอร์ใหม่ ตรวจสอบว่าเบราว์เซอร์ได้รับอนุญาตการใช้กล้องและไมโครโฟนแล้ว หากยังมีปัญหาติดต่อ Line @p49clinic',
  },
]

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 pb-12">
      <div className="flex items-center gap-3 mb-2">
        <IconHelp size={22} className="text-[var(--hw-green-dk)]" />
        <h1 className="text-2xl font-bold">{'ศูนย์ช่วยเหลือ'}</h1>
      </div>
      <p className="text-sm text-[var(--muted)] mb-8">{'คำถามที่พบบ่อย'}</p>

      <div className="space-y-2 mb-10">
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#e8f7f3] transition-colors"
            >
              <span className="font-medium pr-4">{faq.q}</span>
              <IconChevronDown size={18} className={`text-[var(--muted)] flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && (
              <div className="px-5 pb-4 text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#e8f7f3] rounded-[14px] p-5">
        <h2 className="font-bold mb-1">{'ยังต้องการความช่วยเหลือ?'}</h2>
        <p className="text-sm text-[var(--muted)] mb-4">{'ติดต่อเจ้าหน้าที่คลินิกได้โดยตรง'}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="tel:020004586"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: 'var(--hw-green)' }}
          >
            <IconPhone size={16} />{'โทร 02-000-4586'}
          </a>
          <a
            href="https://line.me/R/ti/p/@p49clinic"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: '#06C755' }}
          >
            <IconBrandLine size={16} />{'Line @p49clinic'}
          </a>
        </div>
        <p className="text-xs text-[var(--muted)] mt-3">
          {'จันทร์–ศุกร์ 08:00–18:00 · เสาร์–อาทิตย์ 08:00–12:00'}
        </p>
      </div>
    </div>
  )
}

