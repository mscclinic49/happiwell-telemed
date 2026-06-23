'use client'

import { useEffect, useState } from 'react'
import { supabase, type Doctor } from '@/lib/supabase'

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('hw_doctors')
      .select('id, full_name, specialty, consultation_fee, rating, is_online')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setDoctors(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <main className="min-h-screen p-5 max-w-xl mx-auto">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <a href="/" className="text-blue-600 dark:text-blue-400 text-sm">← กลับ</a>
        <h1 className="text-xl font-bold">เลือกแพทย์</h1>
      </div>

      {loading && <p className="text-gray-500 dark:text-gray-400">กำลังโหลด...</p>}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {!loading && !error && doctors.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">ยังไม่มีแพทย์ในระบบ</p>
      )}

      <div className="space-y-3">
        {doctors.map((doc) => (
          <div key={doc.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm flex-shrink-0">
              DR
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{doc.full_name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{doc.specialty}</div>
              <div className="flex flex-wrap gap-2 mt-1 text-xs">
                <span className="text-yellow-600 dark:text-yellow-400">★ {doc.rating}</span>
                {doc.is_online ? (
                  <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">ออนไลน์</span>
                ) : (
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">ออฟไลน์</span>
                )}
                <span className="text-gray-500 dark:text-gray-400">฿{doc.consultation_fee}/ครั้ง</span>
              </div>
            </div>
            <a href={`/book/${doc.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-700 flex-shrink-0"
            >
              จอง
            </a>
          </div>
        ))}
      </div>
    </main>
  )
}
