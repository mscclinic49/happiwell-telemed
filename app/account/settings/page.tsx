'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconShieldCheck,
  IconTrash,
  IconMessageCircle2,
  IconChevronRight,
  IconToggleRight,
  IconToggleLeft,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type ConsentRecord = {
  consent_type: string
  policy_version: string
  consented_at: string
  withdrawn_at: string | null
}

const CONSENT_LABELS: Record<string, { label: string; desc: string }> = {
  general_data:    { label: 'ข้อมูลทั่วไป', desc: 'ชื่อ เบอร์โทร อีเมล และข้อมูลติดต่อ' },
  health_data:     { label: 'ข้อมูลสุขภาพ', desc: 'ข้อมูลการวินิจฉัยและประวัติการรักษา (Sensitive Data)' },
  video_recording: { label: 'บันทึกวิดีโอ', desc: 'การบันทึกวิดีโอเพื่อเก็บเป็นเวชระเบียน' },
}

const SECTIONS = [
  { id: 'consent',    label: 'ความยินยอม PDPA', Icon: IconShieldCheck },
  { id: 'complaint',  label: 'ร้องเรียน / แจ้งปัญหา', Icon: IconMessageCircle2 },
  { id: 'danger',     label: 'ลบบัญชี', Icon: IconTrash },
]

export default function AccountSettingsPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('consent')
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('hw_consent_records')
      .select('consent_type, policy_version, consented_at, withdrawn_at')
      .eq('user_id', user.id)
      .then(({ data }) => setConsents(data || []))
  }, [user])

  async function handleWithdraw(consentType: string) {
    if (!confirm('ถอนความยินยอมนี้จะส่งผลต่อการใช้บริการ ยืนยันหรือไม่?')) return
    const now = new Date().toISOString()
    await supabase
      .from('hw_consent_records')
      .update({ withdrawn_at: now })
      .eq('user_id', user!.id)
      .eq('consent_type', consentType)
      .is('withdrawn_at', null)
    setConsents(prev => prev.map(c => c.consent_type === consentType ? { ...c, withdrawn_at: now } : c))
  }

  async function handleDeleteAccount() {
    if (!confirm('ลบบัญชีถาวร ข้อมูลทั้งหมดจะถูกลบ ยืนยันหรือไม่?')) return
    setDeleting(true)
    const res = await fetch('/api/auth/delete-account', { method: 'DELETE' })
    if (res.ok) {
      await signOut()
      router.push('/register')
    } else {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 pb-8">
      <h1 className="text-xl font-bold mb-6">{'การตั้งค่าบัญชี'}</h1>

      <div className="md:grid md:grid-cols-[200px_1fr] md:gap-6">

        {/* Sidebar nav */}
        <aside className="mb-4 md:mb-0">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-xs text-[var(--muted)] uppercase tracking-widest font-semibold">{'บัญชีของฉัน'}</div>
              <div className="font-medium text-sm mt-0.5 truncate">{user?.email}</div>
            </div>
            <nav className="p-2">
              {SECTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors text-left ${
                    activeSection === id
                      ? 'text-[#1a8a6e] font-semibold'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[#e8f7f3]'
                  }`}
                  style={activeSection === id ? { background: '#e8f7f3' } : {}}
                >
                  <Icon size={16} strokeWidth={activeSection === id ? 2.2 : 1.8} />
                  <span className="flex-1">{label}</span>
                  {activeSection !== id && <IconChevronRight size={14} className="opacity-40" />}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content panel */}
        <div>

          {/* Consent panel */}
          {activeSection === 'consent' && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h2 className="font-bold text-base">{'ความยินยอม PDPA'}</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">{'จัดการสิทธิ์การใช้ข้อมูลส่วนบุคคลของคุณ'}</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {Object.entries(CONSENT_LABELS).map(([type, { label, desc }]) => {
                  const record = consents.find(c => c.consent_type === type)
                  const active = record && !record.withdrawn_at
                  return (
                    <div key={type} className="flex items-start gap-4 px-5 py-4">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{label}</div>
                        <div className="text-xs text-[var(--muted)] mt-0.5">{desc}</div>
                        {record && (
                          <div className="text-xs text-[var(--muted)] mt-1">
                            {record.withdrawn_at
                              ? `ถอนแล้ว: ${new Date(record.withdrawn_at).toLocaleDateString('th-TH')}`
                              : `ยินยอมเมื่อ: ${new Date(record.consented_at).toLocaleDateString('th-TH')}`}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => active && handleWithdraw(type)}
                        className="flex-shrink-0 mt-0.5"
                        title={active ? 'ถอนความยินยอม' : 'ยังไม่ได้ให้ความยินยอม'}
                      >
                        {active
                          ? <IconToggleRight size={32} className="text-[#1a8a6e]" />
                          : <IconToggleLeft size={32} className="text-[var(--muted)]" />
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Complaint panel */}
          {activeSection === 'complaint' && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h2 className="font-bold text-base">{'ร้องเรียน / แจ้งปัญหา'}</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">{'ทีมงานจะตอบกลับภายใน 30 วัน'}</p>
              </div>
              <div className="px-5 py-6">
                <a
                  href="/complaint"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: '#1a8a6e' }}
                >
                  <IconMessageCircle2 size={16} />
                  {'ส่งเรื่องร้องเรียน'}
                </a>
              </div>
            </div>
          )}

          {/* Danger zone */}
          {activeSection === 'danger' && (
            <div className="bg-[var(--card-bg)] border border-red-200 dark:border-red-900 rounded-[14px] overflow-hidden">
              <div className="px-5 py-4 border-b border-red-100 dark:border-red-900">
                <h2 className="font-bold text-base text-red-600">{'โซนอันตราย'}</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">{'การกระทำเหล่านี้ไม่สามารถย้อนกลับได้'}</p>
              </div>
              <div className="px-5 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{'ลบบัญชีถาวร'}</div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {'ข้อมูลทั้งหมดจะถูกลบออกจากระบบอย่างถาวร ไม่สามารถกู้คืนได้'}
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold text-red-600 border border-red-300 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  >
                    {deleting ? 'กำลังลบ...' : 'ลบบัญชี'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
