// การตั้งค่า LINE — LIFF ID มาจาก LINE Login channel ที่อยู่ provider เดียวกับ LINE OA @p49clinic
// (userId ถึงจะตรงกับที่ OA ใช้ส่งข้อความ)
export const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? ''
export const LINE_OA_URL = 'https://line.me/R/ti/p/@p49clinic'

/** Channel ID ของ LINE Login = ส่วนหน้าของ LIFF ID (รูปแบบ "<channelId>-<suffix>") */
export function lineLoginChannelId(): string {
  return LIFF_ID.split('-')[0] ?? ''
}
