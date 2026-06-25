'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconPill, IconUpload, IconEye, IconEdit, IconUser,
  IconCalendarClock, IconAlertCircle, IconStethoscope,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Appt = {
  id: string
  scheduled_at: string
  status: string
  user_id: string
  hw_users: { full_name: string | null } | null
  hw_doctors: { full_name: string | null } | null
  hw_prescriptions: { id: string; storage_path: string }[]
  hw_rx: { id: string }[]
}

function PrescriptionButtons({ appt, onUploaded }: { appt: Appt; onUploaded: () => void }) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasFile = appt.hw_prescriptions.length > 0
  const hasRx   = appt.hw_rx.length > 0
  const hasAny  = hasFile || hasRx

  async function handleView() {
    if (hasRx) {
      window.open(`/rx/${appt.hw_rx[0].id}/print`, '_blank')
      return
    }
    if (hasFile) {
      setViewing(true)
      const { data } = await sb.storage
        .from('prescriptions')
        .createSignedUrl(appt.hw_prescriptions[0].storage_path, 3600)
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
      setViewing(false)
    }
  }

  async function handleFile(file: File) {
    if (!user) return
    setUploading(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() ?? 'pdf'
      const path = `${appt.user_id}/${appt.id}_${Date.now()}.${ext}`
      const { data: sd, error: se } = await sb.storage
        .from('prescriptions').upload(path, file, { contentType: file.type })
      if (se) throw new Error(se.message)
      const { data: ad } = await sb.from('hw_appointments').select('doctor_id').eq('id', appt.id).single()
      const { error: ie } = await sb.from('hw_prescriptions').insert({
        appointment_id: appt.id, user_id: appt.user_id,
        doctor_id: ad?.doctor_id ?? null, storage_path: sd.path, uploaded_by: user.id,
      })
      if (ie) throw new Error(ie.message)
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />

      <div className="flex items-center gap-1.5">
        {/* ดูใบสั่งยา */}
        <button
          onClick={handleView}
          disabled={!hasAny || viewing}
          title={!hasAny ? 'ยังไม่มีใบสั่งยา' : 'ดูใบสั่งยา'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap
            disabled:opacity-40 disabled:cursor-not-allowed
            enabled:border-[var(--hw-green)] enabled:text-[var(--hw-green)] enabled:hover:bg-[var(--hw-mint-bg)]
            border-[var(--border)] text-[var(--muted)]">
          <IconEye size={12} />{'ดูใบสั่งยา'}
        </button>

        {/* แก้ไขใบสั่งยา */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!hasAny || uploading}
          title={!hasAny ? 'ยังไม่มีใบสั่งยา' : 'อัพโหลดใบสั่งยาใหม่'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap
            disabled:opacity-40 disabled:cursor-not-allowed
            enabled:border-[var(--border)] enabled:text-[var(--muted)] enabled:hover:border-[#1a8a6e]/40 enabled:hover:text-[var(--foreground)]">
          <IconEdit size={12} />{'แก้ไขใบสั่งยา'}
        </button>

        {/* อัพโหลด */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-[#1a8a6e] hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap">
          {uploading
            ? <span className="w-3 h-3 border border-white/60 border-t-white rounded-full animate-spin" />
            : <IconUpload size={12} />}
          {uploading ? 'กำลังอัพโหลด...' : hasFile ? 'อัพโหลดใหม่' : 'อัพโหลด'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1 text-[10px] text-red-400">
          <IconAlertCircle size={11} />{error}
        </div>
      )}
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก',
}
const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-yellow-500/15 text-yellow-500',
  confirmed: 'bg-blue-400/15 text-blue-400',
  completed: 'bg-emerald-500/15 text-emerald-500',
  cancelled: 'bg-red-500/15 text-red-400',
}

export default function AdminPrescriptionsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [appts, setAppts] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    sb.from('hw_users').select('role').eq('id', user.id).single()
      .then(({ data }) => {
        const ok = data?.role === 'admin' || data?.role === 'superadmin'
        setIsAdmin(ok)
        if (!ok) router.push('/')
      })
  }, [user, router])

  const load = useCallback(() => {
    sb.from('hw_appointments')
      .select('id, scheduled_at, status, user_id, hw_users(full_name), hw_doctors(full_name), hw_prescriptions(id, storage_path), hw_rx(id)')
      .neq('status', 'cancelled')
      .order('scheduled_at', { ascending: false })
      .limit(80)
      .then(({ data }) => {
        setAppts((data as unknown as Appt[]) ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])

  const onUploaded = (apptId: string) =>
    setAppts(prev => prev.map(a =>
      a.id === apptId ? { ...a, hw_prescriptions: [{ id: 'new', storage_path: '' }] } : a
    ))

  if (isAdmin === null || (isAdmin && loading)) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-10 space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />)}
      </div>
    )
  }
  if (!isAdmin) return null

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 pb-8">
      <div className="flex items-center gap-2 mb-5">
        <IconPill size={20} className="text-[#1a8a6e]" />
        <h1 className="text-lg font-bold">{'ใบสั่งยา'}</h1>
      </div>

      {appts.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <IconPill size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{'ยังไม่มีนัดหมาย'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {appts.map(a => {
            const dt = new Date(a.scheduled_at)
            return (
              <div key={a.id}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1a8a6e]/10 flex items-center justify-center flex-shrink-0">
                  <IconUser size={16} className="text-[#1a8a6e]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate text-[var(--foreground)]">
                    {a.hw_users?.full_name ?? '—'}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {a.hw_doctors?.full_name && (
                      <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                        <IconStethoscope size={11} />{a.hw_doctors.full_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <IconCalendarClock size={11} />
                      {dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                      {' · '}
                      {dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status] ?? ''}`}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </div>
                </div>

                <PrescriptionButtons appt={a} onUploaded={() => onUploaded(a.id)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
