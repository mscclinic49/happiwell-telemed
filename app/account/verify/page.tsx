'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconId, IconUpload, IconCheck, IconClock, IconX, IconAlertCircle,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type KycRecord = {
  id: string
  id_type: string
  id_number: string
  status: 'pending' | 'verified' | 'rejected'
  rejection_reason: string | null
  submitted_at: string
}

export default function VerifyPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [kyc, setKyc] = useState<KycRecord | null | undefined>(undefined)
  const [idType, setIdType] = useState<'national_id' | 'passport'>('national_id')
  const [idNumber, setIdNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('hw_identity_verifications')
      .select('id, id_type, id_number, status, rejection_reason, submitted_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setKyc(data))
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !user) return
    setSubmitting(true)
    setError(null)

    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('identity-docs')
        .upload(path, file, { contentType: file.type })

      if (storageErr) throw new Error(storageErr.message)

      const { error: dbErr } = await supabase
        .from('hw_identity_verifications')
        .insert({
          user_id: user.id,
          id_type: idType,
          id_number: idNumber.trim(),
          storage_path: storageData.path,
        })

      if (dbErr) throw new Error(dbErr.message)

      setKyc({
        id: '',
        id_type: idType,
        id_number: idNumber.trim(),
        status: 'pending',
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  if (kyc === undefined) {
    return <div className="max-w-lg mx-auto px-5 py-10 text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>
  }

  if (kyc !== null) {
    const cfg = {
      pending:  { color: '#c47f00', bg: '#faeeda', Icon: IconClock, label: 'รอตรวจสอบ' },
      verified: { color: '#1a8a6e', bg: '#e8f7f3', Icon: IconCheck, label: 'ยืนยันแล้ว' },
      rejected: { color: '#dc2626', bg: '#fee2e2', Icon: IconX,     label: 'ไม่ผ่านการตรวจสอบ' },
    }[kyc.status]

    return (
      <div className="max-w-lg mx-auto px-5 py-8">
        <div className="flex items-center gap-3 mb-6">
          <IconId size={22} className="text-[#1a8a6e]" />
          <h1 className="text-xl font-bold">{'การยืนยันตัวตน'}</h1>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: cfg.bg }}>
              <cfg.Icon size={20} style={{ color: cfg.color }} />
            </div>
            <div>
              <div className="font-semibold text-sm">{cfg.label}</div>
              <div className="text-xs text-[var(--muted)]">
                {'ส่งเมื่อ '}{new Date(kyc.submitted_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="text-[var(--muted)] w-28 flex-shrink-0">{'ประเภทเอกสาร'}</span>
              <span className="font-medium">{kyc.id_type === 'national_id' ? 'บัตรประชาชน' : 'พาสปอร์ต'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[var(--muted)] w-28 flex-shrink-0">{'เลขที่'}</span>
              <span className="font-medium font-mono">
                {kyc.id_number.replace(/(.{4})/g, '$1 ').trim()}
              </span>
            </div>
          </div>

          {kyc.rejection_reason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-xs">
              <div className="font-semibold mb-1">{'เหตุผลที่ไม่ผ่าน:'}</div>
              {kyc.rejection_reason}
            </div>
          )}
        </div>

        {kyc.status === 'pending' && (
          <p className="mt-4 text-xs text-center text-[var(--muted)]">
            {'ทีมงานจะตรวจสอบข้อมูลภายใน 1–2 วันทำการ'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-1">
        <IconId size={22} className="text-[#1a8a6e]" />
        <h1 className="text-xl font-bold">{'การยืนยันตัวตน'}</h1>
      </div>
      <p className="text-sm text-[var(--muted)] mb-6 pl-1">{'ยืนยันตัวตนเพื่อใช้บริการเต็มรูปแบบ'}</p>

      <div className="bg-[#e8f7f3] rounded-[14px] p-4 mb-6 space-y-2.5">
        {[
          'กรอกเลขบัตรประชาชน หรือ เลขพาสปอร์ต',
          'อัพโหลดรูปบัตรประชาชน หรือ รูปพาสปอร์ต ให้ตรงกับข้อมูลที่กรอก',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm">
            <span className="w-5 h-5 rounded-full bg-[#1a8a6e] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
              {i + 1}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">{'ประเภทเอกสาร'}</label>
          <div className="flex gap-3">
            {[
              { value: 'national_id', label: 'บัตรประชาชน' },
              { value: 'passport',    label: 'พาสปอร์ต' },
            ].map(({ value, label }) => (
              <label
                key={value}
                className={`flex-1 flex items-center justify-center p-3 rounded-[10px] border-2 cursor-pointer text-sm font-medium transition-colors ${
                  idType === value
                    ? 'border-[#1a8a6e] bg-[#e8f7f3] text-[#1a8a6e]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[#1a8a6e]'
                }`}
              >
                <input
                  type="radio"
                  className="hidden"
                  value={value}
                  checked={idType === value as 'national_id' | 'passport'}
                  onChange={() => setIdType(value as 'national_id' | 'passport')}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {idType === 'national_id' ? 'เลขบัตรประชาชน 13 หลัก' : 'เลขพาสปอร์ต'}
          </label>
          <input
            type="text"
            required
            value={idNumber}
            onChange={e => {
              const v = e.target.value
              setIdNumber(idType === 'national_id' ? v.replace(/\D/g, '').slice(0, 13) : v.slice(0, 20))
            }}
            placeholder={idType === 'national_id' ? '1234567890123' : 'AA1234567'}
            className="w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[#1a8a6e] font-mono tracking-widest"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {idType === 'national_id' ? 'รูปบัตรประชาชน' : 'รูปพาสปอร์ต'}
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 p-8 rounded-[10px] border-2 border-dashed cursor-pointer transition-colors ${
              file
                ? 'border-[#1a8a6e] bg-[#e8f7f3]'
                : 'border-[var(--border)] hover:border-[#1a8a6e] hover:bg-[#e8f7f3]'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            <IconUpload size={28} className={file ? 'text-[#1a8a6e]' : 'text-[var(--muted)]'} />
            {file ? (
              <div className="text-center">
                <div className="text-sm font-medium text-[#1a8a6e]">{file.name}</div>
                <div className="text-xs text-[var(--muted)]">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-sm text-[var(--muted)]">{'คลิกเพื่อเลือกไฟล์'}</div>
                <div className="text-xs text-[var(--muted)]">{'JPG, PNG, PDF ขนาดไม่เกิน 5 MB'}</div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-sm">
            <IconAlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !file}
          className="w-full py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: '#1a8a6e' }}
        >
          {submitting ? 'กำลังส่ง...' : 'เริ่มต้นการยืนยันตัวตน'}
        </button>
      </form>
    </div>
  )
}
