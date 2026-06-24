'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth-context'
import { IconMessageCircle2, IconSend, IconUser } from '@tabler/icons-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Conv = {
  id: string
  appointment_id: string | null
  patient_id: string
  hw_users: { full_name: string | null; first_name: string | null } | null
  lastMsg?: string
  lastTime?: string
  unread?: number
}

type Msg = { id: string; sender_id: string; content: string; created_at: string }

export default function DoctorChatPage() {
  const { user } = useAuth()
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [convs, setConvs] = useState<Conv[]>([])
  const [active, setActive] = useState<Conv | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Get doctor profile
  useEffect(() => {
    if (!user) return
    sb.from('hw_doctors').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setDoctorId(data.id) })
  }, [user])

  // Load conversations
  const loadConvs = useCallback(async () => {
    if (!doctorId) return
    const { data } = await sb
      .from('hw_conversations')
      .select('id, appointment_id, patient_id, hw_users!patient_id(full_name, first_name)')
      .eq('doctor_id', doctorId)
      .order('updated_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Get last message + unread count per conversation
    const enriched = await Promise.all((data as unknown as Conv[]).map(async c => {
      const [{ data: msgs }, { count }] = await Promise.all([
        sb.from('hw_messages').select('content, created_at').eq('conversation_id', c.id)
          .order('created_at', { ascending: false }).limit(1),
        sb.from('hw_messages').select('id', { count: 'exact', head: true })
          .eq('conversation_id', c.id).neq('sender_id', user!.id).is('read_at', null),
      ])
      return {
        ...c,
        lastMsg:  msgs?.[0]?.content ?? '',
        lastTime: msgs?.[0]?.created_at ?? '',
        unread:   count ?? 0,
      }
    }))

    setConvs(enriched)
    setLoading(false)
  }, [doctorId, user])

  useEffect(() => { loadConvs() }, [loadConvs])

  // Load messages for active conversation
  const loadMsgs = useCallback(async () => {
    if (!active) return
    const { data } = await sb.from('hw_messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', active.id)
      .order('created_at')
    setMessages((data as Msg[]) ?? [])

    // Mark all as read
    await sb.from('hw_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', active.id)
      .neq('sender_id', user!.id)
      .is('read_at', null)
  }, [active, user])

  useEffect(() => {
    if (!active) return
    loadMsgs()
    const ch = sb.channel(`dr-chat-${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hw_messages',
        filter: `conversation_id=eq.${active.id}` }, loadMsgs)
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [active, loadMsgs])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || !active || !user) return
    setSending(true)
    await sb.from('hw_messages').insert({
      conversation_id: active.id,
      sender_id: user.id,
      content: input.trim(),
    })
    setInput('')
    setSending(false)
    // refresh conv list to update lastMsg
    loadConvs()
  }

  const patientName = (c: Conv) => c.hw_users?.full_name || c.hw_users?.first_name || '—'

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation list */}
      <div className={`flex flex-col border-r border-[var(--border)] bg-[var(--card-bg)]
        ${active ? 'hidden md:flex md:w-72' : 'flex-1 md:w-72 md:flex-none'}`}>
        <div className="px-4 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <IconMessageCircle2 size={18} className="text-[#1a8a6e]" />
            <span className="font-bold text-sm">{'แชท'}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-px px-2 py-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-[10px] bg-[var(--background)] animate-pulse" />)}
            </div>
          ) : convs.length === 0 ? (
            <div className="text-center py-16 text-[var(--muted)]">
              <IconMessageCircle2 size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">{'ยังไม่มีแชท'}</p>
            </div>
          ) : (
            <div className="py-2 px-2 space-y-0.5">
              {convs.map(c => {
                const isActive = active?.id === c.id
                const name = patientName(c)
                const dt = c.lastTime ? new Date(c.lastTime) : null
                return (
                  <button key={c.id} onClick={() => setActive(c)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-[10px] transition-colors
                      ${isActive ? 'bg-[#1a8a6e]/15' : 'hover:bg-[#1a8a6e]/10'}`}>
                    <div className="w-10 h-10 rounded-full bg-[#1a8a6e]/15 flex items-center justify-center flex-shrink-0 relative">
                      <IconUser size={18} className="text-[#1a8a6e]" />
                      {(c.unread ?? 0) > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                          {(c.unread ?? 0) > 9 ? '9+' : c.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${isActive ? 'text-[#1a8a6e] font-semibold' : 'text-[var(--foreground)] font-medium'}`}>
                        {name}
                      </div>
                      {c.lastMsg && (
                        <div className="text-xs text-[var(--muted)] truncate mt-0.5">{c.lastMsg}</div>
                      )}
                    </div>
                    {dt && (
                      <div className="text-[10px] text-[var(--muted)] flex-shrink-0">
                        {dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      {active ? (
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--card-bg)] border-b border-[var(--border)] flex-shrink-0">
            <button className="md:hidden p-1.5 -ml-1 text-[var(--muted)]" onClick={() => setActive(null)}>
              ←
            </button>
            <div className="w-9 h-9 rounded-full bg-[#1a8a6e]/15 flex items-center justify-center flex-shrink-0">
              <IconUser size={16} className="text-[#1a8a6e]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-[var(--foreground)] truncate">{patientName(active)}</div>
              {active.appointment_id && (
                <a href={`/doctor/appointments/${active.appointment_id}`}
                  className="text-[10px] text-[#1a8a6e] hover:underline">
                  {'ดูห้องตรวจ →'}
                </a>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-[var(--muted)] mt-12">{'เริ่มบทสนทนา'}</div>
            )}
            {messages.map(m => {
              const mine = m.sender_id === user?.id
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-[14px] text-sm ${
                    mine
                      ? 'bg-[#1a8a6e] text-white rounded-br-[4px]'
                      : 'bg-[var(--card-bg)] border border-[var(--border)] rounded-bl-[4px] text-[var(--foreground)]'
                  }`}>
                    {m.content}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
            <input value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder={'พิมพ์ข้อความ...'}
              className="flex-1 px-3 py-2 rounded-[10px] border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[#1a8a6e]" />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-[10px] bg-[#1a8a6e] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0">
              <IconSend size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-[var(--muted)]">
          <div className="text-center">
            <IconMessageCircle2 size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{'เลือกการสนทนา'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
