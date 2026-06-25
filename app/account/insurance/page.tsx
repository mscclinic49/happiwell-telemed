'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { IconShield, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

const TYPES = ['ประกันสังคม', 'ประกันสุขภาพเอกชน', 'สิทธิ์ข้าราชการ', 'บัตรทอง 30 บาท', 'จ่ายเอง (ไม่มีสิทธิ์)']

type Form = { insurance_type: string; provider_name: string; policy_number: string; coverage_note: string }
const empty: Form = { insurance_type: 'ประกันสังคม', provider_name: '', policy_number: '', coverage_note: '' }

export default function InsurancePage() {
  const { user } = useAuth()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const [form, setForm] = useState<Form>(empty)
  const [hasExisting, setHasExisting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('hw_insurance_info').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) { setForm(data); setHasExisting(true) }; setLoading(false) })
  }, [user])

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null)
    const payload = { ...form, user_id: user!.id, updated_at: new Date().toISOString() }
    const { error: err } = hasExisting
      ? await supabase.from('hw_insurance_info').update(payload).eq('user_id', user!.id)
      : await supabase.from('hw_insurance_info').insert(payload)
    if (err) { setError(err.message) } else { setSuccess(true); setHasExisting(true); setTimeout(() => setSuccess(false), 3000) }
    setSaving(false)
  }

  const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-base focus:outline-none focus:border-[var(--hw-green-dk)]'

  if (loading) return <div className="max-w-lg mx-auto px-5 py-10 text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>

  return (
    <div className="max-w-lg mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <IconShield size={22} className="text-[var(--hw-green-dk)]" />
        <h1 className="text-xl font-bold">{'สิทธิเบิกจ่าย'}</h1>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-[var(--hw-mint-bg)] border border-[var(--hw-green-dk)] rounded-[14px] mb-4 text-[var(--hw-green-dk)] text-sm">
          <IconCheck size={16} /><span>{'บันทึกข้อมูลสำเร็จ'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{'ประเภทสิทธิ์'}</label>
          <div className="space-y-2">
            {TYPES.map(t => (
              <label key={t} className={`flex items-center gap-3 px-4 py-3 rounded-[10px] border-2 cursor-pointer transition-colors ${form.insurance_type === t ? 'border-[var(--hw-green-dk)] bg-[var(--hw-mint-bg)]' : 'border-[var(--border)] hover:border-[var(--hw-green-dk)]'}`}>
                <input type="radio" className="hidden" checked={form.insurance_type === t} onChange={() => setForm(f => ({ ...f, insurance_type: t }))} />
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${form.insurance_type === t ? 'border-[var(--hw-green-dk)] bg-[var(--hw-green-dk)]' : 'border-[var(--border)]'}`}>
                  {form.insurance_type === t && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className={`text-sm font-medium ${form.insurance_type === t ? 'text-[var(--hw-green-dk)]' : ''}`}>{t}</span>
              </label>
            ))}
          </div>
        </div>

        {form.insurance_type !== 'จ่ายเอง (ไม่มีสิทธิ์)' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'ชื่อบริษัท/หน่วยงาน'}</label>
              <input value={form.provider_name} onChange={set('provider_name')} placeholder="เช่น กรมบัญชีกลาง, AIA, เมืองไทยประกันภัย" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'เลขกรมธรรม์ / เลขที่สิทธิ์'}</label>
              <input value={form.policy_number} onChange={set('policy_number')} placeholder="เลขกรมธรรม์หรือเลขประจำตัว" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'หมายเหตุ / ข้อจำกัดการคุ้มครอง'}</label>
              <textarea value={form.coverage_note} onChange={set('coverage_note')} rows={3} placeholder="เช่น คุ้มครองผู้ป่วยนอก OPD สูงสุด 3,000 บาท/ครั้ง" className={`${inputClass} resize-none`} />
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-sm">
            <IconAlertCircle size={15} />{error}
          </div>
        )}

        <button type="submit" disabled={saving} className="w-full py-3 rounded-full font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity" style={{ background: 'var(--hw-green)' }}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสิทธิ์'}
        </button>
      </form>
    </div>
  )
}

