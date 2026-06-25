'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { IconMapPin, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Address = {
  label: string
  recipient_name: string
  phone: string
  address_line: string
  district: string
  province: string
  postal_code: string
}

const PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา',
  'ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก',
  'นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน',
  'บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา',
  'พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต',
  'มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี',
  'ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ',
  'สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี',
  'สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี',
  'อุตรดิตถ์','อุทัยธานี','อุบลราชธานี',
]

const LABELS = ['บ้าน', 'ที่ทำงาน', 'อื่นๆ']

const empty: Address = { label: 'บ้าน', recipient_name: '', phone: '', address_line: '', district: '', province: 'กรุงเทพมหานคร', postal_code: '' }

export default function DeliveryAddressPage() {
  const { user } = useAuth()
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const [form, setForm] = useState<Address>(empty)
  const [hasExisting, setHasExisting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('hw_delivery_addresses').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) { setForm(data); setHasExisting(true) }
        setLoading(false)
      })
  }, [user])

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null)
    const payload = { ...form, user_id: user!.id, updated_at: new Date().toISOString() }
    const { error: err } = hasExisting
      ? await supabase.from('hw_delivery_addresses').update(payload).eq('user_id', user!.id)
      : await supabase.from('hw_delivery_addresses').insert(payload)
    if (err) { setError(err.message) } else { setSuccess(true); setHasExisting(true); setTimeout(() => setSuccess(false), 3000) }
    setSaving(false)
  }

  const inputClass = 'w-full px-4 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--card-bg)] text-base focus:outline-none focus:border-[var(--hw-green-dk)]'

  if (loading) return <div className="max-w-lg mx-auto px-5 py-10 text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>

  return (
    <div className="max-w-lg mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <IconMapPin size={22} className="text-[var(--hw-green-dk)]" />
        <h1 className="text-xl font-bold">{'ที่อยู่รับยา'}</h1>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-[var(--hw-mint-bg)] border border-[var(--hw-green-dk)] rounded-[14px] mb-4 text-[var(--hw-green-dk)] text-sm">
          <IconCheck size={16} /><span>{'บันทึกที่อยู่สำเร็จ'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{'ป้ายชื่อที่อยู่'}</label>
          <div className="flex gap-2">
            {LABELS.map(l => (
              <label key={l} className={`flex-1 flex items-center justify-center py-2.5 rounded-[10px] border-2 cursor-pointer text-sm font-medium transition-colors ${form.label === l ? 'border-[var(--hw-green-dk)] bg-[var(--hw-mint-bg)] text-[var(--hw-green-dk)]' : 'border-[var(--border)] text-[var(--muted)]'}`}>
                <input type="radio" className="hidden" checked={form.label === l} onChange={() => setForm(f => ({ ...f, label: l }))} />
                {l}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{'ชื่อผู้รับ'}</label>
          <input required value={form.recipient_name} onChange={set('recipient_name')} placeholder="ชื่อ-นามสกุล" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{'เบอร์โทรศัพท์'}</label>
          <input required type="tel" value={form.phone} onChange={set('phone')} placeholder="0812345678" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{'ที่อยู่'}</label>
          <input required value={form.address_line} onChange={set('address_line')} placeholder="เลขที่ ถนน ซอย หมู่บ้าน" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">{'แขวง/ตำบล'}</label>
            <input value={form.district} onChange={set('district')} placeholder="แขวง/ตำบล" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">{'รหัสไปรษณีย์'}</label>
            <input required value={form.postal_code} onChange={set('postal_code')} placeholder="10100" maxLength={5} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{'จังหวัด'}</label>
          <select required value={form.province} onChange={set('province')} className={inputClass}>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 text-sm">
            <IconAlertCircle size={15} />{error}
          </div>
        )}

        <button type="submit" disabled={saving} className="w-full py-3 rounded-full font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity" style={{ background: 'var(--hw-green)' }}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกที่อยู่'}
        </button>
      </form>
    </div>
  )
}

