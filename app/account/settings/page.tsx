'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconShieldCheck,
  IconTrash,
  IconMessageCircle2,
  IconChevronRight,
  IconToggleRight,
  IconToggleLeft,
  IconUser,
  IconCircleCheck,
  IconAlertCircle,
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
  { id: 'username',   label: 'ชื่อผู้ใช้ (Username)', Icon: IconUser },
  { id: 'consent',   label: 'ความยินยอม PDPA', Icon: IconShieldCheck },
  { id: 'complaint', label: 'ร้องเรียน / แจ้งปัญหา', Icon: IconMessageCircle2 },
  { id: 'danger',    label: 'ลบบัญชี', Icon: IconTrash },
]

export default function AccountSettingsPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('username')
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [deleting, setDeleting] = useState(false)

  // Username state
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [taken, setTaken]       = useState(false)
  const [savingUn, setSavingUn] = useState(false)
  const [savedUn, setSavedUn]   = useState(false)
  const [unError, setUnError]   = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return
    // Load consent records
    supabase
      .from('hw_consent_records')
      .select('consent_type, policy_version, consented_at, withdrawn_at')
      .eq('user_id', user.id)
      .then(({ data }) => setConsents(data || []))
    // Load current username
    supabase.from('hw_users').select('username').eq('id', user.id).single()
      .then(({ data }) => {
        const u = data?.username ?? ''
        setCurrentUsername(u)
        setUsername(u)
      })
  }, [user])

  // Debounced username availability check
  function handleUsernameChange(val: string) {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_.]/g, '')
    setUsername(cleaned)
    setSavedUn(false)
    setUnError(null)
    setTaken(false)
    if (!cleaned || cleaned === currentUsername) { setChecking(false); return }
    setChecking(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.rpc('is_username_taken', {
        p_username: cleaned,
        p_exclude_user_id: user!.id,
      })
      setTaken(!!data)
      setChecking(false)
    }, 500)
  }

  async function saveUsername() {
    if (!user || !username || taken || username.length < 3) return
    setSavingUn(true)
    setUnError(null)
    const { error } = await supabase.from('hw_users').update({ username }).eq('id', user.id)
    if (error) {
      setUnError(error.message.includes('unique') ? 'username นี้ถูกใช้แล้ว' : 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } else {
      setCurrentUsername(username)
      setSavedUn(true)
    }
    setSavingUn(false)
  }

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
                      ? 'text-[var(--hw-green-dk)] font-semibold'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hw-mint-bg)]'
                  }`}
                  style={activeSection === id ? { background: 'var(--hw-mint-bg)' } : {}}
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

          {/* Username panel */}
          {activeSection === 'username' && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[14px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h2 className="font-bold text-base">{'ชื่อผู้ใช้ (Username)'}</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">{'ใช้สำหรับเข้าสู่ระบบแทนอีเมล ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข _ หรือ . เท่านั้น'}</p>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{'Username'}</label>
                  <div className="relative">
                    <input
                      type="text" value={username} onChange={e => handleUsernameChange(e.target.value)}
                      placeholder={'เช่น somchai_99'}
                      maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      className="w-full pl-10 pr-10 py-3 rounded-[10px] border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--hw-green-dk)] transition-colors"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm font-semibold select-none">{'@'}</span>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checking && <span className="w-4 h-4 border-2 border-[var(--hw-green-dk)] border-t-transparent rounded-full animate-spin block" />}
                      {!checking && username && username !== currentUsername && !taken && username.length >= 3 && <IconCircleCheck size={17} className="text-[var(--hw-green-dk)]" />}
                      {!checking && taken && <IconAlertCircle size={17} className="text-red-500" />}
                    </span>
                  </div>

                  {/* Status messages */}
                  {username.length > 0 && username.length < 3 && (
                    <p className="text-xs text-[var(--muted)] mt-1">{'ต้องมีอย่างน้อย 3 ตัวอักษร'}</p>
                  )}
                  {taken && <p className="text-xs text-red-500 mt-1">{'Username นี้ถูกใช้แล้ว กรุณาเลือกใหม่'}</p>}
                  {!checking && !taken && username && username !== currentUsername && username.length >= 3 && (
                    <p className="text-xs text-[var(--hw-green-dk)] mt-1">{'Username นี้ใช้ได้'}</p>
                  )}
                  {username === currentUsername && username && (
                    <p className="text-xs text-[var(--muted)] mt-1">{'Username ปัจจุบันของคุณ'}</p>
                  )}
                </div>

                {unError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-4 py-3">{unError}</div>
                )}
                {savedUn && (
                  <div className="text-sm text-[var(--hw-green-dk)] bg-[var(--hw-mint-bg)] border border-[#b2dfd3] rounded-[10px] px-4 py-3 flex items-center gap-2">
                    <IconCircleCheck size={16} />{'บันทึก Username เรียบร้อยแล้ว'}
                  </div>
                )}

                <button
                  onClick={saveUsername}
                  disabled={savingUn || !username || taken || checking || username.length < 3 || username === currentUsername}
                  className="w-full py-3 rounded-full font-semibold text-white text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
                  style={{ background: 'var(--hw-green-dk)' }}>
                  {savingUn ? 'กำลังบันทึก...' : 'บันทึก Username'}
                </button>

                <div className="rounded-[10px] bg-[var(--background)] border border-[var(--border)] px-4 py-3">
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    {'หลังตั้ง Username แล้ว สามารถใช้ '}<span className="font-semibold text-[var(--foreground)]">{'@username'}</span>{' แทนอีเมลในการเข้าสู่ระบบได้ทันที'}
                  </p>
                </div>
              </div>
            </div>
          )}

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
                          ? <IconToggleRight size={32} className="text-[var(--hw-green-dk)]" />
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
                  style={{ background: 'var(--hw-green)' }}
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

