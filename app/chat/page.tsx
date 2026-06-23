'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  IconMessageCircle2, IconSend, IconChevronLeft, IconCalendarClock, IconAlertCircle,
} from '@tabler/icons-react'
import { useAuth } from '@/lib/auth-context'

type Conversation = {
  id: string; type: 'support' | 'appointment'
  title: string | null; appointment_id: string | null; last_message_at: string
}
type Message = {
  id: string; conversation_id: string; sender_id: string
  content: string; created_at: string; read_at: string | null
}

function timeLabel(iso: string) {
  const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'เมื่อกี้'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาที`
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function convLabel(c: Conversation) {
  return c.type === 'support' ? 'ติดต่อคลินิก' : (c.title || 'แชทนัดหมาย')
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
  const [initError, setInitError] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const active = convs.find(c => c.id === activeId)

  // Init: get or create support conversation
  useEffect(() => {
    if (!user) return
    async function init() {
      // Check existing support conversation
      const { data: existing, error: selErr } = await sb
        .from('hw_conversations').select('id')
        .eq('patient_id', user!.id).eq('type', 'support').maybeSingle()

      if (selErr) { setInitError(selErr.message); return }

      let convId: string | null = existing?.id ?? null

      if (!convId) {
        const { data: created, error: insErr } = await sb
          .from('hw_conversations')
          .insert({ type: 'support', patient_id: user!.id, title: 'ติดต่อคลินิก' })
          .select('id').single()
        if (insErr) { setInitError(insErr.message); return }
        convId = created?.id ?? null
      }

      // Load all conversations
      const { data: list } = await sb
        .from('hw_conversations').select('id, type, title, appointment_id, last_message_at')
        .eq('patient_id', user!.id).order('last_message_at', { ascending: false })
      setConvs((list as Conversation[]) || [])

      if (convId) {
        setActiveId(convId)
        setShowList(false)
      }
    }
    init()
  }, [user])

  // Load messages
  useEffect(() => {
    if (!activeId) return
    sb.from('hw_messages').select('*').eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []))
  }, [activeId])

  // Realtime
  useEffect(() => {
    if (!activeId) return
    const ch = sb.channel(`chat:${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'hw_messages',
        filter: `conversation_id=eq.${activeId}`,
      }, payload => {
        setMessages(prev => {
          if (prev.some(m => m.id === (payload.new as Message).id)) return prev
          return [...prev, payload.new as Message]
        })
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [activeId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || !activeId || !user || sending) return
    setSending(true)
    setInput('')
    const { error } = await sb.from('hw_messages').insert({
      conversation_id: activeId, sender_id: user.id, content: text,
    })
    if (!error) {
      await sb.from('hw_conversations')
        .update({ last_message_at: new Date().toISOString() }).eq('id', activeId)
      setConvs(prev => prev.map(c =>
        c.id === activeId ? { ...c, last_message_at: new Date().toISOString() } : c
      ))
    }
    setSending(false)
  }, [input, activeId, user, sending])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function openConv(id: string) { setActiveId(id); setShowList(false) }

  if (initError) {
    return (
      <div className="max-w-lg mx-auto px-5 py-12 text-center">
        <IconAlertCircle size={36} className="mx-auto mb-3 text-red-400" />
        <p className="text-sm text-red-600 font-medium">{'ไม่สามารถโหลดแชทได้'}</p>
        <p className="text-xs text-[var(--muted)] mt-1">{initError}</p>
      </div>
    )
  }

  // ── Shared panel styles ──
  const listPanel = (
    <div className="flex flex-col bg-[var(--card-bg)] border-r border-[var(--border)] w-full md:w-72 md:flex-shrink-0 h-full">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2 flex-shrink-0">
        <IconMessageCircle2 size={18} className="text-[#1a8a6e]" />
        <h1 className="text-base font-bold">{'แชท'}</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        {convs.length === 0 && (
          <div className="text-center py-12 text-[var(--muted)] text-sm">{'กำลังโหลด...'}</div>
        )}
        {convs.map(c => (
          <button key={c.id} onClick={() => openConv(c.id)}
            className={`w-full text-left px-5 py-3.5 border-b border-[var(--border)] hover:bg-[#e8f7f3] transition-colors ${activeId === c.id ? 'bg-[#e8f7f3]' : ''}`}>
            <div className="flex items-center gap-2 mb-0.5">
              {c.type === 'appointment'
                ? <IconCalendarClock size={13} className="text-[#1a8a6e] flex-shrink-0" />
                : <IconMessageCircle2 size={13} className="text-[#1a8a6e] flex-shrink-0" />}
              <span className="font-semibold text-sm truncate">{convLabel(c)}</span>
            </div>
            <div className="text-xs text-[var(--muted)]">{timeLabel(c.last_message_at)}</div>
          </button>
        ))}
      </div>
    </div>
  )

  const chatPanel = activeId ? (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
        <button onClick={() => setShowList(true)} className="md:hidden p-1 text-[var(--muted)] -ml-1">
          <IconChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{active ? convLabel(active) : ''}</div>
          {active?.type === 'support' && (
            <div className="text-xs text-[var(--muted)]">{'แฮปปี้เวลล์ คลินิกเวชกรรม'}</div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--muted)] pt-10">
            {'ส่งข้อความเพื่อเริ่มการสนทนา'}
          </div>
        )}
        {messages.map(msg => {
          const mine = msg.sender_id === user?.id
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              {!mine && (
                <div className="w-7 h-7 rounded-full bg-[#1a8a6e] flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 self-end mb-1">
                  HC
                </div>
              )}
              <div className="max-w-[72%]">
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  mine ? 'text-white rounded-br-sm' : 'bg-[var(--card-bg)] border border-[var(--border)] rounded-bl-sm'
                }`} style={mine ? { background: 'var(--hw-green)' } : {}}>
                  {msg.content}
                </div>
                <div className={`text-[10px] text-[var(--muted)] mt-0.5 ${mine ? 'text-right' : ''}`}>
                  {timeLabel(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={'พิมพ์ข้อความ... (Enter ส่ง)'}
          rows={1}
          className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[#1a8a6e]"
          style={{ maxHeight: 96, overflowY: 'auto' }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-80 transition-opacity"
          style={{ background: 'var(--hw-green)' }}>
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
  )

  return (
    // Use absolute fill so we don't fight with the outer overflow-y-auto
    <div className="absolute inset-0 flex overflow-hidden">
      {/* Mobile: show list OR chat */}
      <div className={`md:hidden w-full h-full ${showList ? 'flex' : 'hidden'}`}>
        {listPanel}
      </div>
      <div className={`md:hidden w-full h-full ${!showList && activeId ? 'flex flex-col' : 'hidden'}`}>
        {chatPanel}
      </div>

      {/* Desktop: side-by-side */}
      <div className="hidden md:flex w-full h-full">
        {listPanel}
        {chatPanel}
      </div>
    </div>
  )
}

