'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { IconBrandLine, IconCircleCheckFilled, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react'
import { LIFF_ID, LINE_OA_URL } from '@/lib/line'

type State =
  | { step: 'working' }
  | { step: 'done'; inClient: boolean; isFriend: boolean | null }
  | { step: 'error'; message: string }

const CODE_KEY = 'hw-line-link-code'

function readCode(): string | null {
  const q = new URLSearchParams(window.location.search)
  const direct = q.get('code')
  if (direct) return direct
  // เปิดผ่าน liff.line.me ในเบราว์เซอร์ภายนอก: query จะมาใน liff.state
  const state = q.get('liff.state')
  if (state) {
    const inner = new URLSearchParams(state.includes('?') ? state.slice(state.indexOf('?')) : state)
    const c = inner.get('code')
    if (c) return c
  }
  return sessionStorage.getItem(CODE_KEY)
}

// หน้าที่เปิดใน LINE (LIFF) เพื่อผูกบัญชี LINE เข้ากับบัญชี HappiWell
export default function LineLinkPage() {
  const [state, setState] = useState<State>({ step: 'working' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      const fail = (message: string) => { if (!cancelled) setState({ step: 'error', message }) }
      if (!LIFF_ID) return fail('ระบบ LINE ยังไม่พร้อมใช้งาน กรุณาติดต่อคลินิก')

      const early = readCode()
      if (early) sessionStorage.setItem(CODE_KEY, early)

      const { default: liff } = await import('@line/liff')
      try {
        await liff.init({ liffId: LIFF_ID })
      } catch {
        return fail('เปิดหน้าเชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่')
      }
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href })
        return
      }

      const code = readCode()
      if (!code) return fail('ไม่พบรหัสเชื่อมต่อ กรุณากด “เชื่อมต่อ LINE” ใหม่จากในแอป HappiWell')
      const idToken = liff.getIDToken()
      if (!idToken) return fail('ไม่ได้รับสิทธิ์อ่านข้อมูลบัญชี LINE กรุณาลองใหม่')

      const res = await fetch('/api/line/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, idToken }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return fail(data.error ?? 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่')
      sessionStorage.removeItem(CODE_KEY)

      let isFriend: boolean | null = null
      try { isFriend = (await liff.getFriendship()).friendFlag } catch { /* ไม่ได้ผูก OA กับ LIFF */ }
      if (!cancelled) setState({ step: 'done', inClient: liff.isInClient(), isFriend })
    }
    run()
    return () => { cancelled = true }
  }, [])

  async function close() {
    const { default: liff } = await import('@line/liff')
    liff.closeWindow()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[var(--background)]">
      <div className="w-full max-w-sm text-center">
        <Image src="/logo-hc.png" alt="HappiWell Clinic" width={132} height={46} className="mx-auto mb-8 object-contain" priority />

        {state.step === 'working' && (
          <div role="status">
            <IconLoader2 size={36} className="mx-auto mb-4 text-[var(--hw-green)] animate-spin" />
            <p className="font-semibold">{'กำลังเชื่อมต่อบัญชี LINE'}</p>
          </div>
        )}

        {state.step === 'done' && (
          <div>
            <IconCircleCheckFilled size={48} className="mx-auto mb-3 text-[var(--hw-green)]" />
            <h1 className="font-display text-2xl font-semibold mb-2">{'เชื่อมต่อ LINE แล้ว'}</h1>
            <p className="text-sm text-[var(--muted)] mb-6">{'เราจะส่งยืนยันนัด เตือนก่อนถึงเวลา และลิงก์เข้าห้องปรึกษาทาง LINE @p49clinic'}</p>
            {state.isFriend === false && (
              <a href={LINE_OA_URL}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-white mb-3 bg-[#06C755]">
                <IconBrandLine size={20} />{'เพิ่มเพื่อน @p49clinic เพื่อรับข้อความ'}
              </a>
            )}
            {state.inClient ? (
              <button onClick={close} className="w-full py-3 rounded-full font-semibold border border-[var(--border)]">{'ปิดหน้านี้'}</button>
            ) : (
              <Link href="/" className="block w-full py-3 rounded-full font-semibold border border-[var(--border)]">{'กลับไปที่ HappiWell'}</Link>
            )}
          </div>
        )}

        {state.step === 'error' && (
          <div role="alert">
            <IconAlertTriangle size={44} className="mx-auto mb-3 text-[var(--hw-orange)]" />
            <h1 className="font-display text-xl font-semibold mb-2">{'เชื่อมต่อไม่สำเร็จ'}</h1>
            <p className="text-sm text-[var(--muted)]">{state.message}</p>
          </div>
        )}
      </div>
    </main>
  )
}
