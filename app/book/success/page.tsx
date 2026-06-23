'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AppointmentDetail = {
  id: string
  scheduled_at: string
  symptoms: string | null
  hw_doctors: {
    full_name: string
    specialty: string | null
    consultation_fee: number
  } | null
}

function SuccessContent() {
  const params = useSearchParams()
  const id = params.get('id')
  const [appt, setAppt] = useState<AppointmentDetail | null>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('hw_appointments')
      .select('id, scheduled_at, symptoms, hw_doctors(full_name, specialty, consultation_fee)')
      .eq('id', id)
      .single()
      .then(({ data }) => setAppt(data as unknown as AppointmentDetail))
  }, [id])

  if (!appt) return <p className="p-8 text-gray-500 dark:text-gray-400">กำลังโหลด...</p>

  const date = new Date(appt.scheduled_at)
  const displayDate = date.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const displayTime = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto text-center">
      <div className="text-6xl mb-4 mt-12">✅</div>
      <h1 className="text-2xl font-bold mb-2">จองสำเร็จ!</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">ระบบจะส่งข้อความแจ้งเตือนก่อนถึงเวลานัด</p>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-left mb-6">
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-3">รายละเอียดนัด</div>
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">แพทย์</div>
            <div className="font-medium">{appt.hw_doctors?.full_name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{appt.hw_doctors?.specialty}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">วันที่</div>
            <div className="font-medium">{displayDate}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">เวลา</div>
            <div className="font-medium">{displayTime} น.</div>
          </div>
          {appt.symptoms && (
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">อาการ</div>
              <div className="font-medium">{appt.symptoms}</div>
            </div>
          )}
          <div className="border-t dark:border-gray-700 pt-3 flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">ค่าปรึกษา</span>
            <span className="font-bold text-blue-700 dark:text-blue-400">฿{appt.hw_doctors?.consultation_fee}</span>
          </div>
        </div>
      </div>

      <a href={`/consult/${appt.id}`}
        className="block w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 mb-3"
      >
        เข้าห้องปรึกษา
      </a>
      <a href="/"
        className="block w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        กลับ Dashboard
      </a>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<p className="p-8 text-gray-500 dark:text-gray-400">กำลังโหลด...</p>}>
      <SuccessContent />
    </Suspense>
  )
}
