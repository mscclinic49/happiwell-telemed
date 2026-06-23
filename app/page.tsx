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
  const { user, loading: authLoading, signOut } = useAuth()
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
    return <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">กำลังโหลด...</div>
  }

  const displayName = profile
    ? `${profile.title || ''}${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.email
    : user?.email

  const upcoming = appointments.filter(a => new Date(a.scheduled_at) >= new Date() && a.status !== 'cancelled')
  const history  = appointments.filter(a => new Date(a.scheduled_at) < new Date() || a.status === 'completed')

  return (
    <main className="min-h-screen max-w-xl mx-auto p-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">สวัสดี</p>
          <h1 className="text-xl font-bold">{displayName}</h1>
        </div>
        <div className="flex gap-2">
          <a href="/account/profile"
            className="p-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm"
          >
            ✏️ โปรไฟล์
          </a>
          <a href="/account/settings"
            className="p-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm"
          >
            ⚙️
          </a>
        </div>
      </div>

      {/* สถานพยาบาล */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">สถานพยาบาล</h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">HW</div>
            <div>
              <div className="font-semibold">HappiWell Telemedicine</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">บริการปรึกษาแพทย์ออนไลน์</div>
              <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div>📋 ใบอนุญาตประกอบกิจการสถานพยาบาล: HW-2566-001</div>
                <div>📞 02-xxx-xxxx · Line: @happiwell</div>
                <div>🕐 จ–ศ 08:00–20:00 · ส–อา 09:00–17:00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ข้อมูลคนไข้ */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ข้อมูลคนไข้</h2>
          <a href="/account/profile" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">แก้ไข</a>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          {profile ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">ชื่อ-นามสกุล</div>
                <div className="font-medium">
                  {profile.title}{profile.first_name} {profile.last_name}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">อายุ</div>
                <div className="font-medium">
                  {profile.date_of_birth ? `${calcAge(profile.date_of_birth)} ปี` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">วันเกิด</div>
                <div className="font-medium">
                  {profile.date_of_birth
                    ? new Date(profile.date_of_birth).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">กรุ๊ปเลือด</div>
                <div className="font-medium">{profile.blood_type || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">เบอร์โทร</div>
                <div className="font-medium">{profile.phone || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">เพศ</div>
                <div className="font-medium">
                  {profile.gender === 'male' ? 'ชาย' : profile.gender === 'female' ? 'หญิง' : profile.gender === 'other' ? 'อื่นๆ' : '—'}
                </div>
              </div>
              {profile.allergies && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">แพ้ยา/อาหาร</div>
                  <div className="font-medium text-red-600 dark:text-red-400">{profile.allergies}</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ยังไม่มีข้อมูล —{' '}
              <a href="/account/profile" className="text-teal-600 dark:text-teal-400 hover:underline">กรอกข้อมูล</a>
            </p>
          )}
        </div>
      </section>

      {/* นัดหมายที่กำลังจะมา */}
      {upcoming.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">นัดหมายที่กำลังจะมา</h2>
          <div className="space-y-2">
            {upcoming.map(a => {
              const dt = new Date(a.scheduled_at)
              const s = STATUS_LABEL[a.status] || STATUS_LABEL.pending
              return (
                <div key={a.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{a.hw_doctors?.full_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{a.hw_doctors?.specialty}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} เวลา {dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${s.color}`}>{s.label}</span>
                  </div>
                  <a href={`/consult/${a.id}`}
                    className="mt-3 block w-full text-center bg-teal-600 text-white py-2 rounded-full text-sm hover:bg-teal-700"
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
      <section className="mb-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">ประวัติการรักษา</h2>
        {history.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">ยังไม่มีประวัติการรักษา</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(a => {
              const dt = new Date(a.scheduled_at)
              const s = STATUS_LABEL[a.status] || STATUS_LABEL.completed
              return (
                <div key={a.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{a.hw_doctors?.full_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{a.hw_doctors?.specialty}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {a.symptoms && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">{a.symptoms}</div>
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

      {/* Quick action */}
      <div className="fixed bottom-5 left-0 right-0 flex justify-center px-5">
        <a href="/doctors"
          className="bg-teal-600 text-white px-8 py-3 rounded-full font-medium hover:bg-teal-700 shadow-lg text-center w-full max-w-xl"
        >
          + จองนัดหมายใหม่
        </a>
      </div>
    </main>
  )
}
