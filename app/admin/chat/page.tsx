'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import {
  IconMessageCircle2, IconSend, IconChevronLeft, IconCalendarClock,
  IconUser, IconPhoto, IconHeart, IconCheck,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

// ── Types ──────────────────────────────────────────────
type Conversation = {
  id: string
  type: 'support' | 'appointment'
  title: string | null
  appointment_id: string | null
  patient_id: string
  last_message_at: string
  hw_users?: { first_name: string | null; last_name: string | null } | null
  unreadCount: number
}

type Message = {
  id: string; conversation_id: string; sender_id: string
  content: string; created_at: string; read_at: string | null
}

type PatientInfo = {
  first_name: string | null; last_name: string | null; title: string | null
  date_of_birth: string | null; blood_type: string | null; gender: string | null
}

type VitalsForm = {
  weight_kg: string; height_cm: string
  bp_systolic: string; bp_diastolic: string; pulse: string
  rr: string; spo2: string; drug_allergy: string; cc: string
}

const EMPTY_VITALS: VitalsForm = {
  weight_kg: '', height_cm: '', bp_systolic: '', bp_diastolic: '',
  pulse: '', rr: '', spo2: '', drug_allergy: '', cc: '',
}

// ── Helpers ────────────────────────────────────────────
function timeLabel(iso: string) {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'เมื่อกี้'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function patientName(c: Conversation) {
  if (c.hw_users?.first_name) return `${c.hw_users.first_name} ${c.hw_users.last_name ?? ''}`.trim()
  return 'ผู้ป่วย'
}

function calcAge(dob: string | null) {
  if (!dob) return null
  const d = new Date(dob), now = new Date()
  let y = now.getFullYear() - d.getFullYear()
  let m = now.getMonth() - d.getMonth()
  if (m < 0) { y--; m += 12 }
  return `${y} ปี ${m} เดือน`
}

function calcBmi(w: string, h: string) {
  const wn = parseFloat(w), hn = parseFloat(h) / 100
  if (!wn || !hn) return null
  return (wn / (hn * hn)).toFixed(1)
}

function MsgContent({ content, isAdmin }: { content: string; isAdmin: boolean }) {
  if (content.startsWith('__img__:')) {
    const url = content.slice(8)
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Image src={url} alt="รูปภาพ" width={220} height={165}
          className="rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" />
      </a>
    )
  }
  return (
    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
      isAdmin ? 'text-white rounded-br-sm' : 'bg-[var(--background)] border border-[var(--border)] rounded-bl-sm'
    }`} style={isAdmin ? { background: 'var(--hw-green)' } : {}}>
      {content}
    </div>
  )
}

function VField({ label, value, onChange, placeholder, half, unit }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; half?: boolean; unit?: string
}) {
  return (
    <div className={half ? 'flex-1' : 'w-full'}>
      <label className="block text-[10px] font-semibold text-[var(--muted)] mb-0.5 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="text" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '-'}
          className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] focus:outline-none focus:border-[#1a8a6e]"
        />
        {unit && <span className="text-xs text-[var(--muted)] flex-shrink-0">{unit}</span>}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────
export default function AdminChatPage() {
  const { user } = useAuth()
  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [convs, setConvs]       = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [uploading, setUploading] = useState(false)

  // vitals panel
  const [patInfo, setPatInfo]   = useState<PatientInfo | null>(null)
  const [vitals, setVitals]     = useState<VitalsForm>(EMPTY_VITALS)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [vitalsTab, setVitalsTab] = useState<'vitals'|'chat'>('chat') // mobile tab

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const active    = convs.find(c => c.id === activeId)

  // ── Load conversations ──────────────────────────────
  const loadConvs = useCallback(async () => {
    if (!user) return
    const { data: convData } = await sb.from('hw_conversations')
      .select('id, type, title, appointment_id, patient_id, last_message_at')
      .order('last_message_at', { ascending: false })
    if (!convData?.length) { setConvs([]); return }

    const convIds = convData.map(c => c.id)
    const [usersRes, msgsRes] = await Promise.all([
      sb.from('hw_users').select('id, first_name, last_name').in('id', [...new Set(convData.map(c => c.patient_id))]),
      sb.from('hw_messages').select('conversation_id, sender_id, read_at').in('conversation_id', convIds),
    ])
    const userMap = Object.fromEntries((usersRes.data ?? []).map(u => [u.id, u]))

    const patientSent = new Set<string>()
    const unreadMap: Record<string, number> = {}
    for (const msg of msgsRes.data ?? []) {
      const conv = convData.find(c => c.id === msg.conversation_id)
      if (!conv) continue
      if (msg.sender_id === conv.patient_id) {
        patientSent.add(msg.conversation_id)
        if (!msg.read_at) unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] ?? 0) + 1
      }
    }
    setConvs(
      convData
        .filter(c => patientSent.has(c.id))
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        .map(c => ({ ...c, hw_users: userMap[c.patient_id] ?? null, unreadCount: unreadMap[c.id] ?? 0 })) as Conversation[]
    )
  }, [user])

  useEffect(() => { loadConvs() }, [loadConvs])

  // ── Load messages + mark read ──────────────────────
  useEffect(() => {
    if (!activeId || !user) return
    sb.from('hw_messages').select('*').eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) || [])
        sb.from('hw_messages').update({ read_at: new Date().toISOString() })
          .eq('conversation_id', activeId).neq('sender_id', user.id).is('read_at', null)
          .then(() => loadConvs())
      })
  }, [activeId, user])

  // ── Load patient info + vitals ─────────────────────
  useEffect(() => {
    if (!activeId || !active) return
    setPatInfo(null)
    setVitals(EMPTY_VITALS)
    setSaved(false)

    async function load() {
      const pid = active!.patient_id
      const [uRes, bpRes, vRes] = await Promise.all([
        sb.from('hw_users').select('first_name,last_name,title,date_of_birth,blood_type,gender,weight,height,allergies').eq('id', pid).single(),
        sb.from('hw_bp_records').select('systolic,diastolic,pulse').eq('user_id', pid).order('measured_at', { ascending: false }).limit(1).maybeSingle(),
        sb.from('hw_vitals').select('*').eq('conversation_id', activeId).order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      if (uRes.data) setPatInfo(uRes.data as PatientInfo)

      // Priority: latest vitals record > hw_users/hw_bp_records
      const v = vRes.data
      setVitals({
        weight_kg:    v ? String(v.weight_kg ?? '')    : String(uRes.data?.weight ?? ''),
        height_cm:    v ? String(v.height_cm ?? '')    : String(uRes.data?.height ?? ''),
        bp_systolic:  v ? String(v.bp_systolic ?? '')  : String(bpRes.data?.systolic ?? ''),
        bp_diastolic: v ? String(v.bp_diastolic ?? '') : String(bpRes.data?.diastolic ?? ''),
        pulse:        v ? String(v.pulse ?? '')        : String(bpRes.data?.pulse ?? ''),
        rr:           v ? String(v.rr ?? '')           : '',
        spo2:         v ? String(v.spo2 ?? '')         : '',
        drug_allergy: v ? (v.drug_allergy ?? '')       : (uRes.data?.allergies ?? ''),
        cc:           v ? (v.cc ?? '')                 : '',
      })
    }
    load()
  }, [activeId, active?.patient_id])

  // ── Realtime messages ──────────────────────────────
  useEffect(() => {
    if (!activeId) return
    const ch = sb.channel(`admin-chat:${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hw_messages', filter: `conversation_id=eq.${activeId}` }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
        setConvs(prev => prev.map(c =>
          c.id === activeId ? { ...c, last_message_at: (payload.new as Message).created_at } : c
        ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()))
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [activeId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Send message ───────────────────────────────────
  async function sendMessage() {
    if (!input.trim() || !activeId || !user || sending) return
    setSending(true)
    const content = input.trim(); setInput('')
    await sb.from('hw_messages').insert({ conversation_id: activeId, sender_id: user.id, content })
    await sb.from('hw_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeId)
    setSending(false)
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeId || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const { data, error } = await sb.storage.from('chat-images').upload(`admin/${user.id}/${Date.now()}.${ext}`, file, { contentType: file.type })
    if (!error && data) {
      const { data: { publicUrl } } = sb.storage.from('chat-images').getPublicUrl(data.path)
      await sb.from('hw_messages').insert({ conversation_id: activeId, sender_id: user.id, content: `__img__:${publicUrl}` })
      await sb.from('hw_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeId)
    }
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
  }

  // ── Save vitals ────────────────────────────────────
  async function saveVitals() {
    if (!activeId || !active || !user || saving) return
    setSaving(true)
    const row = {
      conversation_id: activeId,
      patient_id: active.patient_id,
      recorded_by: user.id,
      weight_kg:    vitals.weight_kg    ? parseFloat(vitals.weight_kg)    : null,
      height_cm:    vitals.height_cm    ? parseFloat(vitals.height_cm)    : null,
      bp_systolic:  vitals.bp_systolic  ? parseInt(vitals.bp_systolic)    : null,
      bp_diastolic: vitals.bp_diastolic ? parseInt(vitals.bp_diastolic)   : null,
      pulse:        vitals.pulse        ? parseInt(vitals.pulse)           : null,
      rr:           vitals.rr           ? parseInt(vitals.rr)              : null,
      spo2:         vitals.spo2         ? parseFloat(vitals.spo2)          : null,
      drug_allergy: vitals.drug_allergy || null,
      cc:           vitals.cc           || null,
    }
    await sb.from('hw_vitals').insert(row)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── Vitals Panel ───────────────────────────────────
  const bmi = calcBmi(vitals.weight_kg, vitals.height_cm)

  const vitalsPanel = (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--card-bg)] border-l border-[var(--border)] w-full lg:w-[340px] xl:w-[380px] flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex-shrink-0" style={{ background: 'var(--hw-green)' }}>
        <div className="flex items-center gap-2">
          <IconHeart size={16} className="text-white" />
          <span className="text-sm font-bold text-white">{'ข้อมูลผู้รับบริการ'}</span>
        </div>
        {patInfo && (
          <div className="mt-1 text-white/90 text-xs">
            {`${patInfo.title ?? ''}${patInfo.first_name ?? ''} ${patInfo.last_name ?? ''}`.trim()}
            {calcAge(patInfo.date_of_birth) && <span className="ml-2 opacity-75">{`อายุ ${calcAge(patInfo.date_of_birth)}`}</span>}
            {patInfo.blood_type && <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold">{`หมู่เลือด ${patInfo.blood_type}`}</span>}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

        {/* Row: weight / height / BMI */}
        <div>
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5">{'สัญญาณชีพ'}</p>
          <div className="flex gap-2">
            <VField label="น้ำหนัก" unit="kg" half value={vitals.weight_kg} onChange={v => setVitals(p => ({ ...p, weight_kg: v }))} />
            <VField label="ส่วนสูง" unit="cm" half value={vitals.height_cm} onChange={v => setVitals(p => ({ ...p, height_cm: v }))} />
          </div>
          {bmi && (
            <div className="mt-1 text-xs text-[var(--muted)]">
              {'BMI '}<span className="font-semibold text-[var(--foreground)]">{bmi}</span>
              <span className="ml-1">{parseFloat(bmi) < 18.5 ? '(ต่ำกว่าเกณฑ์)' : parseFloat(bmi) < 25 ? '(ปกติ)' : parseFloat(bmi) < 30 ? '(น้ำหนักเกิน)' : '(อ้วน)'}</span>
            </div>
          )}
        </div>

        {/* Blood pressure */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-[var(--muted)] mb-0.5 uppercase tracking-wide">{'ความดัน (sys/dia)'}</label>
            <div className="flex items-center gap-1">
              <input type="text" inputMode="numeric" value={vitals.bp_systolic}
                onChange={e => setVitals(p => ({ ...p, bp_systolic: e.target.value }))}
                placeholder="120"
                className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] focus:outline-none focus:border-[#1a8a6e] text-center" />
              <span className="text-[var(--muted)] font-bold">/</span>
              <input type="text" inputMode="numeric" value={vitals.bp_diastolic}
                onChange={e => setVitals(p => ({ ...p, bp_diastolic: e.target.value }))}
                placeholder="80"
                className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] focus:outline-none focus:border-[#1a8a6e] text-center" />
              <span className="text-xs text-[var(--muted)] flex-shrink-0">{'mmHg'}</span>
            </div>
          </div>
          <VField label="ชีพจร" unit="bpm" value={vitals.pulse} onChange={v => setVitals(p => ({ ...p, pulse: v }))} half />
        </div>

        {/* RR / SpO2 */}
        <div className="flex gap-2">
          <VField label="RR" unit="/min" half placeholder="20" value={vitals.rr} onChange={v => setVitals(p => ({ ...p, rr: v }))} />
          <VField label="SpO2" unit="%" half placeholder="98" value={vitals.spo2} onChange={v => setVitals(p => ({ ...p, spo2: v }))} />
        </div>

        {/* Drug allergy */}
        <div>
          <label className="block text-[10px] font-semibold text-[var(--muted)] mb-0.5 uppercase tracking-wide">{'การแพ้ยา'}</label>
          <textarea value={vitals.drug_allergy} onChange={e => setVitals(p => ({ ...p, drug_allergy: e.target.value }))}
            placeholder="ระบุยาที่แพ้ หรือ ไม่มี"
            rows={2}
            className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] focus:outline-none focus:border-[#1a8a6e] resize-none" />
        </div>

        {/* CC */}
        <div>
          <label className="block text-[10px] font-semibold text-[var(--muted)] mb-0.5 uppercase tracking-wide">{'CC (อาการสำคัญ)'}</label>
          <textarea value={vitals.cc} onChange={e => setVitals(p => ({ ...p, cc: e.target.value }))}
            placeholder="อาการที่มาพบแพทย์..."
            rows={3}
            className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] focus:outline-none focus:border-[#1a8a6e] resize-none" />
        </div>
      </div>

      {/* Save */}
      <div className="px-4 py-3 border-t border-[var(--border)] flex-shrink-0">
        <button onClick={saveVitals} disabled={saving}
          className="w-full py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          style={{ background: saved ? '#059669' : 'var(--hw-green)' }}>
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : saved ? <IconCheck size={15} /> : null}
          {saving ? 'กำลังบันทึก...' : saved ? 'บันทึกแล้ว' : 'บันทึก Vitals'}
        </button>
      </div>
    </div>
  )

  // ── Chat panel ─────────────────────────────────────
  const chatPanel = (
    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
        <button onClick={() => setActiveId(null)} className="md:hidden p-1 text-[var(--muted)]">
          <IconChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{active ? patientName(active) : ''}</div>
          <div className="text-xs text-[var(--muted)]">{active?.type === 'support' ? 'ติดต่อคลินิก' : 'แชทนัดหมาย'}</div>
        </div>
        {/* Mobile: tab toggle */}
        <div className="flex lg:hidden gap-1 text-xs">
          <button onClick={() => setVitalsTab('chat')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${vitalsTab === 'chat' ? 'bg-[#1a8a6e] text-white' : 'text-[var(--muted)] hover:bg-[#e8f7f3]'}`}>
            {'แชท'}
          </button>
          <button onClick={() => setVitalsTab('vitals')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${vitalsTab === 'vitals' ? 'bg-[#1a8a6e] text-white' : 'text-[var(--muted)] hover:bg-[#e8f7f3]'}`}>
            {'Vitals'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Messages */}
        <div className={`flex flex-col flex-1 overflow-hidden min-w-0 ${vitalsTab === 'vitals' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-[var(--muted)] mt-10">{'ยังไม่มีข้อความ'}</div>
            )}
            {messages.map(msg => {
              const isAdmin = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  {!isAdmin && (
                    <div className="w-7 h-7 rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--muted)] text-[10px] mr-2 flex-shrink-0 self-end mb-1">
                      <IconUser size={13} />
                    </div>
                  )}
                  <div className="max-w-[72%]">
                    <MsgContent content={msg.content} isAdmin={isAdmin} />
                    <div className={`text-[10px] text-[var(--muted)] mt-0.5 ${isAdmin ? 'text-right' : ''}`}>
                      {timeLabel(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-end gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:text-[#1a8a6e] hover:border-[#1a8a6e] transition-colors disabled:opacity-40">
              {uploading
                ? <span className="w-4 h-4 border-2 border-[#1a8a6e] border-t-transparent rounded-full animate-spin" />
                : <IconPhoto size={17} />}
            </button>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={'ตอบกลับ... (Enter ส่ง)'}
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[#1a8a6e] max-h-28 overflow-y-auto"
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--hw-green)' }}>
              <IconSend size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Vitals panel - desktop always visible, mobile via tab */}
        <div className={`${vitalsTab === 'vitals' ? 'flex' : 'hidden'} lg:flex flex-col h-full`} style={{ width: 'var(--vitals-w, 340px)' }}>
          {vitalsPanel}
        </div>
      </div>
    </div>
  )

  // ── Render ─────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden" style={{ '--vitals-w': '340px' } as React.CSSProperties}>

      {/* Conversation list */}
      <div className={`flex flex-col border-r border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0 w-full md:w-64 ${activeId ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <IconMessageCircle2 size={18} className="text-[#1a8a6e]" />
            <h1 className="text-base font-bold">{'กล่องข้อความ'}</h1>
            <span className="ml-auto text-xs bg-[#1a8a6e] text-white px-2 py-0.5 rounded-full">{convs.length}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)] text-sm">{'ยังไม่มีการสนทนา'}</div>
          )}
          {convs.map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-4 py-3.5 border-b border-[var(--border)] hover:bg-[#e8f7f3] transition-colors ${activeId === c.id ? 'bg-[#e8f7f3]' : ''}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <IconUser size={13} className="text-[var(--muted)] flex-shrink-0" />
                <span className={`text-sm truncate flex-1 ${c.unreadCount > 0 ? 'font-bold' : 'font-semibold'}`}>{patientName(c)}</span>
                {c.unreadCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none animate-pulse">
                    {c.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {c.type === 'appointment' ? <IconCalendarClock size={10} className="text-[var(--muted)]" /> : <IconMessageCircle2 size={10} className="text-[var(--muted)]" />}
                <span className="text-xs text-[var(--muted)] truncate">
                  {c.type === 'support' ? 'ติดต่อคลินิก' : (c.title || 'แชทนัดหมาย')}
                  {' · '}{timeLabel(c.last_message_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      {activeId ? chatPanel : (
        <div className="hidden md:flex flex-1 items-center justify-center text-[var(--muted)]">
          <div className="text-center">
            <IconMessageCircle2 size={44} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm">{'เลือกการสนทนา'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
