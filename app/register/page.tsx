'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'

const TITLES = ['นาย', 'นาง', 'น.ส.', 'ด.ช.', 'ด.ญ.']

export default function RegisterPage() {
  const [title, setTitle] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fullName = `${title}${firstName} ${lastName}`.trim()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { title, first_name: firstName, last_name: lastName, full_name: fullName, date_of_birth: dateOfBirth, phone },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto flex flex-col items-center justify-center text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold mb-2">ตรวจสอบอีเมลของคุณ</h1>
        <p className="text-gray-600 dark:text-gray-400">
          ส่งลิงก์ยืนยันไปที่ <strong>{email}</strong> แล้ว
          <br />
          กรุณาคลิกลิงก์ในอีเมลเพื่อเข้าสู่ระบบ
        </p>
      </main>
    )
  }

  const inputClass = 'w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500'

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <div className="mt-10 mb-8 flex flex-col items-center">
        <Image src="/logo-transparent.png" alt="HappiWell Clinic" width={240} height={80} className="object-contain mb-6" priority />
        <h1 className="text-2xl font-bold">สมัครใช้งาน</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">คำนำหน้า</label>
          <select
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={`${inputClass} bg-white dark:bg-gray-800`}
          >
            <option value="">เลือกคำนำหน้า</option>
            {TITLES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">ชื่อ</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className={inputClass}
              placeholder="ชื่อจริง"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">นามสกุล</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className={inputClass}
              placeholder="นามสกุล"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">วันเกิด</label>
          <input
            type="date"
            required
            value={dateOfBirth}
            onChange={e => setDateOfBirth(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">เบอร์โทรศัพท์</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className={inputClass}
            placeholder="0812345678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">อีเมล</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputClass}
            placeholder="example@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputClass}
            placeholder="อย่างน้อย 8 ตัวอักษร"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-full font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'กำลังสมัคร...' : 'สมัครใช้งาน'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        มีบัญชีแล้ว?{' '}
        <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">เข้าสู่ระบบ</a>
      </p>
    </main>
  )
}
