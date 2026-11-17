import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

const TITLES = ['นางสาว', 'น.ส.', 'นาย', 'นาง', 'ด.ช.', 'ด.ญ.', 'เด็กชาย', 'เด็กหญิง']

export type IncomingPatient = { name: string; phone?: string | null; hn?: string | null }

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

/** แยก "นายสมชาย ใจดี" → title/first/last */
export function splitThaiName(name: string) {
  let rest = name.trim().replace(/\s+/g, ' ')
  const title = TITLES.find(t => rest.startsWith(t)) ?? ''
  rest = rest.slice(title.length).trim()
  const [first, ...last] = rest.split(' ')
  return { title, first_name: first ?? '', last_name: last.join(' ') }
}

/**
 * หาคนไข้ telemed จาก HN ก่อน แล้วค่อยเบอร์โทร — ไม่เจอสร้างบัญชีใหม่แบบไม่มีรหัสผ่าน
 * (เข้าระบบผ่านลิงก์นัดเท่านั้น จนกว่าคนไข้จะตั้งรหัสผ่านเอง)
 */
export async function findOrCreatePatient(service: SupabaseClient, p: IncomingPatient): Promise<{ id: string; created: boolean }> {
  const hn = p.hn?.trim() || null
  const phone = digits(p.phone)
  if (hn) {
    const { data } = await service.from('hw_users').select('id').eq('hn', hn).eq('role', 'patient').limit(1).maybeSingle()
    if (data) return { id: data.id, created: false }
  }
  if (phone.length >= 9) {
    const { data } = await service.from('hw_users').select('id, phone').eq('role', 'patient').not('phone', 'is', null)
    const hit = (data ?? []).find(u => digits(u.phone) === phone)
    if (hit) {
      if (hn) await service.from('hw_users').update({ hn }).eq('id', hit.id)
      return { id: hit.id, created: false }
    }
  }

  const n = splitThaiName(p.name)
  const { data: created, error } = await service.auth.admin.createUser({
    email: `p-${randomBytes(6).toString('hex')}@guest.happiwellclinic.com`,
    email_confirm: true,
    user_metadata: {
      title: n.title, first_name: n.first_name, last_name: n.last_name,
      full_name: p.name.trim(), phone: p.phone ?? null, guest: true, created_by: 'docdesk',
    },
  })
  if (error || !created.user) throw new Error(error?.message ?? 'สร้างบัญชีคนไข้ไม่สำเร็จ')
  // แถว hw_users สร้างจาก trigger on_auth_user_created — เติม HN ทีหลัง
  if (hn) await service.from('hw_users').update({ hn }).eq('id', created.user.id)
  return { id: created.user.id, created: true }
}
