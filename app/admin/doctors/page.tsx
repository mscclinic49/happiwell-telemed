'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import {
  IconPlus, IconEdit, IconX, IconCheck, IconAlertCircle,
  IconUpload, IconChevronDown, IconUser,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Doctor = {
  id: string; full_name: string; specialty: string | null; bio: string | null
  avatar_url: string | null; consultation_fee: number; rating: number | null
  is_online: boolean; is_active: boolean
}
type Schedule = { day_of_week: number; start_time: string; end_time: string; is_available: boolean }

const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const SPECIALTIES = ['อายุรกรรม', 'กุมารเวชกรรม', 'ผิวหนัง', 'จิตเวช', 'ออร์โธปีดิกส์', 'สูตินรีเวช', 'ตา', 'หู คอ จมูก', 'ทั่วไป']

const emptyForm = () => ({
  full_name: '', specialty: '', bio: '', consultation_fee: '500',
  is_online: false, is_active: true,
})

const emptySchedule = (): Schedule[] =>
  [1, 2, 3, 4, 5].map(d => ({ day_of_week: d, start_time: '09:00', end_time: '17:00', is_available: true }))

const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[var(--hw-green-dk)]'

export default function AdminDoctorsPage() {
  const { user } = useAuth()
  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [schedules, setSchedules] = useState<Schedule[]>(emptySchedule())
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState('')

  function loadDoctors() {
    sb.from('hw_doctors')
      .select('id, full_name, specialty, bio, avatar_url, consultation_fee, rating, is_online, is_active')
      .order('full_name')
      .then(({ data }) => setDoctors((data as Doctor[]) || []))
  }

  useEffect(() => { if (user) loadDoctors() }, [user])

  async function loadSchedule(doctorId: string) {
    const { data } = await sb.from('hw_doctor_schedules')
      .select('day_of_week, start_time, end_time, is_available')
      .eq('doctor_id', doctorId).order('day_of_week')
    if (data && data.length > 0) {
      setSchedules(data as Schedule[])
    } else {
      setSchedules(emptySchedule())
    }
  }

  function openNew() {
    setEditing(null); setForm(emptyForm()); setSchedules(emptySchedule())
    setAvatarFile(null); setAvatarPreview(null); setError(null); setShowForm(true)
  }

  function openEdit(d: Doctor) {
    setEditing(d)
    setForm({
      full_name: d.full_name, specialty: d.specialty || '',
      bio: d.bio || '', consultation_fee: String(d.consultation_fee),
      is_online: d.is_online, is_active: d.is_active,
    })
    setAvatarFile(null); setAvatarPreview(d.avatar_url)
    setError(null); setShowForm(true)
    loadSchedule(d.id)
  }

  function closeForm() {
    setShowForm(false); setEditing(null); setAvatarFile(null); setAvatarPreview(null)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  function setScheduleField(day: number, field: keyof Schedule, value: string | boolean) {
    setSchedules(prev => {
      const exists = prev.find(s => s.day_of_week === day)
      if (exists) return prev.map(s => s.day_of_week === day ? { ...s, [field]: value } : s)
      return [...prev, { day_of_week: day, start_time: '09:00', end_time: '17:00', is_available: true, [field]: value }]
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('กรุณากรอกชื่อแพทย์'); return }
    setSaving(true); setError(null)

    try {
      let avatarUrl = editing?.avatar_url ?? null

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg'
        const doctorId = editing?.id ?? crypto.randomUUID()
        const path = `${doctorId}/avatar.${ext}`
        const { data: upData, error: upErr } = await sb.storage
          .from('doctor-avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (upErr) throw new Error(upErr.message)
        const { data: urlData } = sb.storage.from('doctor-avatars').getPublicUrl(upData.path)
        avatarUrl = urlData.publicUrl
      }

      const payload = {
        full_name: form.full_name.trim(),
        specialty: form.specialty || null,
        bio: form.bio.trim() || null,
        consultation_fee: parseFloat(form.consultation_fee) || 0,
        is_online: form.is_online,
        is_active: form.is_active,
        avatar_url: avatarUrl,
      }

      let doctorId: string

      if (editing) {
        const { error: err } = await sb.from('hw_doctors').update(payload).eq('id', editing.id)
        if (err) throw new Error(err.message)
        doctorId = editing.id
      } else {
        const { data, error: err } = await sb.from('hw_doctors').insert(payload).select('id').single()
        if (err) throw new Error(err.message)
        doctorId = data.id
        // Re-upload avatar with correct doctorId if it was generated
        if (avatarFile && avatarUrl) {
          const ext = avatarFile.name.split('.').pop() ?? 'jpg'
          const path = `${doctorId}/avatar.${ext}`
          await sb.storage.from('doctor-avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
          const { data: urlData } = sb.storage.from('doctor-avatars').getPublicUrl(path)
          await sb.from('hw_doctors').update({ avatar_url: urlData.publicUrl }).eq('id', doctorId)
        }
      }

      // Save schedules: upsert per day
      for (const s of schedules) {
        await sb.from('hw_doctor_schedules').upsert({
          doctor_id: doctorId,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_available: s.is_available,
        }, { onConflict: 'doctor_id,day_of_week' })
      }

      setSuccess(editing ? 'แก้ไขข้อมูลแพทย์เรียบร้อย' : 'เพิ่มแพทย์เรียบร้อย')
      closeForm()
      loadDoctors()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold">{'จัดการข้อมูลแพทย์'}</h1>
        <button onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white"
          style={{ background: 'var(--hw-green)' }}>
          <IconPlus size={15} />{'เพิ่มแพทย์'}
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-[var(--hw-green-dk)]/10 border border-[var(--hw-green-dk)]/30 rounded-[10px] text-[var(--hw-green-dk)] text-sm mb-4">
          <IconCheck size={15} />{success}
        </div>
      )}

      {/* Doctor list */}
      {!showForm && (
        <div className="space-y-3">
          {doctors.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)] text-sm">{'ยังไม่มีข้อมูลแพทย์'}</div>
          )}
          {doctors.map(d => (
            <div key={d.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 flex items-center gap-4">
              {d.avatar_url ? (
                <Image src={d.avatar_url} alt={d.full_name} width={48} height={48}
                  className="rounded-full object-cover flex-shrink-0" style={{ width: 48, height: 48 }} />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--hw-green-dk)]/10 flex items-center justify-center flex-shrink-0">
                  <IconUser size={22} className="text-[var(--hw-green-dk)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{d.full_name}</div>
                <div className="text-xs text-[var(--muted)]">{d.specialty || '—'}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.is_active ? 'bg-[var(--hw-green-dk)]/10 text-[var(--hw-green-dk)]' : 'bg-[var(--border)] text-[var(--muted)]'}`}>
                    {d.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                  {d.is_online && (
                    <span className="text-xs text-[var(--hw-green-dk)] flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--hw-green-dk)] inline-block" />{'ออนไลน์'}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => openEdit(d)}
                className="p-2 rounded-[8px] border border-[var(--border)] hover:bg-[var(--hw-green-dk)]/10 transition-colors flex-shrink-0">
                <IconEdit size={16} className="text-[var(--muted)]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{editing ? 'แก้ไขข้อมูลแพทย์' : 'เพิ่มแพทย์ใหม่'}</h2>
            <button type="button" onClick={closeForm} className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)]">
              <IconX size={18} />
            </button>
          </div>

          {/* Avatar upload */}
          <div>
            <label className="block text-sm font-medium mb-2">{'รูปประจำตัว'}</label>
            <div className="flex items-center gap-4">
              <div onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center cursor-pointer hover:border-[var(--hw-green-dk)] transition-colors overflow-hidden flex-shrink-0">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="preview" width={80} height={80} className="w-full h-full object-cover" />
                ) : (
                  <IconUpload size={22} className="text-[var(--muted)]" />
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
              <div className="text-xs text-[var(--muted)]">
                <p>{'คลิกที่วงกลมเพื่อเลือกรูป'}</p>
                <p>{'JPG, PNG, WEBP ขนาดไม่เกิน 2 MB'}</p>
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{'ชื่อแพทย์ (รวมคำนำหน้า)'}<span className="text-red-500 ml-0.5">*</span></label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder={'เช่น นพ.สมชาย ใจดี'} required className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{'สาขาเฉพาะทาง'}</label>
              <div className="relative">
                <select value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} className={inputClass}>
                  <option value="">{'— ไม่ระบุ —'}</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <IconChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{'ประวัติ / คุณวุฒิ'}</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={3} placeholder={'ระบุประวัติการศึกษา ความเชี่ยวชาญ...'} className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{'ค่าปรึกษา (บาท)'}</label>
              <input type="number" value={form.consultation_fee} min="0" step="50"
                onChange={e => setForm(f => ({ ...f, consultation_fee: e.target.value }))} className={inputClass} />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_online}
                  onChange={e => setForm(f => ({ ...f, is_online: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--hw-green-dk)]" />
                <span className="text-sm">{'ออนไลน์ตอนนี้'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--hw-green-dk)]" />
                <span className="text-sm">{'เปิดใช้งาน'}</span>
              </label>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
            <h3 className="font-semibold text-sm mb-4">{'ตารางออกตรวจ'}</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const s = schedules.find(x => x.day_of_week === day) ?? { day_of_week: day, start_time: '09:00', end_time: '17:00', is_available: false }
                return (
                  <div key={day} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 w-28 flex-shrink-0 cursor-pointer">
                      <input type="checkbox" checked={s.is_available}
                        onChange={e => setScheduleField(day, 'is_available', e.target.checked)}
                        className="w-4 h-4 accent-[var(--hw-green-dk)]" />
                      <span className="text-sm font-medium">{DAYS[day]}</span>
                    </label>
                    {s.is_available ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={s.start_time}
                          onChange={e => setScheduleField(day, 'start_time', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-[8px] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--hw-green-dk)]" />
                        <span className="text-[var(--muted)] text-sm">{'–'}</span>
                        <input type="time" value={s.end_time}
                          onChange={e => setScheduleField(day, 'end_time', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-[8px] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--hw-green-dk)]" />
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">{'หยุด'}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-400 text-sm">
              <IconAlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={closeForm}
              className="flex-1 py-3 rounded-full border border-[var(--border)] text-sm font-semibold hover:bg-[var(--background)] transition-colors">
              {'ยกเลิก'}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={{ background: 'var(--hw-green)' }}>
              {saving ? 'กำลังบันทึก...' : (editing ? 'บันทึกการแก้ไข' : 'เพิ่มแพทย์')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

