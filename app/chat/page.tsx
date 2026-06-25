'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Image from 'next/image'
import {
  IconMessageCircle2, IconSend, IconAlertCircle, IconPhoto,
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

function MsgContent({ content, mine }: { content: string; mine: boolean }) {
  if (content.startsWith('__img__:')) {
    const url = content.slice(8)
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Image src={url} alt="รูปภาพ" width={240} height={180}
          className="rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" />
      </a>
    )
  }
  return (
    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
      mine ? 'text-white rounded-br-sm' : 'bg-[var(--card-bg)] border border-[var(--border)] rounded-bl-sm'
    }`} style={mine ? { background: 'var(--hw-green)' } : {}}>
      {content}
    </div>
  )
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
  const [uploading, setUploading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Init: get or create support conversation
  useEffect(() => {
    if (!user) return
    async function init() {
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

      const { data: list } = await sb
        .from('hw_conversations').select('id, type, title, appointment_id, last_message_at')
        .eq('patient_id', user!.id).order('last_message_at', { ascending: false })
      setConvs((list as Conversation[]) || [])

      if (convId) { setActiveId(convId) }
    }
    init()
  }, [user])

  // Load messages + mark admin messages as read
  useEffect(() => {
    if (!activeId || !user) return
    sb.from('hw_messages').select('*').eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) || [])
        sb.from('hw_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', activeId)
          .neq('sender_id', user.id)
          .is('read_at', null)
          .then(() => {})
      })
  }, [activeId, user])

  // Realtime — mark incoming admin messages as read immediately
  useEffect(() => {
    if (!activeId || !user) return
    const ch = sb.channel(`chat:${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'hw_messages',
        filter: `conversation_id=eq.${activeId}`,
      }, payload => {
        const msg = payload.new as Message
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        if (msg.sender_id !== user.id) {
          sb.from('hw_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then(() => {})
        }
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [activeId, user])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeId || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { data, error } = await sb.storage.from('chat-images').upload(path, file, { contentType: file.type })
    if (!error && data) {
      const { data: { publicUrl } } = sb.storage.from('chat-images').getPublicUrl(data.path)
      await sb.from('hw_messages').insert({ conversation_id: activeId, sender_id: user.id, content: `__img__:${publicUrl}` })
      await sb.from('hw_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeId)
      setConvs(prev => prev.map(c => c.id === activeId ? { ...c, last_message_at: new Date().toISOString() } : c))
    }
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (initError) {
    return (
      <div className="max-w-lg mx-auto px-5 py-12 text-center">
        <IconAlertCircle size={36} className="mx-auto mb-3 text-red-400" />
        <p className="text-sm text-red-600 font-medium">{'ไม่สามารถโหลดแชทได้'}</p>
        <p className="text-xs text-[var(--muted)] mt-1">{initError}</p>
      </div>
    )
  }

  const chatPanel = activeId ? (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{'ติดต่อคลินิก'}</div>
          <div className="text-xs text-[var(--muted)]">{'แฮปปี้เวลล์ คลินิกเวชกรรม'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--muted)] pt-10">{'ส่งข้อความเพื่อเริ่มการสนทนา'}</div>
        )}
        {messages.map(msg => {
          const mine = msg.sender_id === user?.id
          const isImg = msg.content.startsWith('__img__:')
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              {!mine && (
                <div className="w-7 h-7 rounded-full bg-[var(--hw-green-dk)] flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 self-end mb-1">
                  HC
                </div>
              )}
              <div className={isImg ? 'max-w-[72%]' : 'max-w-[72%]'}>
                <MsgContent content={msg.content} mine={mine} />
                <div className={`text-[10px] text-[var(--muted)] mt-0.5 ${mine ? 'text-right' : ''}`}>
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
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:text-[var(--hw-green-dk)] hover:border-[var(--hw-green-dk)] transition-colors disabled:opacity-40"
        >
          {uploading
            ? <span className="w-4 h-4 border-2 border-[var(--hw-green-dk)] border-t-transparent rounded-full animate-spin" />
            : <IconPhoto size={17} />}
        </button>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={'พิมพ์ข้อความ... (Enter ส่ง)'}
          rows={1}
          className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--hw-green-dk)]"
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
    <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
      <div className="text-center">
        <IconMessageCircle2 size={44} className="mx-auto mb-3 opacity-25" />
        <p className="text-sm">{'กำลังโหลด...'}</p>
      </div>
    </div>
  )

  return (
    <div className="absolute inset-0 flex overflow-hidden">
      {chatPanel}
    </div>
  )
}
