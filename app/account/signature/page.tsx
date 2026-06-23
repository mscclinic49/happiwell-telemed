'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { IconSignature, IconTrash, IconCheck, IconAlertCircle, IconDownload } from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

export default function SignaturePage() {
  const { user } = useAuth()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingUrl, setExistingUrl] = useState<string | null>(null)
  const [existingPath, setExistingPath] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('hw_users').select('signature_storage_path').eq('id', user.id).single()
      .then(async ({ data }) => {
        if (data?.signature_storage_path) {
          setExistingPath(data.signature_storage_path)
          const { data: urlData } = await supabase.storage.from('signatures').createSignedUrl(data.signature_storage_path, 3600)
          if (urlData?.signedUrl) setExistingUrl(urlData.signedUrl)
        }
      })
  }, [user])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current; if (!canvas) return
    setIsDrawing(true)
    setLastPos(getPos(e, canvas))
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing || !lastPos) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.beginPath()
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setLastPos(pos)
    setIsEmpty(false)
  }

  function stopDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setIsDrawing(false)
    setLastPos(null)
  }

  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  async function saveSignature() {
    const canvas = canvasRef.current; if (!canvas || isEmpty) return
    setSaving(true); setError(null)

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
    if (!blob) { setError('ไม่สามารถบันทึกได้'); setSaving(false); return }

    const path = `${user!.id}/signature.png`
    const { data: sd, error: se } = await supabase.storage.from('signatures')
      .upload(path, blob, { contentType: 'image/png', upsert: true })
    if (se) { setError(se.message); setSaving(false); return }

    const { error: de } = await supabase.from('hw_users')
      .update({ signature_storage_path: sd.path }).eq('id', user!.id)
    if (de) { setError(de.message); setSaving(false); return }

    const { data: urlData } = await supabase.storage.from('signatures').createSignedUrl(sd.path, 3600)
    setExistingUrl(urlData?.signedUrl ?? null)
    setExistingPath(sd.path)
    setSuccess(true)
    clearCanvas()
    setTimeout(() => setSuccess(false), 3000)
    setSaving(false)
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <IconSignature size={22} className="text-[#1a8a6e]" />
        <h1 className="text-xl font-bold">{'ลายเซ็นดิจิทัล'}</h1>
      </div>

      {existingUrl && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 mb-6">
          <div className="text-sm font-medium mb-3">{'ลายเซ็นปัจจุบัน'}</div>
          <div className="bg-white rounded-[10px] border border-[var(--border)] p-4 flex items-center justify-center min-h-[80px]">
            <img src={existingUrl} alt="ลายเซ็น" className="max-h-20 object-contain" />
          </div>
          <a href={existingUrl} download="signature.png" className="mt-3 flex items-center gap-1.5 text-xs text-[#1a8a6e] hover:underline">
            <IconDownload size={13} />{'ดาวน์โหลดลายเซ็น'}
          </a>
        </div>
      )}

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-sm font-medium">{existingUrl ? 'วาดลายเซ็นใหม่' : 'วาดลายเซ็นของคุณ'}</span>
          <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-red-500 transition-colors">
            <IconTrash size={13} />{'ล้าง'}
          </button>
        </div>

        <div className="p-4">
          <div className="relative rounded-[10px] overflow-hidden border-2 border-dashed border-[var(--border)] bg-white" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full block cursor-crosshair"
              style={{ touchAction: 'none' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm text-gray-300 select-none">{'เซ็นชื่อที่นี่...'}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-sm">
              <IconAlertCircle size={15} />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-[#e8f7f3] border border-[#1a8a6e] rounded-[10px] text-[#1a8a6e] text-sm">
              <IconCheck size={15} />{'บันทึกลายเซ็นสำเร็จ'}
            </div>
          )}

          <button
            onClick={saveSignature}
            disabled={saving || isEmpty}
            className="mt-4 w-full py-3 rounded-full font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
            style={{ background: 'var(--hw-green)' }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกลายเซ็น'}
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-center text-[var(--muted)]">
        {'ลายเซ็นดิจิทัลใช้สำหรับยืนยันเอกสารทางการแพทย์'}
      </p>
    </div>
  )
}

