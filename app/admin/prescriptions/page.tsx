'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconUpload, IconPill, IconUser, IconCalendar, IconCheck,
  IconStethoscope, IconAlertCircle,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Appointment = {
  id: string
  scheduled_at: string
  status: string
  user_id: string
  hw_users: { full_name: string } | null
  hw_doctors: { full_name: string } | null
  hw_prescriptions: { id: string }[]
}

function UploadPanel({
  appt,
  onSuccess,
}: {
  appt: Appointment
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!file || !user) return
    setUploading(true)
    setError(null)

    try {
      const ext = file.name.split('.').pop() ?? 'pdf'
      const path = `${appt.user_id}/${appt.id}_${Date.now()}.${ext}`

      const { data: sd, error: se } = await supabase.storage
        .from('prescriptions')
        .upload(path, file, { contentType: file.type })
      if (se) throw new Error(se.message)

      const { data: ad } = await supabase
        .from('hw_appointments')
        .select('doctor_id')
        .eq('id', appt.id)
        .single()

      const { error: de } = await supabase
        .from('hw_prescriptions')
        .insert({
          appointment_id: appt.id,
          user_id: appt.user_id,
          doctor_id: ad?.doctor_id ?? null,
          storage_path: sd.path,
          notes: notes.trim() || null,
          valid_until: validUntil || null,
          uploaded_by: user.id,
        })
      if (de) throw new Error(de.message)

      setDone(true)
      setTimeout(onSuccess, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#1a8a6e] bg-[#e8f7f3] px-3 py-2 rounded-lg">
        <IconCheck size={13} />
        {'อัพโหลดใบสั่งยาสำเร็จ'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileRef.current?.click()}
        className={`flex items-center gap-3 p-3 rounded-[10px] border-2 border-dashed cursor-pointer transition-colors ${
          file ? 'border-[#1a8a6e] bg-[#e8f7f3]' : 'border-[var(--border)] hover:border-[#1a8a6e]'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <IconUpload size={16} className={file ? 'text-[#1a8a6e]' : 'text-[var(--muted)]'} />
        <span className={`text-xs truncate ${file ? 'text-[#1a8a6e] font-medium' : 'text-[var(--muted)]'}`}>
          {file ? file.name : 'คลิกเพื่อเลือกไฟล์ใบสั่งยา (PDF / รูปภาพ)'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="รายการยา / หมายเหตุ"
          className="col-span-2 sm:col-span-1 px-3 py-2 rounded-[8px] border border-[var(--border)] bg-[var(--card-bg)] text-xs focus:outline-none focus:border-[#1a8a6e]"
        />
        <input
          type="date"
          value={validUntil}
          onChange={e => setValidUntil(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="col-span-2 sm:col-span-1 px-3 py-2 rounded-[8px] border border-[var(--border)] bg-[var(--card-bg)] text-xs focus:outline-none focus:border-[#1a8a6e]"
          title="วันหมดอายุของใบสั่งยา"
        />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <IconAlertCircle size={13} />
          {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full py-2 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ background: '#1a8a6e' }}
      >
        {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลดใบสั่งยา'}
      </button>
    </div>
  )
}

export default function AdminPrescriptionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('hw_users')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const admin = data?.role === 'admin'
        setIsAdmin(admin)
        if (!admin) router.push('/')
      })
  }, [user])

  function loadAppointments() {
    supabase
      .from('hw_appointments')
      .select(`
        id, scheduled_at, status, user_id,
        hw_users(full_name),
        hw_doctors(full_name),
        hw_prescriptions(id)
      `)
      .order('scheduled_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setAppointments((data as unknown as Appointment[]) || [])
        setLoading(false)
      })
  }

  useEffect(() => {
    if (isAdmin) loadAppointments()
  }, [isAdmin])

  if (isAdmin === null || (isAdmin && loading)) {
    return <div className="max-w-3xl mx-auto px-5 py-10 text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>
  }

  if (!isAdmin) return null

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <IconPill size={22} className="text-[#1a8a6e]" />
        <h1 className="text-xl font-bold">{'อัพโหลดใบสั่งยา'}</h1>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold text-white flex-shrink-0"
          style={{ background: '#ef9f27' }}
        >
          Admin
        </span>
      </div>

      {!loading && appointments.length === 0 && (
        <div className="text-center py-16 text-[var(--muted)]">
          <IconCalendar size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{'ยังไม่มีนัดหมาย'}</p>
        </div>
      )}

      <div className="space-y-4">
        {appointments.map(appt => {
          const hasPrescription = appt.hw_prescriptions.length > 0
          return (
            <div
              key={appt.id}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden"
            >
              {/* Appointment info row */}
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <IconUser size={14} className="text-[#1a8a6e] flex-shrink-0" />
                    <span className="truncate">{appt.hw_users?.full_name ?? appt.user_id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <IconStethoscope size={12} className="flex-shrink-0" />
                    <span className="truncate">{appt.hw_doctors?.full_name ?? '-'}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <IconCalendar size={11} />
                      {new Date(appt.scheduled_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      appt.status === 'completed' ? 'bg-[#e8f7f3] text-[#1a8a6e]'
                      : appt.status === 'pending'   ? 'bg-[#faeeda] text-[#c47f00]'
                      : 'bg-[var(--border)] text-[var(--muted)]'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>

                {hasPrescription && (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#1a8a6e] bg-[#e8f7f3] px-2.5 py-1 rounded-full flex-shrink-0">
                    <IconCheck size={12} />
                    {'มีใบสั่งยาแล้ว'}
                  </span>
                )}
              </div>

              {/* Upload panel — only if no prescription yet */}
              {!hasPrescription && (
                <div className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-3">
                  <UploadPanel
                    appt={appt}
                    onSuccess={() =>
                      setAppointments(prev =>
                        prev.map(a =>
                          a.id === appt.id ? { ...a, hw_prescriptions: [{ id: 'new' }] } : a
                        )
                      )
                    }
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
