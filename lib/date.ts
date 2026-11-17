// วันเวลาแบบ Bangkok (UTC+7) และตัวช่วยคำนวณ — ใช้ร่วมกันทั้งแอป
const YEAR_MS = 1000 * 60 * 60 * 24 * 365.25

/** อายุเต็มปีจากวันเกิด (null ถ้าไม่มีวันเกิด) */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / YEAR_MS)
}

/** จำนวนมิลลิวินาทีจากตอนนี้ถึงวันที่ที่ให้ (ติดลบถ้าผ่านไปแล้ว) */
export function msUntil(date: string | Date): number {
  return new Date(date).getTime() - Date.now()
}
