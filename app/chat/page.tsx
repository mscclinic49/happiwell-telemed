'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { IconMessageCircle2, IconSend, IconChevronLeft, IconCalendarClock } from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Conversation = {
  id: string
  type: 'support' | 'appointment'
  title: string | null
  appointment_id: string | null
  last_message_at: string
  last_msg?: string
  unread?: number
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
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

export default function ChatPage() {
  const { user } = useAuth()
  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [convs, setConvs] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const active = convs.find(c => c.id === activeId)

  // Load or create support conversation, then load all conversations
  useEffect(() => {
    if (!user) return
    async function init() {
      let { data: existing } = await sb
        .from('hw_conversations')
        .select('id')
        .eq('patient_id', user!.id)
        .eq('type', 'support')
        .maybeSingle()

      if (!existing) {
        const { data: created } = await sb
          .from('hw_conversations')
          .insert({ type: 'support', patient_id: user!.id, title: 'ติดต่อคลินิก' })
          .select('id')
          .single()
        existing = created
      }

      const { data } = await sb
        .from('hw_conversations')
        .select('id, type, title, appointment_id, last_message_at')
        .eq('patient_id', user!.id)
        .order('last_message_at', { ascending: false })

      setConvs((data as Conversation[]) || [])
      if (existing) setActiveId(existing.id)
    }
    init()
  }, [user])

  // Load messages for active conversation
  useEffect(() => {
    if (!activeId) return
    sb.from('hw_messages')
      .select('*')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []))
  }, [activeId])

  // Realtime subscription
  useEffect(() => {
    if (!activeId) return
    const channel = sb
      .channel(`chat:${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hw_messages',
        filter: `conversation_id=eq.${activeId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
        setConvs(prev => prev.map(c =>
          c.id === activeId ? { ...c, last_message_at: (payload.new as Message).created_at } : c
        ))
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [activeId])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !activeId || !user || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    await sb.from('hw_messages').insert({
      conversation_id: activeId,
      sender_id: user.id,
      content,
    })
    await sb.from('hw_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeId)
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const convLabel = (c: Conversation) =>
    c.type === 'support' ? 'ติดต่อคลินิก' : (c.title || 'แชทตามนัดหมาย')

  const isPatient = (msg: Message) => msg.sender_id === user?.id

  return (
    <div className="flex h-full overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)' }}>

      {/* Conversation list — hidden on mobile when chat open */}
      <div className={`flex flex-col border-r border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0 w-full md:w-72 ${activeId ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <IconMessageCircle2 size={18} className="text-[#1a8a6e]" />
            <h1 className="text-base font-bold">{'แชท'}</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-5 py-3.5 border-b border-[var(--border)] hover:bg-[#e8f7f3] transition-colors ${activeId === c.id ? 'bg-[#e8f7f3]' : ''}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                {c.type === 'appointment'
                  ? <IconCalendarClock size={14} className="text-[#1a8a6e] flex-shrink-0" />
                  : <IconMessageCircle2 size={14} className="text-[#1a8a6e] flex-shrink-0" />
                }
                <span className="font-semibold text-sm truncate">{convLabel(c)}</span>
              </div>
              <div className="text-xs text-[var(--muted)]">{timeLabel(c.last_message_at)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      {activeId ? (
        <div className={`flex flex-col flex-1 overflow-hidden ${!activeId ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
            <button
              onClick={() => setActiveId(null)}
              className="md:hidden p-1 text-[var(--muted)]"
            >
              <IconChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{active ? convLabel(active) : ''}</div>
              {active?.type === 'support' && (
                <div className="text-xs text-[var(--muted)]">{'เจ้าหน้าที่คลินิกแฮปปี้เวลล์'}</div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-[var(--muted)] mt-10">
                {'ส่งข้อความเพื่อเริ่มการสนทนา'}
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${isPatient(msg) ? 'justify-end' : 'justify-start'}`}>
                {!isPatient(msg) && (
                  <div className="w-7 h-7 rounded-full bg-[#1a8a6e] flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 self-end mb-1">
                    HC
                  </div>
                )}
                <div className={`max-w-[72%] ${isPatient(msg) ? '' : ''}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isPatient(msg)
                        ? 'text-white rounded-br-sm'
                        : 'bg-[var(--card-bg)] border border-[var(--border)] rounded-bl-sm'
                    }`}
                    style={isPatient(msg) ? { background: '#1a8a6e' } : {}}
                  >
                    {msg.content}
                  </div>
                  <div className={`text-[10px] text-[var(--muted)] mt-0.5 ${isPatient(msg) ? 'text-right' : 'text-left'}`}>
                    {timeLabel(msg.created_at)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={'พิมพ์ข้อความ...'}
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[#1a8a6e] max-h-28 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity hover:opacity-80"
              style={{ background: '#1a8a6e' }}
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
