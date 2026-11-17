// ช่องเวลานัดหมาย — ใช้ร่วมกันทั้งหน้าจอง (แสดงผล) และ API (ตรวจสอบซ้ำฝั่งเซิร์ฟเวอร์)
// เวลาทั้งหมดคิดเป็นเวลาไทย (UTC+7) — วันที่เก็บเป็นสตริง 'YYYY-MM-DD'

export const SLOT_MINUTES = 15
export const BOOKING_DAYS = 14          // จองล่วงหน้าได้ไม่เกิน 14 วัน (รวมวันนี้)
export const MIN_LEAD_MINUTES = 30      // ต้องจองก่อนเวลานัดอย่างน้อย 30 นาที
export const CANCEL_LEAD_MINUTES = 60   // ยกเลิกเองได้ถึง 1 ชม. ก่อนนัด
export const JOIN_EARLY_MINUTES = 15    // เปิดปุ่มเข้าห้องก่อนเวลานัด 15 นาที
export const LUNCH = { start: '12:00', end: '13:00' } // พักกลางวันคลินิก

const BKK_OFFSET_MS = 7 * 3600_000

export type ScheduleRow = {
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean | null
}

export type Slot = { time: string; iso: string; booked: boolean; past: boolean }

export const DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
export const DAY_LONG = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
export const MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** วันที่ไทย 'YYYY-MM-DD' ของเวลาที่ให้ */
export function bkkDate(at: Date = new Date()): string {
  return new Date(at.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10)
}

/** เวลาไทย 'HH:MM' ของเวลาที่ให้ */
export function bkkTime(at: Date | string): string {
  return new Date(new Date(at).getTime() + BKK_OFFSET_MS).toISOString().slice(11, 16)
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

export function slotIso(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00+07:00`).toISOString()
}

/** ป้ายวันที่ภาษาไทย เช่น "พฤ. 19 พ.ย." */
export function dateLabel(date: string, long = false): string {
  const [, m, d] = date.split('-').map(Number)
  const dow = dayOfWeek(date)
  return long
    ? `วัน${DAY_LONG[dow]}ที่ ${d} ${MONTH_SHORT[m - 1]} ${Number(date.slice(0, 4)) + 543}`
    : `${DAY_SHORT[dow]} ${d} ${MONTH_SHORT[m - 1]}`
}

function scheduleFor(date: string, schedules: ScheduleRow[]) {
  const dow = dayOfWeek(date)
  return schedules.find(s => s.day_of_week === dow && s.is_available !== false) ?? null
}

/** เวลาเริ่มทุกช่องของวันนั้นตามตารางแพทย์ (ไม่รวมช่วงพักกลางวัน) */
export function dayTimes(date: string, schedules: ScheduleRow[]): string[] {
  const s = scheduleFor(date, schedules)
  if (!s) return []
  const start = toMin(s.start_time), end = toMin(s.end_time)
  const lunchStart = toMin(LUNCH.start), lunchEnd = toMin(LUNCH.end)
  const out: string[] = []
  for (let m = start; m + SLOT_MINUTES <= end; m += SLOT_MINUTES) {
    if (m < lunchEnd && m + SLOT_MINUTES > lunchStart) continue
    out.push(toHHMM(m))
  }
  return out
}

/** วันที่จองได้ทั้งหมดในช่วง BOOKING_DAYS วัน */
export function bookingDates(schedules: ScheduleRow[], now: Date = new Date()) {
  const today = bkkDate(now)
  return Array.from({ length: BOOKING_DAYS }, (_, i) => {
    const date = addDays(today, i)
    const open = daySlots(date, schedules, new Set(), now).some(s => !s.past)
    return { date, open }
  })
}

/** ช่องเวลาของวันนั้น พร้อมสถานะว่าถูกจอง/เลยเวลาแล้ว */
export function daySlots(date: string, schedules: ScheduleRow[], bookedMs: Set<number>, now: Date = new Date(), leadMinutes = MIN_LEAD_MINUTES): Slot[] {
  const cutoff = now.getTime() + leadMinutes * 60_000
  return dayTimes(date, schedules).map(time => {
    const iso = slotIso(date, time)
    const ms = new Date(iso).getTime()
    return { time, iso, booked: bookedMs.has(ms), past: ms < cutoff }
  })
}

/** ตรวจซ้ำฝั่งเซิร์ฟเวอร์ว่าเวลาที่ส่งมาเป็นช่องที่จองได้จริง */
export function isBookableSlot(iso: string, schedules: ScheduleRow[], now: Date = new Date(), leadMinutes = MIN_LEAD_MINUTES): boolean {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return false
  const date = bkkDate(at)
  const today = bkkDate(now)
  if (date < today || date > addDays(today, BOOKING_DAYS - 1)) return false
  if (at.getTime() < now.getTime() + leadMinutes * 60_000) return false
  return dayTimes(date, schedules).includes(bkkTime(at)) && at.getUTCSeconds() === 0 && at.getUTCMilliseconds() === 0
}
