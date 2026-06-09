'use client'

import { useEffect, useState } from 'react'
import { supabase, type Doctor } from '@/lib/supabase'

export default function Home() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDoctors() {
      const { data, error } = await supabase
        .from('hw_doctors')
        .select('id, full_name, specialty, consultation_fee, rating, is_online')
        .eq('is_active', true)
        .order('rating', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setDoctors(data || [])
      }
      setLoading(false)
    }

    fetchDoctors()
  }, [])

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">HappiWell Telemedicine</h1>
      <p className="text-gray-600 mb-8">ปรึกษาแพทย์ออนไลน์</p>

      <h2 className="text-xl font-semibold mb-4">แพทย์ของเรา</h2>

      {loading && <p>กำลังโหลด...</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {!loading && !error && doctors.length === 0 && (
        <p className="text-gray-500">ยังไม่มีแพทย์ในระบบ</p>
      )}

      <div className="space-y-3">
        {doctors.map((doc) => (
          <div key={doc.id} className="border rounded-lg p-4 flex items-center gap-4 bg-white">
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-2xl">
              DR
            </div>
            <div className="flex-1">
              <div className="font-medium">{doc.full_name}</div>
              <div className="text-sm text-gray-600">{doc.specialty}</div>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-yellow-600">★ {doc.rating}</span>
                {doc.is_online ? (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ออนไลน์</span>
                ) : (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">ออฟไลน์</span>
                )}
                <span className="text-gray-500">฿{doc.consultation_fee}/ครั้ง</span>
              </div>
            </div>
            
            <a href={`/book/${doc.id}`}
              className="bg-teal-600 text-white px-4 py-2 rounded-full text-sm hover:bg-teal-700"
            >
              จอง
            </a>
          </div>
        ))}
      </div>
    </main>
  )
}