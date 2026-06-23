'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, type Doctor } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00']

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const doctorId = params.id as string

  const { user } = useAuth()
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [symptoms, setSymptoms] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDoctor() {
      const { data, error } = await supabase
        .from('hw_doctors')
        .select('id, full_name, specialty, bio, avatar_url, consultation_fee, rating, is_online')
        .eq('id', doctorId)
        .single()

      if (error) setError(error.message)
      else setDoctor(data)
      setLoading(false)
    }
    fetchDoctor()
  }, [doctorId])

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  function formatDate(d: Date) {
    return d.toISOString().split('T')[0]
  }

  function displayDate(d: Date) {
    const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    return {
      day: days[d.getDay()],
      date: d.getDate(),
    }
  }

  async function handleSubmit() {
    if (!selectedDate || !selectedTime || !symptoms.trim()) {
      alert('กรุณาเลือกวัน เวลา และกรอกอาการให้ครบ')
      return
    }

    setSubmitting(true)
    setError(null)

    const scheduledAt = `${selectedDate}T${selectedTime}:00+07:00`

    const { data, error } = await supabase
      .from('hw_appointments')
      .insert({
        user_id: user!.id,
        doctor_id: doctorId,
        scheduled_at: scheduledAt,
        duration_minutes: 15,
        status: 'pending',
        consultation_type: 'video',
        symptoms: symptoms.trim(),
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    router.push(`/book/success?id=${data.id}`)
  }

  if (loading) return <p className="p-8 text-gray-500 dark:text-gray-400">กำลังโหลด...</p>
  if (!doctor) return <p className="p-8 text-red-600 dark:text-red-400">ไม่พบแพทย์</p>

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <a href="/" className="text-teal-600 dark:text-teal-400 mb-4 inline-block">← กลับ</a>

      <h1 className="text-2xl font-bold mb-1">จองนัดหมาย</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{doctor.full_name} · {doctor.specialty}</p>

      <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-teal-800 dark:text-teal-300">ค่าปรึกษา</span>
          <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">฿{doctor.consultation_fee}</span>
        </div>
        <div className="text-xs text-teal-700 dark:text-teal-400 mt-1">วิดีโอคอล 15 นาที</div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">เลือกวันที่</label>
        <div className="grid grid-cols-7 gap-2">
          {dates.map((d) => {
            const dateStr = formatDate(d)
            const display = displayDate(d)
            const isSelected = selectedDate === dateStr
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500'
                }`}
              >
                <div className="text-xs">{display.day}</div>
                <div className="text-lg font-medium">{display.date}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">เลือกเวลา</label>
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTime(t)}
              className={`p-3 rounded-lg border text-center transition-colors ${
                selectedTime === t
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">บรรยายอาการ</label>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          rows={4}
          placeholder="เช่น ปวดหัวมา 2 วัน มีไข้ต่ำ ไอแห้งๆ"
          className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-teal-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3 mb-4 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700 disabled:opacity-50"
      >
        {submitting ? 'กำลังจอง...' : `ยืนยันการจอง · ฿${doctor.consultation_fee}`}
      </button>
    </main>
  )
}
