'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { IconMessageCircle2, IconSend, IconChevronLeft, IconCalendarClock, IconUser } from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Conversation = {
  id: string
  type: 'support' | 'appointment'
  title: string | null
  appointment_id: string | null
  patient_id: string
  last_message_at: string
  hw_users?: { first_name: string | null; last_name: string | null } | null
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

function timeLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
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

export default function AdminChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [checking, setChecking] = useState(true)
  const [convs, setConvs] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const active = convs.find(c => c.id === activeId)

  // Check admin role
  useEffect(() => {
    if (!user) return
    sb.from('hw_users').select('role').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.role !== 'admin') router.replace('/')
        else setChecking(false)
      })
  }, [user])

  // Load all conversations
  useEffect(() => {
    if (checking) return
    sb.from('hw_conversations')
      .select('id, type, title, appointment_id, patient_id, last_message_at, hw_users(first_name, last_name)')
      .order('last_message_at', { ascending: false })
      .then(({ data }) => setConvs((data as unknown as Conversation[]) || []))
  }, [checking])

  // Load messages for active
  useEffect(() => {
    if (!activeId) return
    sb.from('hw_messages')
      .select('*')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []))
  }, [activeId])

  // Realtime
  useEffect(() => {
    if (!activeId) return
    const channel = sb
      .channel(`admin-chat:${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'hw_messages',
        filter: `conversation_id=eq.${activeId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
        setConvs(prev => prev.map(c =>
          c.id === activeId ? { ...c, last_message_at: (payload.new as Message).created_at } : c
        ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()))
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [activeId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!input.trim() || !activeId || !user || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    await sb.from('hw_messages').insert({ conversation_id: activeId, sender_id: user.id, content })
    await sb.from('hw_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeId)
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (checking) return null

  return (
    <div className="flex h-full overflow-hidden" style={{ maxHeight: 'calc(100vh - 60px)' }}>

      {/* Conversation list */}
      <div className={`flex flex-col border-r border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0 w-full md:w-72 ${activeId ? 'hidden md:flex' : 'flex'}`}>
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
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-5 py-3.5 border-b border-[var(--border)] hover:bg-[#e8f7f3] transition-colors ${activeId === c.id ? 'bg-[#e8f7f3]' : ''}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <IconUser size={14} className="text-[var(--muted)] flex-shrink-0" />
                <span className="font-semibold text-sm truncate">{patientName(c)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {c.type === 'appointment'
                  ? <IconCalendarClock size={11} className="text-[var(--muted)]" />
                  : <IconMessageCircle2 size={11} className="text-[var(--muted)]" />
                }
                <span className="text-xs text-[var(--muted)] truncate">
                  {c.type === 'support' ? 'ติดต่อคลินิก' : (c.title || 'แชทนัดหมาย')}
                  {' · '}{timeLabel(c.last_message_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      {activeId ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
            <button onClick={() => setActiveId(null)} className="md:hidden p-1 text-[var(--muted)]">
              <IconChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{active ? patientName(active) : ''}</div>
              <div className="text-xs text-[var(--muted)]">
                {active?.type === 'support' ? 'ติดต่อคลินิก' : 'แชทนัดหมาย'}
              </div>
            </div>
          </div>

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
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isAdmin
                          ? 'text-white rounded-br-sm'
                          : 'bg-[var(--card-bg)] border border-[var(--border)] rounded-bl-sm'
                      }`}
                      style={isAdmin ? { background: 'var(--hw-green)' } : {}}
                    >
                      {msg.content}
                    </div>
                    <div className={`text-[10px] text-[var(--muted)] mt-0.5 ${isAdmin ? 'text-right' : 'text-left'}`}>
                      {timeLabel(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-end gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={'ตอบกลับ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)'}
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[#1a8a6e] max-h-28 overflow-y-auto"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--hw-green)' }}
            >
              <IconSend size={16} className="text-white" />
            </button>
          </div>
        </div>
      ) : (
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

