'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconCheck, IconClock, IconX, IconAlertCircle,
  IconUpload, IconId, IconShieldCheck,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

/* ─── Types ─── */
type ProfileForm = {
  title: string; first_name: string; last_name: string
  date_of_birth: string; gender: string; blood_type: string
  weight: string; height: string; phone: string; allergies: string
}
type KycRecord = {
  id: string; id_type: string; id_number: string
  status: 'pending' | 'verified' | 'rejected'
  rejection_reason: string | null; submitted_at: string
}

/* ─── Constants ─── */
const TITLES     = ['นาย', 'นาง', 'น.ส.', 'ด.ช.', 'ด.ญ.']
const GENDERS    = [{ value: 'male', label: 'ชาย' }, { value: 'female', label: 'หญิง' }, { value: 'other', label: 'อื่นๆ' }]
const BLOOD_TYPES = ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-base focus:outline-none focus:border-[#1a8a6e]'

/* ─── KYC Section ─── */
function KycSection({ userId, sb }: { userId: string; sb: ReturnType<typeof createBrowserClient> }) {
  const [kyc, setKyc] = useState<KycRecord | null | undefined>(undefined)
  const [idType, setIdType] = useState<'national_id' | 'passport'>('national_id')
  const [idNumber, setIdNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    sb.from('hw_identity_verifications')
      .select('id, id_type, id_number, status, rejection_reason, submitted_at')
      .eq('user_id', userId)
      .maybeSingle()
      .then((result: { data: unknown }) => setKyc(result.data as KycRecord | null))
  }, [userId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setSubmitting(true); setError(null)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const { data: storageData, error: sErr } = await sb.storage
        .from('identity-docs')
        .upload(`${userId}/${Date.now()}.${ext}`, file, { contentType: file.type })
      if (sErr) throw new Error(sErr.message)

      const { error: dbErr } = await sb.from('hw_identity_verifications').insert({
        user_id: userId, id_type: idType,
        id_number: idNumber.trim(), storage_path: storageData.path,
      })
      if (dbErr) throw new Error(dbErr.message)

      setKyc({ id: '', id_type: idType, id_number: idNumber.trim(), status: 'pending', rejection_reason: null, submitted_at: new Date().toISOString() })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading
  if (kyc === undefined) {
    return <div className="h-20 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />
  }

  // Verified — read-only, no edit
  if (kyc?.status === 'verified') {
    return (
      <div className="bg-[#e8f7f3] border border-[#1a8a6e]/30 rounded-[14px] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#1a8a6e] flex items-center justify-center flex-shrink-0">
            <IconShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-[#1a8a6e]">{'ยืนยันตัวตนแล้ว'}</div>
            <div className="text-xs text-[#1a8a6e]/70">
              {'ยืนยันเมื่อ '}{new Date(kyc.submitted_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
            </div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-[#1a8a6e]/70 w-28 flex-shrink-0">{'ประเภทเอกสาร'}</span>
            <span className="font-semibold">{kyc.id_type === 'national_id' ? 'บัตรประชาชน' : 'พาสปอร์ต'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#1a8a6e]/70 w-28 flex-shrink-0">{'เลขที่'}</span>
            <span className="font-semibold font-mono tracking-wider">
              {kyc.id_number.replace(/^(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})$/, '$1-$2-$3-$4-$5')}
            </span>
          </div>
        </div>
        <p className="text-xs text-[#1a8a6e]/60 mt-3">{'ข้อมูลยืนยันตัวตนไม่สามารถแก้ไขได้'}</p>
      </div>
    )
  }

  // Pending — read-only waiting
  if (kyc?.status === 'pending') {
    return (
      <div className="bg-[#fef9ec] border border-[#ef9f27]/30 rounded-[14px] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#ef9f27] flex items-center justify-center flex-shrink-0">
            <IconClock size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-[#c47f00]">{'รอตรวจสอบ'}</div>
            <div className="text-xs text-[#c47f00]/70">
              {'ส่งเมื่อ '}{new Date(kyc.submitted_at).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
            </div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-[#c47f00]/70 w-28 flex-shrink-0">{'ประเภทเอกสาร'}</span>
            <span className="font-semibold">{kyc.id_type === 'national_id' ? 'บัตรประชาชน' : 'พาสปอร์ต'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#c47f00]/70 w-28 flex-shrink-0">{'เลขที่'}</span>
            <span className="font-semibold font-mono tracking-wider">{kyc.id_number}</span>
          </div>
        </div>
        <p className="text-xs text-[#c47f00]/70 mt-3">{'ทีมงานจะตรวจสอบภายใน 1–2 วันทำการ'}</p>
      </div>
    )
  }

  // Rejected or not submitted — show form
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconId size={18} className="text-[#1a8a6e]" />
        <span className="font-semibold">{'การยืนยันตัวตน'}</span>
        {!kyc && (
          <span className="ml-auto text-xs text-[var(--muted)] bg-[var(--border)] px-2 py-0.5 rounded-full">{'ยังไม่ยืนยัน'}</span>
        )}
      </div>

      {kyc?.status === 'rejected' && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-xs mb-4">
          <IconX size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">{'ไม่ผ่านการตรวจสอบ'}</div>
            {kyc.rejection_reason || 'กรุณาส่งเอกสารใหม่'}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          {[{ value: 'national_id', label: 'บัตรประชาชน' }, { value: 'passport', label: 'พาสปอร์ต' }].map(({ value, label }) => (
            <label
              key={value}
              className={`flex-1 flex items-center justify-center py-2.5 rounded-[10px] border-2 cursor-pointer text-sm font-medium transition-colors ${
                idType === value
                  ? 'border-[#1a8a6e] bg-[#e8f7f3] text-[#1a8a6e]'
                  : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              <input type="radio" className="hidden" value={value}
                checked={idType === value as 'national_id' | 'passport'}
                onChange={() => { setIdType(value as 'national_id' | 'passport'); setIdNumber('') }} />
              {label}
            </label>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {idType === 'national_id' ? 'เลขบัตรประชาชน 13 หลัก' : 'เลขพาสปอร์ต'}
          </label>
          <input
            type="text" required value={idNumber}
            onChange={e => {
              const v = e.target.value
              setIdNumber(idType === 'national_id' ? v.replace(/\D/g, '').slice(0, 13) : v.slice(0, 20))
            }}
            placeholder={idType === 'national_id' ? '1234567890123' : 'AA1234567'}
            className={`${inputClass} font-mono tracking-widest`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            {idType === 'national_id' ? 'รูปบัตรประชาชน' : 'รูปพาสปอร์ต'}
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex flex-col items-center gap-1.5 py-6 rounded-[10px] border-2 border-dashed cursor-pointer transition-colors ${
              file ? 'border-[#1a8a6e] bg-[#e8f7f3]' : 'border-[var(--border)] hover:border-[#1a8a6e]'
            }`}
          >
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <IconUpload size={22} className={file ? 'text-[#1a8a6e]' : 'text-[var(--muted)]'} />
            {file ? (
              <div className="text-center">
                <div className="text-sm font-medium text-[#1a8a6e]">{file.name}</div>
                <div className="text-xs text-[var(--muted)]">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            ) : (
              <div className="text-xs text-[var(--muted)] text-center">
                <div>{'คลิกเพื่อเลือกไฟล์'}</div>
                <div>{'JPG, PNG, PDF ไม่เกิน 5 MB'}</div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-sm">
            <IconAlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
          </div>
        )}

        <button type="submit" disabled={submitting || !file || (idType === 'national_id' && idNumber.length !== 13)}
          className="w-full py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--hw-green)' }}>
          {submitting ? 'กำลังส่ง...' : 'ส่งข้อมูลยืนยันตัวตน'}
        </button>
      </form>
    </div>
  )
}

/* ─── Main Profile Page ─── */
export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [form, setForm] = useState<ProfileForm>({
    title: '', first_name: '', last_name: '', date_of_birth: '',
    gender: '', blood_type: '', weight: '', height: '', phone: '', allergies: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }
    sb.from('hw_users')
      .select('title, first_name, last_name, date_of_birth, gender, blood_type, weight, height, phone, allergies')
      .eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setForm({
          title: data.title || '', first_name: data.first_name || '',
          last_name: data.last_name || '', date_of_birth: data.date_of_birth || '',
          gender: data.gender || '', blood_type: data.blood_type || '',
          weight: data.weight != null ? String(data.weight) : '',
          height: data.height != null ? String(data.height) : '',
          phone: data.phone || '', allergies: data.allergies || '',
        })
        setLoading(false)
      })
  }, [user, authLoading])

  const setField = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value })); setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null)
    const { error: err } = await sb.from('hw_users').update({
      title: form.title || null, first_name: form.first_name || null,
      last_name: form.last_name || null,
      full_name: `${form.title}${form.first_name} ${form.last_name}`.trim() || null,
      date_of_birth: form.date_of_birth || null, gender: form.gender || null,
      blood_type: form.blood_type || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      height: form.height ? parseFloat(form.height) : null,
      phone: form.phone || null, allergies: form.allergies || null,
      updated_at: new Date().toISOString(),
    }).eq('id', user!.id)
    if (err) setError(err.message)
    else setSaved(true)
    setSaving(false)
  }

  if (authLoading || loading) {
    return <div className="max-w-lg mx-auto px-5 py-12 text-center text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-6 pb-12 space-y-6">
      <h1 className="text-xl font-bold">{'ข้อมูลส่วนตัว'}</h1>

      {/* ─── Profile form ─── */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ข้อมูลทั่วไป */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">{'ข้อมูลทั่วไป'}</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">{'คำนำหน้า'}</label>
            <select value={form.title} onChange={setField('title')} className={inputClass}>
              <option value="">{'เลือกคำนำหน้า'}</option>
              {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{'ชื่อ'}</label>
              <input type="text" value={form.first_name} onChange={setField('first_name')} placeholder={'ชื่อจริง'} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'นามสกุล'}</label>
              <input type="text" value={form.last_name} onChange={setField('last_name')} placeholder={'นามสกุล'} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{'วันเกิด'}</label>
              <input type="date" value={form.date_of_birth} onChange={setField('date_of_birth')}
                max={new Date().toISOString().split('T')[0]} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'เพศ'}</label>
              <select value={form.gender} onChange={setField('gender')} className={inputClass}>
                <option value="">{'เลือกเพศ'}</option>
                {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{'เบอร์โทรศัพท์'}</label>
            <input type="tel" value={form.phone} onChange={setField('phone')} placeholder={'0812345678'} className={inputClass} />
          </div>
        </div>

        {/* ข้อมูลสุขภาพ */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">{'ข้อมูลสุขภาพ'}</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">{'กรุ๊ปเลือด'}</label>
            <select value={form.blood_type} onChange={setField('blood_type')} className={inputClass}>
              <option value="">{'เลือกกรุ๊ปเลือด'}</option>
              {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{'น้ำหนัก (กก.)'}</label>
              <input type="number" value={form.weight} onChange={setField('weight')} placeholder={'65'} min="1" max="300" step="0.1" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'ส่วนสูง (ซม.)'}</label>
              <input type="number" value={form.height} onChange={setField('height')} placeholder={'170'} min="50" max="250" step="0.1" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{'แพ้ยา / แพ้อาหาร'}</label>
            <textarea value={form.allergies} onChange={setField('allergies')} rows={2}
              className={`${inputClass} resize-none`}
              placeholder={'เช่น แพ้ยา Penicillin (ถ้าไม่มีให้เว้นว่าง)'} />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-sm">
            <IconAlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 p-3 bg-[#e8f7f3] border border-[#1a8a6e]/30 rounded-[10px] text-[#1a8a6e] text-sm">
            <IconCheck size={15} />{'บันทึกข้อมูลเรียบร้อยแล้ว'}
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3 rounded-full font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--hw-green)' }}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </form>

      {/* ─── KYC Section ─── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">{'การยืนยันตัวตน'}</h2>
        <KycSection userId={user!.id} sb={sb} />
      </div>
    </div>
  )
}

