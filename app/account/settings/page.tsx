'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type ConsentRecord = {
  consent_type: string
  policy_version: string
  consented_at: string
  withdrawn_at: string | null
}

const CONSENT_LABELS: Record<string, string> = {
  general_data: 'ข้อมูลทั่วไป (ชื่อ, เบอร์โทร, อีเมล)',
  health_data: 'ข้อมูลสุขภาพ (Sensitive Data)',
  video_recording: 'การบันทึกวิดีโอ',
}

export default function AccountSettingsPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
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

  async function handleSignOut() {
    await signOut()
    router.push('/login')
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
    setConsents(prev =>
      prev.map(c => c.consent_type === consentType ? { ...c, withdrawn_at: now } : c)
    )
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
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <a href="/" className="text-teal-600 mb-4 inline-block">← กลับ</a>
      <h1 className="text-2xl font-bold mb-6">การตั้งค่าบัญชี</h1>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">ข้อมูลบัญชี</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase mb-1">อีเมล</div>
          <div className="font-medium">{user?.email}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">สถานะความยินยอม (PDPA)</h2>
        <div className="space-y-3">
          {consents.map(c => (
            <div key={c.consent_type} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="text-sm font-medium">
                    {CONSENT_LABELS[c.consent_type] || c.consent_type}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.withdrawn_at
                      ? `ถอนแล้ว: ${new Date(c.withdrawn_at).toLocaleDateString('th-TH')}`
                      : `ยินยอมเมื่อ: ${new Date(c.consented_at).toLocaleDateString('th-TH')}`
                    }
                  </div>
                </div>
                {!c.withdrawn_at && (
                  <button
                    onClick={() => handleWithdraw(c.consent_type)}
                    className="text-xs text-red-500 hover:underline flex-shrink-0"
                  >
                    ถอนความยินยอม
                  </button>
                )}
              </div>
            </div>
          ))}
          {consents.length === 0 && (
            <p className="text-sm text-gray-500">ไม่พบข้อมูลความยินยอม</p>
          )}
        </div>
      </section>

      <div className="space-y-3">
        <button
          onClick={handleSignOut}
          className="w-full border border-gray-300 text-gray-700 py-3 rounded-full font-medium hover:bg-gray-50"
        >
          ออกจากระบบ
        </button>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="w-full border border-red-300 text-red-600 py-3 rounded-full font-medium hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? 'กำลังลบ...' : 'ลบบัญชีถาวร'}
        </button>
      </div>
    </main>
  )
}
