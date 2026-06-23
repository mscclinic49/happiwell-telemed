'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type ProfileForm = {
  title: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  blood_type: string
  weight: string
  height: string
  phone: string
  allergies: string
}

const TITLES   = ['นาย', 'นาง', 'น.ส.', 'ด.ช.', 'ด.ญ.']
const GENDERS  = [{ value: 'male', label: 'ชาย' }, { value: 'female', label: 'หญิง' }, { value: 'other', label: 'อื่นๆ' }]
const BLOOD_TYPES = ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const selectClass = 'w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-teal-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
const inputClass  = `${selectClass} placeholder-gray-400 dark:placeholder-gray-500`

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
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

    supabase
      .from('hw_users')
      .select('title, first_name, last_name, date_of_birth, gender, blood_type, weight, height, phone, allergies')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            title:         data.title         || '',
            first_name:    data.first_name    || '',
            last_name:     data.last_name     || '',
            date_of_birth: data.date_of_birth || '',
            gender:        data.gender        || '',
            blood_type:    data.blood_type    || '',
            weight:        data.weight        != null ? String(data.weight) : '',
            height:        data.height        != null ? String(data.height) : '',
            phone:         data.phone         || '',
            allergies:     data.allergies     || '',
          })
        }
        setLoading(false)
      })
  }, [user, authLoading, router])

  function set(field: keyof ProfileForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const fullName = `${form.title}${form.first_name} ${form.last_name}`.trim()

    const { error } = await supabase
      .from('hw_users')
      .update({
        title:         form.title || null,
        first_name:    form.first_name || null,
        last_name:     form.last_name || null,
        full_name:     fullName || null,
        date_of_birth: form.date_of_birth || null,
        gender:        form.gender || null,
        blood_type:    form.blood_type || null,
        weight:        form.weight ? parseFloat(form.weight) : null,
        height:        form.height ? parseFloat(form.height) : null,
        phone:         form.phone || null,
        allergies:     form.allergies || null,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', user!.id)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">กำลังโหลด...</div>
  }

  return (
    <main className="min-h-screen p-5 max-w-md mx-auto pb-12">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <a href="/" className="text-teal-600 dark:text-teal-400 text-sm">← กลับ</a>
        <h1 className="text-xl font-bold">แก้ไขข้อมูลส่วนตัว</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ข้อมูลทั่วไป */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">ข้อมูลทั่วไป</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">คำนำหน้า</label>
              <select value={form.title} onChange={e => set('title', e.target.value)} className={selectClass}>
                <option value="">เลือกคำนำหน้า</option>
                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ</label>
                <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)}
                  className={inputClass} placeholder="ชื่อจริง" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">นามสกุล</label>
                <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)}
                  className={inputClass} placeholder="นามสกุล" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">วันเกิด</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">เพศ</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={selectClass}>
                <option value="">เลือกเพศ</option>
                {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">เบอร์โทรศัพท์</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                className={inputClass} placeholder="0812345678" />
            </div>
          </div>
        </section>

        {/* ข้อมูลสุขภาพ */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">ข้อมูลสุขภาพ</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">กรุ๊ปเลือด</label>
              <select value={form.blood_type} onChange={e => set('blood_type', e.target.value)} className={selectClass}>
                <option value="">เลือกกรุ๊ปเลือด</option>
                {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">น้ำหนัก (กก.)</label>
                <input type="number" value={form.weight} onChange={e => set('weight', e.target.value)}
                  className={inputClass} placeholder="65" min="1" max="300" step="0.1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ส่วนสูง (ซม.)</label>
                <input type="number" value={form.height} onChange={e => set('height', e.target.value)}
                  className={inputClass} placeholder="170" min="50" max="250" step="0.1" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">แพ้ยา / แพ้อาหาร</label>
              <textarea value={form.allergies} onChange={e => set('allergies', e.target.value)}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="เช่น แพ้ยา Penicillin, แพ้อาหารทะเล (ถ้าไม่มีให้เว้นว่าง)"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 text-green-700 dark:text-green-400 text-sm">
            บันทึกข้อมูลเรียบร้อยแล้ว
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-teal-600 text-white py-3 rounded-full font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>
      </form>
    </main>
  )
}
