'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconBook2, IconPlus, IconX, IconCheck, IconAlertCircle,
  IconTemperature, IconHeartbeat, IconScale, IconTrash,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Entry = {
  id: string
  entry_date: string
  title: string | null
  content: string
  weight_kg: number | null
  blood_pressure: string | null
  temperature_c: number | null
  created_at: string
}

type Form = { entry_date: string; title: string; content: string; weight_kg: string; blood_pressure: string; temperature_c: string }

const emptyForm = (): Form => ({
  entry_date: new Date().toISOString().split('T')[0],
  title: '', content: '', weight_kg: '', blood_pressure: '', temperature_c: '',
})

export default function HealthJournalPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Form>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  function loadEntries() {
    if (!user) return
    supabase.from('hw_health_journal').select('*').eq('user_id', user.id)
      .order('entry_date', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => { setEntries((data as Entry[]) || []); setLoading(false) })
  }

  useEffect(() => { loadEntries() }, [user])

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null)
    const { error: err } = await supabase.from('hw_health_journal').insert({
      user_id: user!.id,
      entry_date: form.entry_date,
      title: form.title.trim() || null,
      content: form.content.trim(),
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      blood_pressure: form.blood_pressure.trim() || null,
      temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
    })
    if (err) { setError(err.message) } else {
      setShowForm(false); setForm(emptyForm()); loadEntries()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบบันทึกนี้?')) return
    setDeleting(id)
    await supabase.from('hw_health_journal').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    setDeleting(null)
  }

  const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-base focus:outline-none focus:border-[#1a8a6e]'

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconBook2 size={22} className="text-[#1a8a6e]" />
          <h1 className="text-xl font-bold">{'สมุดบันทึกสุขภาพ'}</h1>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(null) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#1a8a6e' }}
        >
          {showForm ? <IconX size={16} /> : <IconPlus size={16} />}
          {showForm ? 'ยกเลิก' : 'เพิ่มบันทึก'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{'วันที่'}</label>
              <input type="date" required value={form.entry_date} onChange={set('entry_date')} max={new Date().toISOString().split('T')[0]} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'หัวข้อ (ไม่บังคับ)'}</label>
              <input value={form.title} onChange={set('title')} placeholder="เช่น ไข้หวัด, ปวดหัว" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{'รายละเอียดอาการ / บันทึก'}</label>
            <textarea required value={form.content} onChange={set('content')} rows={4} placeholder="บันทึกอาการ ความรู้สึก หรือสิ่งที่ต้องการจดไว้..." className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">{'น้ำหนัก (กก.)'}</label>
              <input type="number" step="0.1" min="1" max="300" value={form.weight_kg} onChange={set('weight_kg')} placeholder="65.0" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'ความดัน'}</label>
              <input value={form.blood_pressure} onChange={set('blood_pressure')} placeholder="120/80" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{'อุณหภูมิ (°C)'}</label>
              <input type="number" step="0.1" min="34" max="43" value={form.temperature_c} onChange={set('temperature_c')} placeholder="37.0" className={inputClass} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-sm">
              <IconAlertCircle size={15} />{error}
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full py-3 rounded-full font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity" style={{ background: '#1a8a6e' }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      )}

      {loading && (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-28 rounded-[14px] bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />)}
        </div>
      )}

      {!loading && entries.length === 0 && !showForm && (
        <div className="text-center py-20 text-[var(--muted)]">
          <IconBook2 size={44} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">{'ยังไม่มีบันทึกสุขภาพ'}</p>
          <p className="text-xs mt-1 opacity-70">{'กดปุ่ม "เพิ่มบันทึก" เพื่อเริ่มต้น'}</p>
        </div>
      )}

      <div className="space-y-3">
        {entries.map(e => (
          <div key={e.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-xs text-[var(--muted)]">
                  {new Date(e.entry_date + 'T00:00:00').toLocaleDateString('th-TH', { dateStyle: 'long' })}
                </div>
                {e.title && <div className="font-semibold mt-0.5">{e.title}</div>}
              </div>
              <button
                onClick={() => handleDelete(e.id)}
                disabled={deleting === e.id}
                className="p-1.5 text-[var(--muted)] hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40"
              >
                <IconTrash size={15} />
              </button>
            </div>

            <p className="text-sm text-[var(--foreground)] leading-relaxed mb-3 line-clamp-3">{e.content}</p>

            {(e.weight_kg || e.blood_pressure || e.temperature_c) && (
              <div className="flex flex-wrap gap-2">
                {e.weight_kg && (
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#e6f1fb] text-[#185fa5]">
                    <IconScale size={11} />{e.weight_kg} กก.
                  </span>
                )}
                {e.blood_pressure && (
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#fee2e2] text-red-700">
                    <IconHeartbeat size={11} />{e.blood_pressure}
                  </span>
                )}
                {e.temperature_c && (
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#faeeda] text-[#c47f00]">
                    <IconTemperature size={11} />{e.temperature_c}°C
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
