'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type UserProfile = {
  title: string | null
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  blood_type: string | null
  gender: string | null
  phone: string | null
  allergies: string | null
}

type Appointment = {
  id: string
  scheduled_at: string
  status: string
  symptoms: string | null
  hw_doctors: { full_name: string; specialty: string | null } | null
}

function calcAge(dob: string) {
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'รอยืนยัน',  color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' },
  confirmed: { label: 'ยืนยันแล้ว', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  completed: { label: 'เสร็จสิ้น',  color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
  cancelled: { label: 'ยกเลิก',    color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' },
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    async function load() {
      const [profileRes, apptRes] = await Promise.all([
        supabase
          .from('hw_users')
          .select('title, first_name, last_name, date_of_birth, blood_type, gender, phone, allergies')
          .eq('id', user!.id)
          .single(),
        supabase
          .from('hw_appointments')
          .select('id, scheduled_at, status, symptoms, hw_doctors(full_name, specialty)')
          .eq('user_id', user!.id)
          .order('scheduled_at', { ascending: false })
          .limit(10),
      ])
      if (profileRes.data) setProfile(profileRes.data)
      if (apptRes.data) setAppointments(apptRes.data as unknown as Appointment[])
      setLoadingData(false)
    }

    load()
  }, [user, authLoading, router])

  if (authLoading || loadingData) {
    return <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">กำลังโหลด...</div>
  }

  const displayName = profile
    ? `${profile.title || ''}${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.email
    : user?.email

  const upcoming = appointments.filter(a => new Date(a.scheduled_at) >= new Date() && a.status !== 'cancelled')
  const history  = appointments.filter(a => new Date(a.scheduled_at) < new Date() || a.status === 'completed')

  return (
    <div className="max-w-xl mx-auto p-5 space-y-5 pb-6">

      {/* Greeting */}
      <div className="pt-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">สวัสดี</p>
        <h1 className="text-xl font-bold">{displayName}</h1>
      </div>

      {/* สถานพยาบาล */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">สถานพยาบาล</h2>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">แฮปปี้เวลล์ คลินิกเวชกรรม</div>
            <div>📍 เลขที่ 193, 195 ชั้น 1 ถนนประชาอุทิศ ตำบลบางมด อำเภอทุ่งครุ กรุงเทพมหานคร</div>
            <div>📋 ใบอนุญาตประกอบกิจการ: 10101035068</div>
            <div>🕐 จ–ศ 08:00–18:00 · ส–อา 08:00–12:00</div>
            <div className="flex gap-3 pt-1">
              <a
                href="tel:020004586"
                className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full font-medium hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                📞 02-000-4586
              </a>
              <a
                href="https://line.me/R/ti/p/@p49clinic"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-full font-medium hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.952 10.116C19.952 5.592 15.494 1.92 9.976 1.92S0 5.592 0 10.116c0 4.066 3.607 7.47 8.48 8.116.33.071.78.218.894.5.102.255.067.655.033.913l-.145.871c-.044.255-.203.997.874.543 1.077-.453 5.815-3.425 7.93-5.862 1.463-1.608 2.886-3.72 2.886-6.081z"/>
                </svg>
                @p49clinic
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ข้อมูลคนไข้ */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">ข้อมูลคนไข้</h2>
          <a href="/account/profile" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">แก้ไข →</a>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
          {profile?.first_name ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">ชื่อ-นามสกุล</div>
                <div className="font-medium">{profile.title}{profile.first_name} {profile.last_name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">อายุ</div>
                <div className="font-medium">
                  {profile.date_of_birth ? `${calcAge(profile.date_of_birth)} ปี` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">วันเกิด</div>
                <div className="font-medium text-sm">
                  {profile.date_of_birth
                    ? new Date(profile.date_of_birth).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">กรุ๊ปเลือด</div>
                <div className="font-medium">{profile.blood_type || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">เบอร์โทร</div>
                <div className="font-medium">{profile.phone || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">เพศ</div>
                <div className="font-medium">
                  {profile.gender === 'male' ? 'ชาย' : profile.gender === 'female' ? 'หญิง' : profile.gender === 'other' ? 'อื่นๆ' : '—'}
                </div>
              </div>
              {profile.allergies && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">แพ้ยา/อาหาร</div>
                  <div className="font-medium text-red-600 dark:text-red-400">{profile.allergies}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">ยังไม่มีข้อมูล</p>
              <a href="/account/profile"
                className="inline-block text-sm bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700"
              >
                กรอกข้อมูล
              </a>
            </div>
          )}
        </div>
      </section>

      {/* นัดหมายที่กำลังจะมา */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">นัดหมายที่กำลังจะมา</h2>
          <div className="space-y-2">
            {upcoming.map(a => {
              const dt = new Date(a.scheduled_at)
              const s = STATUS_LABEL[a.status] || STATUS_LABEL.pending
              return (
                <div key={a.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-medium text-sm">{a.hw_doctors?.full_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{a.hw_doctors?.specialty}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} · {dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${s.color}`}>{s.label}</span>
                  </div>
                  <a href={`/consult/${a.id}`}
                    className="block w-full text-center bg-blue-600 text-white py-2 rounded-xl text-sm hover:bg-blue-700 font-medium"
                  >
                    เข้าห้องปรึกษา
                  </a>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ประวัติการรักษา */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">ประวัติการรักษา</h2>
        {history.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">ยังไม่มีประวัติการรักษา</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(a => {
              const dt = new Date(a.scheduled_at)
              const s = STATUS_LABEL[a.status] || STATUS_LABEL.completed
              return (
                <div key={a.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{a.hw_doctors?.full_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{a.hw_doctors?.specialty}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {a.symptoms && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{a.symptoms}</div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${s.color}`}>{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
