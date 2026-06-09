'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import DailyIframe, { DailyCall } from '@daily-co/daily-js'

export default function ConsultPage() {
  const params = useParams()
  const appointmentId = params.appointmentId as string

  const callRef = useRef<DailyCall | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [status, setStatus] = useState<'loading' | 'consent' | 'joining' | 'in-call' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [roomUrl, setRoomUrl] = useState<string | null>(null)

  useEffect(() => {
    setStatus('consent')
  }, [])

  async function createAndJoinRoom() {
    setStatus('joining')
    setError(null)

    try {
      const res = await fetch('/api/video/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room')
      }

      setRoomUrl(data.roomUrl)

      if (!containerRef.current) {
        throw new Error('Container not ready')
      }

      const callFrame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '12px',
        },
        showLeaveButton: true,
      })

      callRef.current = callFrame

      callFrame.on('left-meeting', () => {
        setStatus('consent')
      })

      await callFrame.join({ url: data.roomUrl })
      setStatus('in-call')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      setStatus('error')
    }
  }

  useEffect(() => {
    return () => {
      if (callRef.current) {
        callRef.current.destroy()
        callRef.current = null
      }
    }
  }, [])

  if (status === 'loading') {
    return <p className="p-8">กำลังโหลด...</p>
  }

  if (status === 'consent') {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto">
        <a href="/" className="text-teal-600 mb-4 inline-block">← กลับ</a>
        <h1 className="text-2xl font-bold mb-4">เตรียมเข้าห้องปรึกษา</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-yellow-900 mb-2">⚠️ การยินยอมบันทึกวิดีโอ</h2>
          <ul className="text-sm text-yellow-800 space-y-2 list-disc list-inside">
            <li>การปรึกษานี้จะถูกบันทึกเป็นวิดีโอเพื่อเก็บเป็นเวชระเบียน</li>
            <li>ข้อมูลจะถูกเข้ารหัสและเก็บรักษาเป็นความลับตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)</li>
            <li>คุณสามารถขอลบบันทึกได้ในภายหลังตามสิทธิ์ PDPA</li>
            <li>วิดีโอจะถูกเก็บไว้ 5 ปีตามกฎหมายเวชระเบียน</li>
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-2">ก่อนเข้าห้อง โปรดตรวจสอบ:</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>✓ กล้องและไมโครโฟนทำงานปกติ</li>
            <li>✓ อินเทอร์เน็ตเสถียร</li>
            <li>✓ อยู่ในที่เงียบและเป็นส่วนตัว</li>
            <li>✓ มียาประจำตัว/ผลตรวจล่าสุดอยู่ใกล้มือ (ถ้ามี)</li>
          </ul>
        </div>

        <button
          onClick={createAndJoinRoom}
          className="w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700"
        >
          ยินยอมและเข้าห้องปรึกษา
        </button>
      </main>
    )
  }

  if (status === 'joining') {
    return (
      <main className="min-h-screen p-8 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-600">กำลังเข้าห้องปรึกษา...</p>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto">
        <a href="/" className="text-teal-600 mb-4 inline-block">← กลับ</a>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="font-semibold text-red-900 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      <div ref={containerRef} className="w-full h-screen" />
    </main>
  )
}