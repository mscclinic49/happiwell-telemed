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
    async function fetch() {
      const { data } = await supabase
        .from('hw_appointments')
        .select('id, scheduled_at, symptoms, hw_doctors(full_name, specialty, consultation_fee)')
        .eq('id', id)
        .single()
      setAppt(data as unknown as AppointmentDetail)
    }
    fetch()
  }, [id])

  if (!appt) return <p className="p-8">กำลังโหลด...</p>

  const date = new Date(appt.scheduled_at)
  const displayDate = date.toLocaleDateString('th-TH', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  })
  const displayTime = date.toLocaleTimeString('th-TH', { 
    hour: '2-digit', minute: '2-digit' 
  })

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto text-center">
      <div className="text-6xl mb-4 mt-12">✅</div>
      <h1 className="text-2xl font-bold mb-2">จองสำเร็จ!</h1>
      <p className="text-gray-600 mb-8">ระบบจะส่งข้อความแจ้งเตือนก่อนถึงเวลานัด</p>

      <div className="bg-white border border-gray-200 rounded-lg p-5 text-left mb-6">
        <div className="text-xs text-gray-500 uppercase mb-2">รายละเอียดนัด</div>
        <div className="mb-3">
          <div className="text-sm text-gray-600">แพทย์</div>
          <div className="font-medium">{appt.hw_doctors?.full_name}</div>
          <div className="text-sm text-gray-500">{appt.hw_doctors?.specialty}</div>
        </div>
        <div className="mb-3">
          <div className="text-sm text-gray-600">วันที่</div>
          <div className="font-medium">{displayDate}</div>
        </div>
        <div className="mb-3">
          <div className="text-sm text-gray-600">เวลา</div>
          <div className="font-medium">{displayTime} น.</div>
        </div>
        <div className="mb-3">
          <div className="text-sm text-gray-600">อาการ</div>
          <div className="font-medium">{appt.symptoms}</div>
        </div>
        <div className="border-t pt-3 flex justify-between">
          <span className="text-gray-600">ค่าปรึกษา</span>
          <span className="font-bold text-teal-700">฿{appt.hw_doctors?.consultation_fee}</span>
        </div>
      </div>

      
      <a href="/"
        className="block w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700"
      >
        กลับหน้าหลัก
      </a>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<p className="p-8">กำลังโหลด...</p>}>
      <SuccessContent />
    </Suspense>
  )
} 
