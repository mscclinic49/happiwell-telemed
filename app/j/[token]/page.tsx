'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { IconAlertTriangle, IconLoader2, IconLock, IconVideo } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { bkkDate, bkkTime, dateLabel } from '@/lib/slots'

type Info = {
  status: string
  scheduled_at: string
  doctor: { full_name: string; specialty: string | null; avatar_url: string | null } | null
  patient: string
  needs_dob: boolean
}

// ลิงก์เข้าห้องปรึกษาที่ DocDesk ส่งทาง LINE — ไม่ต้องสมัครหรือล็อกอิน
export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [info, setInfo] = useState<Info | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dob, setDob] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/join/${token}`).then(async res => {
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setLoadError(data.error ?? 'ลิงก์นี้ใช้ไม่ได้')
      else setInfo(data)
    })
  }, [token])

  async function enter(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) return
    setBusy(true); setError(null)
    const res = await fetch(`/api/join/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, dob: info?.needs_dob ? dob : undefined }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error ?? 'เข้าห้องไม่สำเร็จ'); setBusy(false); return }

    // เครื่องที่ใช้ร่วมกัน: ออกจากบัญชีเดิมก่อน แล้วเข้าในชื่อคนไข้ของนัดนี้
    await supabase.auth.signOut()
    const { error: otpError } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: data.token_hash })
    if (otpError) { setError('เข้าห้องไม่สำเร็จ กรุณาลองใหม่'); setBusy(false); return }
    router.replace(`/consult/${data.appointment_id}`)
  }

  const date = info ? bkkDate(new Date(info.scheduled_at)) : null

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-start sm:items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Image src="/logo-hc.png" alt="HappiWell Clinic" width={140} height={49} className="mb-8 object-contain" priority />

        {loadError ? (
          <div role="alert">
            <IconAlertTriangle size={40} className="text-[var(--hw-orange)] mb-3" />
            <h1 className="font-display text-2xl font-semibold mb-2">{'เปิดลิงก์ไม่ได้'}</h1>
            <p className="text-sm text-[var(--muted)] mb-6">{`${loadError} หากยังต้องการปรึกษาแพทย์ กรุณาทักแชทคลินิกทาง LINE`}</p>
            <a href="https://line.me/R/ti/p/@p49clinic" className="inline-block px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#06C755]">{'แชทกับคลินิกทาง LINE'}</a>
          </div>
        ) : !info ? (
          <IconLoader2 size={28} className="animate-spin text-[var(--hw-green)]" />
        ) : info.status === 'cancelled' ? (
          <div>
            <h1 className="font-display text-2xl font-semibold mb-2">{'นัดนี้ถูกยกเลิกแล้ว'}</h1>
            <p className="text-sm text-[var(--muted)]">{'หากต้องการนัดใหม่ ทักแชทคลินิกทาง LINE @p49clinic ได้เลย'}</p>
          </div>
        ) : (
          <form onSubmit={enter}>
            <h1 className="font-display text-[1.7rem] font-semibold leading-tight mb-1">{'ห้องปรึกษาแพทย์ออนไลน์'}</h1>
            <p className="text-sm text-[var(--muted)] mb-6">{`สำหรับ ${info.patient}`}</p>

            <div className="flex items-center gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-5 mb-6">
              {info.doctor?.avatar_url ? (
                <Image src={info.doctor.avatar_url} alt="" width={56} height={56}
                  className="rounded-full object-cover object-top flex-shrink-0" style={{ width: 56, height: 56 }} />
              ) : <div className="w-14 h-14 rounded-full bg-[var(--hw-mint-bg)] flex-shrink-0" />}
              <div className="min-w-0">
                <div className="font-semibold truncate">{info.doctor?.full_name ?? 'แพทย์'}</div>
                <div className="text-sm text-[var(--muted)]">{info.doctor?.specialty}</div>
                <div className="font-display text-lg font-semibold mt-1 text-[var(--hw-green-dk)]">
                  {`${date === bkkDate() ? 'วันนี้' : dateLabel(date!)} ${bkkTime(info.scheduled_at)} น.`}
                </div>
              </div>
            </div>

            {info.needs_dob && (
              <div className="mb-5">
                <label htmlFor="dob" className="block text-sm font-semibold mb-1.5">{'ยืนยันตัวตน: วันเกิดของคุณ'}</label>
                <input id="dob" type="date" required value={dob} onChange={e => setDob(e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] border border-[var(--border)] bg-[var(--card-bg)] focus:outline-none focus:border-[var(--hw-green-dk)]" />
              </div>
            )}

            <label className="flex items-start gap-3 rounded-[14px] bg-[var(--hw-peach-bg)] p-4 mb-6 cursor-pointer text-sm">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 w-5 h-5 flex-shrink-0 accent-[var(--hw-green-dk)]" />
              <span>
                <IconLock size={14} className="inline -mt-0.5 mr-1 text-[var(--hw-orange)]" />
                {'ยินยอมให้คลินิกเก็บข้อมูลสุขภาพและบันทึกการปรึกษาเป็นเวชระเบียน ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล '}
                <Link href="/terms" target="_blank" className="underline">{'อ่านเงื่อนไข'}</Link>
              </span>
            </label>

            {error && <p role="alert" className="text-sm text-red-700 bg-[var(--hw-red-bg)] rounded-[12px] p-3 mb-4">{error}</p>}

            <button type="submit" disabled={!consent || busy || (info.needs_dob && !dob)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold bg-[var(--hw-primary)] text-[var(--hw-on-primary)] disabled:opacity-40">
              {busy ? <IconLoader2 size={18} className="animate-spin" /> : <IconVideo size={18} />}
              {busy ? 'กำลังเข้าห้อง' : 'เข้าห้องรอแพทย์'}
            </button>
            <p className="text-xs text-[var(--muted)] text-center mt-3">{'แนะนำให้ใช้คอมพิวเตอร์ที่มีกล้องและไมโครโฟน ผ่าน Chrome หรือ Edge'}</p>
          </form>
        )}
      </div>
    </main>
  )
}
