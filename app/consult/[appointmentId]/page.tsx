'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import DailyIframe, { DailyCall } from '@daily-co/daily-js'

export default function ConsultPage() {
  const params = useParams()
  const appointmentId = params.appointmentId as string

  const callRef = useRef<DailyCall | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [status, setStatus] = useState<'consent' | 'joining' | 'in-call' | 'error'>('consent')
  const [error, setError] = useState<string | null>(null)

  async function cleanupCall() {
    if (callRef.current) {
      try {
        await callRef.current.destroy()
      } catch (e) {
        console.error('Destroy error:', e)
      }
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room')
      }

      await new Promise((resolve) => setTimeout(resolve, 100))

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

      callFrame.on('left-meeting', async () => {
        await cleanupCall()
        setStatus('consent')
      })

      await callFrame.join({ url: data.roomUrl })
      setStatus('in-call')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      setStatus('error')
      await cleanupCall()
    }
  }

  async function handleRetry() {
    await cleanupCall()
    setStatus('consent')
    setError(null)
  }

  useEffect(() => {
    return () => {
      cleanupCall()
    }
  }, [])

  return (
    <main className="min-h-screen">
      <div
        ref={containerRef}
        className="w-full h-screen bg-black"
        style={{ display: status === 'in-call' || status === 'joining' ? 'block' : 'none' }}
      />

      {status === 'consent' && (
        <div className="p-6 max-w-md mx-auto">
          <a href="/" className="text-teal-600 mb-4 inline-block">← กลับ</a>
          <h1 className="text-2xl font-bold mb-4">เตรียมเข้าห้องปรึกษา</h1>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-yellow-900 mb-2">⚠️ การยินยอมบันทึกวิดีโอ</h2>
            <ul className="text-sm text-yellow-800 space-y-2 list-disc list-inside">
              <li>การปรึกษานี้อาจถูกบันทึกเพื่อเก็บเป็นเวชระเบียน</li>
              <li>ข้อมูลจะถูกเก็บรักษาเป็นความลับตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)</li>
              <li>คุณสามารถขอลบบันทึกได้ในภายหลังตามสิทธิ์ PDPA</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-2">ก่อนเข้าห้อง โปรดตรวจสอบ:</h2>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ กล้องและไมโครโฟนทำงานปกติ</li>
              <li>✓ อินเทอร์เน็ตเสถียร</li>
              <li>✓ อยู่ในที่เงียบและเป็นส่วนตัว</li>
            </ul>
          </div>

          <button
            onClick={createAndJoinRoom}
            className="w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700"
          >
            ยินยอมและเข้าห้องปรึกษา
          </button>
        </div>
      )}

      {status === 'joining' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-white">กำลังเข้าห้องปรึกษา...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="p-6 max-w-md mx-auto">
          <a href="/" className="text-teal-600 mb-4 inline-block">← กลับ</a>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="font-semibold text-red-900 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="w-full bg-teal-600 text-white py-3 rounded-full font-medium"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}
    </main>
  )
}