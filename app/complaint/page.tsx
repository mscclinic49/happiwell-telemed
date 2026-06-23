'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

type Complaint = {
  id: string
  subject: string
  status: string
  created_at: string
  sla_deadline: string | null
  resolved_at: string | null
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:     { label: 'รอดำเนินการ', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' },
  in_progress: { label: 'กำลังดำเนินการ', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  resolved:    { label: 'แก้ไขแล้ว', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
}

export default function ComplaintPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/login'); return }

    supabase
      .from('hw_complaints')
      .select('id, subject, status, created_at, sla_deadline, resolved_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setComplaints(data || [])
        setLoadingList(false)
      })
  }, [user, authLoading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setFormError(null)

    const res = await fetch('/api/complaint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, detail }),
    })

    if (!res.ok) {
      const data = await res.json()
      setFormError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  const inputClass = 'w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500'

  if (authLoading || loadingList) {
    return <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">กำลังโหลด...</div>
  }

  return (
    <div className="max-w-xl mx-auto p-5 space-y-6 pb-6">
      <div className="pt-2">
        <h1 className="text-xl font-bold">ร้องเรียน / แจ้งปัญหา</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ทีมงานจะตอบกลับภายใน 30 วัน</p>
      </div>

      {/* ฟอร์มร้องเรียน */}
      {submitted ? (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <div className="font-semibold text-green-800 dark:text-green-300">รับเรื่องแล้ว</div>
          <div className="text-sm text-green-700 dark:text-green-400 mt-1">
            ทีมงานจะดำเนินการและแจ้งกลับภายใน 30 วัน
          </div>
          <button
            onClick={() => { setSubmitted(false); setSubject(''); setDetail('') }}
            className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ส่งเรื่องร้องเรียนเพิ่มเติม
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">หัวข้อ</label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className={inputClass}
              placeholder="สรุปปัญหาสั้นๆ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">รายละเอียด</label>
            <textarea
              required
              value={detail}
              onChange={e => setDetail(e.target.value)}
              rows={5}
              className={inputClass}
              placeholder="อธิบายปัญหาให้ละเอียด เช่น เกิดขึ้นเมื่อไหร่ มีผลกระทบอย่างไร"
            />
          </div>
          {formError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'กำลังส่ง...' : 'ส่งเรื่องร้องเรียน'}
          </button>
        </form>
      )}

      {/* ประวัติร้องเรียน */}
      {complaints.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">ประวัติการร้องเรียน</h2>
          <div className="space-y-2">
            {complaints.map(c => {
              const s = STATUS_LABEL[c.status] || STATUS_LABEL.pending
              const overSLA = c.sla_deadline && !c.resolved_at && new Date(c.sla_deadline) < new Date()
              return (
                <div key={c.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{c.subject}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        ส่งเมื่อ {new Date(c.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {c.sla_deadline && !c.resolved_at && (
                        <div className={`text-xs mt-0.5 ${overSLA ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                          {overSLA ? '⚠️ เกิน SLA แล้ว' : `กำหนดแล้วเสร็จ ${new Date(c.sla_deadline).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${s.color}`}>{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
