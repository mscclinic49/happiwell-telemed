'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconPill, IconPlus, IconEdit, IconTrash, IconCheck,
  IconX, IconSearch, IconLoader2,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Drug = {
  id: string
  drug_name: string
  strength: string | null
  dosage: string | null
  frequency: string | null
  duration: string | null
  instructions: string | null
  unit: string | null
  price: number | null
  category: string | null
  is_active: boolean
}

const EMPTY: Omit<Drug, 'id' | 'is_active'> = {
  drug_name: '', strength: '', dosage: '', frequency: '',
  duration: '', instructions: '', unit: 'เม็ด', price: null, category: '',
}

function DrugForm({
  initial, onSave, onCancel,
}: {
  initial: Partial<Drug>
  onSave: (d: Partial<Drug>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof EMPTY, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.drug_name.trim()) return
    setSaving(true)
    await onSave({ ...form, price: form.price ? Number(form.price) : null })
    setSaving(false)
  }

  const Field = ({ label, k, placeholder }: { label: string; k: keyof typeof EMPTY; placeholder?: string }) => (
    <div>
      <label className="block text-xs text-[var(--muted)] mb-1">{label}</label>
      <input
        value={(form[k] as string) ?? ''}
        onChange={e => set(k, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-sm focus:outline-none focus:border-[#1a8a6e]"
      />
    </div>
  )

  return (
    <form onSubmit={submit} className="bg-[var(--card-bg)] border border-[#1a8a6e]/40 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-[var(--muted)] mb-1">{'ชื่อยา *'}</label>
          <input
            value={form.drug_name}
            onChange={e => set('drug_name', e.target.value)}
            placeholder="เช่น Paracetamol, Amoxicillin"
            required
            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-sm focus:outline-none focus:border-[#1a8a6e]"
          />
        </div>
        <Field label="ความแรง (strength)" k="strength" placeholder="เช่น 500mg, 10mg/5ml" />
        <Field label="หมวดหมู่" k="category" placeholder="เช่น แก้ปวด, ยาปฏิชีวนะ" />
        <Field label="ขนาดใช้ต่อครั้ง (dosage)" k="dosage" placeholder="เช่น 1 เม็ด, 5 ml" />
        <Field label="หน่วย" k="unit" placeholder="เช่น เม็ด, แคปซูล, ช้อนชา" />
        <Field label="ความถี่ (frequency)" k="frequency" placeholder="เช่น วันละ 3 ครั้ง" />
        <Field label="ระยะเวลา (duration)" k="duration" placeholder="เช่น 5 วัน" />
        <div className="col-span-2">
          <Field label="วิธีรับประทาน (instructions)" k="instructions" placeholder="เช่น หลังอาหาร, ก่อนนอน" />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">{'ราคาต่อหน่วย (บาท)'}</label>
          <input
            type="number" min="0" step="0.01"
            value={form.price ?? ''}
            onChange={e => setForm(f => ({ ...f, price: e.target.value ? Number(e.target.value) : null }))}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-sm focus:outline-none focus:border-[#1a8a6e]"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          {'ยกเลิก'}
        </button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a8a6e] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
          {saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
          {'บันทึก'}
        </button>
      </div>
    </form>
  )
}

export default function AdminDrugsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

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
    sb.from('hw_drugs')
      .select('*')
      .order('drug_name')
      .then(({ data }) => { setDrugs((data as Drug[]) ?? []); setLoading(false) })
  }, [])

  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])

  async function handleAdd(d: Partial<Drug>) {
    await sb.from('hw_drugs').insert({ ...d, is_active: true })
    setAdding(false)
    load()
  }

  async function handleEdit(id: string, d: Partial<Drug>) {
    await sb.from('hw_drugs').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id)
    setEditId(null)
    load()
  }

  async function toggleActive(drug: Drug) {
    await sb.from('hw_drugs').update({ is_active: !drug.is_active }).eq('id', drug.id)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบยานี้ออกจากระบบ?')) return
    await sb.from('hw_drugs').delete().eq('id', id)
    load()
  }

  const filtered = drugs.filter(d =>
    d.drug_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.category ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (isAdmin === null || (isAdmin && loading)) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] animate-pulse" />)}
      </div>
    )
  }
  if (!isAdmin) return null

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <IconPill size={20} className="text-[#1a8a6e]" />
          <h1 className="text-lg font-bold">{'คลังยา'}</h1>
          <span className="text-xs text-[var(--muted)] ml-1">({drugs.length} รายการ)</span>
        </div>
        <button
          onClick={() => { setAdding(true); setEditId(null) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a8a6e] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <IconPlus size={15} />{'เพิ่มยา'}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อยา หรือหมวดหมู่..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm focus:outline-none focus:border-[#1a8a6e]"
        />
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-4">
          <DrugForm initial={EMPTY} onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      {/* Drug list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <IconPill size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? 'ไม่พบยาที่ค้นหา' : 'ยังไม่มีข้อมูลยา กด "เพิ่มยา" เพื่อเริ่มต้น'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(drug => (
            <div key={drug.id}>
              {editId === drug.id ? (
                <DrugForm
                  initial={drug}
                  onSave={d => handleEdit(drug.id, d)}
                  onCancel={() => setEditId(null)}
                />
              ) : (
                <div className={`bg-[var(--card-bg)] border rounded-2xl px-4 py-3 flex items-start gap-3 transition-opacity ${!drug.is_active ? 'opacity-50' : 'border-[var(--border)]'}`}>
                  <div className="w-9 h-9 rounded-full bg-[#1a8a6e]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <IconPill size={16} className="text-[#1a8a6e]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{drug.drug_name}</span>
                      {drug.strength && <span className="text-xs text-[var(--muted)]">{drug.strength}</span>}
                      {drug.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a8a6e]/10 text-[#1a8a6e] font-medium">
                          {drug.category}
                        </span>
                      )}
                      {!drug.is_active && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                          {'ปิดใช้งาน'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-[var(--muted)]">
                      {drug.dosage && <span>{'ขนาด: '}{drug.dosage}</span>}
                      {drug.frequency && <span>{'ความถี่: '}{drug.frequency}</span>}
                      {drug.duration && <span>{'ระยะเวลา: '}{drug.duration}</span>}
                      {drug.instructions && <span>{'วิธีกิน: '}{drug.instructions}</span>}
                      {drug.unit && <span>{'หน่วย: '}{drug.unit}</span>}
                      {drug.price != null && <span>{'ราคา: '}{drug.price.toFixed(2)}{' บาท'}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleActive(drug)}
                      title={drug.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                      {drug.is_active ? <IconX size={14} /> : <IconCheck size={14} />}
                    </button>
                    <button onClick={() => { setEditId(drug.id); setAdding(false) }}
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                      <IconEdit size={14} />
                    </button>
                    <button onClick={() => handleDelete(drug.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--muted)] hover:text-red-400 hover:border-red-400/40 transition-colors">
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
