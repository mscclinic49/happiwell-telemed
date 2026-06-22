'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CONSENTS = [
  {
    key: 'general_data',
    title: 'ยินยอมให้เก็บข้อมูลทั่วไป',
    detail: 'ข้อมูลชื่อ เบอร์โทรศัพท์ และอีเมล เพื่อใช้ในการนัดหมายและติดต่อ',
  },
  {
    key: 'health_data',
    title: 'ยินยอมให้เก็บข้อมูลสุขภาพ (Sensitive Data ตาม PDPA)',
    detail: 'อาการ ประวัติการรักษา และข้อมูลทางการแพทย์ เพื่อใช้ในการวินิจฉัยและรักษา',
  },
  {
    key: 'video_recording',
    title: 'ยินยอมให้บันทึกวิดีโอทุกครั้งที่ปรึกษา',
    detail: 'การบันทึกเป็นข้อกำหนดบังคับของบริการ เพื่อเก็บเป็นเวชระเบียนดิจิทัล ข้อมูลถูกรักษาเป็นความลับ',
  },
]

export default function ConsentPage() {
  const router = useRouter()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allChecked = CONSENTS.every(c => checked[c.key])

  async function handleSubmit() {
    if (!allChecked) return
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/auth/consent', { method: 'POST' })

    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      setSubmitting(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <div className="mt-8 mb-6">
        <h1 className="text-2xl font-bold mb-1">การยินยอมใช้บริการ</h1>
        <p className="text-sm text-gray-600">กรุณาอ่านและยืนยันทุกข้อก่อนเริ่มใช้งาน</p>
      </div>

      <div className="space-y-3 mb-6">
        {CONSENTS.map(c => (
          <label
            key={c.key}
            className={`flex gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              checked[c.key]
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 accent-teal-600 flex-shrink-0"
              checked={!!checked[c.key]}
              onChange={e => setChecked(prev => ({ ...prev, [c.key]: e.target.checked }))}
            />
            <div>
              <div className="font-medium text-sm">{c.title}</div>
              <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{c.detail}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-xs text-gray-500 leading-relaxed">
        การยินยอมจะถูกบันทึกพร้อมวันเวลาและ IP Address เป็นหลักฐานตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
        สามารถถอนความยินยอมได้ที่หน้าการตั้งค่าบัญชี
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allChecked || submitting}
        className="w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'กำลังบันทึก...' : 'ยืนยันการยินยอมทั้งหมด'}
      </button>
    </main>
  )
}
