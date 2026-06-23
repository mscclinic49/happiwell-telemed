'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DailyIframe, { DailyCall } from '@daily-co/daily-js'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type Role = 'patient' | 'doctor' | null

export default function ConsultPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const appointmentId = params.appointmentId as string

  const callRef = useRef<DailyCall | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [role, setRole] = useState<Role>(null)
  const [status, setStatus] = useState<'loading' | 'consent' | 'doctor-verify' | 'joining' | 'in-call' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [identityConfirmed, setIdentityConfirmed] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return

    async function detectRole() {
      // ตรวจว่า user นี้เป็น doctor ของ appointment นี้หรือเปล่า
      const { data: appt } = await supabase
        .from('hw_appointments')
        .select('user_id, hw_doctors!inner(user_id)')
        .eq('id', appointmentId)
        .single()

      if (!appt) {
        setError('ไม่พบข้อมูลการนัดหมาย')
        setStatus('error')
        return
      }

      const doctorUserId = (appt.hw_doctors as unknown as { user_id: string | null })?.user_id
      const detectedRole: Role = doctorUserId === user!.id ? 'doctor' : 'patient'
      setRole(detectedRole)
      setStatus(detectedRole === 'doctor' ? 'doctor-verify' : 'consent')
    }

    detectRole()
  }, [user, authLoading, appointmentId])

  async function cleanupCall() {
    if (callRef.current) {
      try { await callRef.current.destroy() } catch { /* ignore */ }
      callRef.current = null
    }
  }

  async function createAndJoinRoom() {
    await cleanupCall()
    setStatus('joining')
    setError(null)

    try {
      const res = await fetch('/api/video/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create room')

      setRoomUrl(data.roomUrl)
      await new Promise(r => setTimeout(r, 200))

      if (!containerRef.current) throw new Error('Container not ready')

      const callFrame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: { width: '100%', height: '100%', border: '0' },
        showLeaveButton: true,
      })
      callRef.current = callFrame

      callFrame.on('left-meeting', async () => { await cleanupCall(); setStatus(role === 'doctor' ? 'doctor-verify' : 'consent') })
      callFrame.on('joined-meeting', () => setStatus('in-call'))
      callFrame.on('error', (e) => {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (e?.errorMsg || 'unknown'))
        setStatus('error')
      })

      await callFrame.join({ url: data.roomUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
      await cleanupCall()
    }
  }

  async function handleDoctorVerify() {
    if (!identityConfirmed) return
    setVerifying(true)
    const res = await fetch('/api/consultation/verify-identity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'เกิดข้อผิดพลาด')
      setStatus('error')
      return
    }
    setVerifying(false)
    await createAndJoinRoom()
  }

  async function handleCancelUnverified() {
    if (!confirm('ยืนยันการยกเลิก? การนัดหมายจะถูกยกเลิกทันที')) return
    setCancelling(true)
    await fetch('/api/consultation/cancel-unverified', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId }),
    })
    router.push('/')
  }

  useEffect(() => () => { cleanupCall() }, [])

  if (authLoading || status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">กำลังโหลด...</div>
  }

  return (
    <main className="min-h-screen">
      {/* Video frame — hidden until in-call */}
      <div
        ref={containerRef}
        className="w-full h-screen bg-black"
        style={{ display: status === 'in-call' || status === 'joining' ? 'block' : 'none' }}
      />

      {/* Patient consent screen */}
      {status === 'consent' && (
        <div className="p-6 max-w-md mx-auto">
          <a href="/" className="text-blue-600 dark:text-blue-400 mb-4 inline-block">← กลับ</a>
          <h1 className="text-2xl font-bold mb-4">เตรียมเข้าห้องปรึกษา</h1>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mb-4">
            <h2 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">⚠️ การยินยอมบันทึกวิดีโอ</h2>
            <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1 list-disc list-inside">
              <li>การปรึกษานี้อาจถูกบันทึกเพื่อเก็บเป็นเวชระเบียน</li>
              <li>ข้อมูลจะถูกเก็บรักษาตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)</li>
            </ul>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-6">
            <h2 className="font-semibold mb-2">ก่อนเข้าห้อง โปรดตรวจสอบ:</h2>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>✓ กล้องและไมโครโฟนทำงานปกติ</li>
              <li>✓ อินเทอร์เน็ตเสถียร</li>
              <li>✓ อยู่ในที่เงียบและเป็นส่วนตัว</li>
            </ul>
          </div>

          <button
            onClick={createAndJoinRoom}
            className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700"
          >
            ยินยอมและเข้าห้องปรึกษา
          </button>
        </div>
      )}

      {/* Doctor identity verification screen */}
      {status === 'doctor-verify' && (
        <div className="p-6 max-w-md mx-auto">
          <a href="/" className="text-blue-600 dark:text-blue-400 mb-4 inline-block">← กลับ</a>
          <h1 className="text-2xl font-bold mb-1">ยืนยันตัวตนคนไข้</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            ก่อนเริ่มการปรึกษา กรุณายืนยันว่าได้ตรวจสอบตัวตนคนไข้แล้ว
          </p>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={identityConfirmed}
                onChange={e => setIdentityConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-blue-600 flex-shrink-0"
              />
              <span className="text-sm">
                ข้าพเจ้าได้ตรวจสอบยืนยันตัวตนคนไข้แล้ว โดยข้อมูลตรงกับที่ลงทะเบียนไว้ในระบบ
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDoctorVerify}
              disabled={!identityConfirmed || verifying}
              className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              {verifying ? 'กำลังยืนยัน...' : 'ยืนยันและเริ่มการปรึกษา'}
            </button>
            <button
              onClick={handleCancelUnverified}
              disabled={cancelling}
              className="w-full border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 py-3 rounded-full font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
            >
              {cancelling ? 'กำลังยกเลิก...' : 'ไม่สามารถยืนยันตัวตนได้ — ยกเลิกการปรึกษา'}
            </button>
          </div>
        </div>
      )}

      {/* Joining overlay */}
      {status === 'joining' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-white mb-4">กำลังเข้าห้องปรึกษา...</p>
          {roomUrl && (
            <a href={roomUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline text-sm">
              เปิดในแท็บใหม่ (ถ้าค้างนาน)
            </a>
          )}
        </div>
      )}

      {/* Error screen */}
      {status === 'error' && (
        <div className="p-6 max-w-md mx-auto">
          <a href="/" className="text-blue-600 dark:text-blue-400 mb-4 inline-block">← กลับ</a>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-4">
            <h2 className="font-semibold text-red-900 dark:text-red-300 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
          <button
            onClick={() => { setStatus(role === 'doctor' ? 'doctor-verify' : 'consent'); setError(null) }}
            className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}
    </main>
  )
}
