// การเชื่อมกับ DocDesk (ระบบแชท/นัดของคลินิก) — ใช้รหัสลับร่วมกันทั้งสองทาง
import { timingSafeEqual } from 'crypto'

export const DOCDESK_URL = (process.env.DOCDESK_URL ?? 'https://docdesk-tau.vercel.app').replace(/\/$/, '')
const SECRET = process.env.DOCDESK_INTEGRATION_SECRET ?? ''

/** DocDesk → telemed: ตรวจ header x-docdesk-secret */
export function isFromDocdesk(req: Request): boolean {
  const got = req.headers.get('x-docdesk-secret') ?? ''
  if (!SECRET || !got) return false
  const a = Buffer.from(got), b = Buffer.from(SECRET)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** telemed → DocDesk */
export async function callDocdesk<T>(path: string, body: unknown): Promise<T> {
  if (!SECRET) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อม DocDesk')
  const res = await fetch(`${DOCDESK_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-telemed-secret': SECRET },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `DocDesk ${res.status}`)
  return data as T
}

export const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401 })
