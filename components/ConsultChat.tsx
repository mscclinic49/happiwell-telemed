'use client'

import { useEffect, useRef, useState } from 'react'
import { IconLock, IconSend2, IconLoader2 } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { bkkTime } from '@/lib/slots'

type Msg = { id: string; sender_id: string; content: string; created_at: string }

/**
 * แชทระหว่างคนไข้กับแพทย์ของนัดนี้ — เก็บใน telemed เท่านั้น แอดมินและ DocDesk มองไม่เห็น
 * หลังตรวจเสร็จคนไข้อ่านได้อย่างเดียว (คุยต่อกับคลินิกทาง LINE)
 */
export function ConsultChat({ appointmentId, me, closed = false, dark = false }: {
  appointmentId: string
  me: string
  closed?: boolean
  dark?: boolean
}) {
  const [convId, setConvId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    let ch: ReturnType<typeof supabase.channel> | null = null
    supabase.rpc('hw_consult_conversation', { p_appt: appointmentId }).then(async ({ data, error }) => {
      if (!alive) return
      if (error || !data) { setError('เปิดแชทไม่สำเร็จ'); return }
      const id = data as string
      setConvId(id)
      const { data: rows } = await supabase.from('hw_messages').select('id, sender_id, content, created_at')
        .eq('conversation_id', id).order('created_at')
      if (alive) setMsgs((rows as Msg[]) ?? [])
      ch = supabase.channel(`consult-chat-${id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hw_messages', filter: `conversation_id=eq.${id}` }, p => {
          const m = p.new as Msg
          setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
        })
        .subscribe()
    })
    return () => { alive = false; if (ch) supabase.removeChannel(ch) }
  }, [appointmentId])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !convId) return
    setSending(true); setError(null)
    const { data, error } = await supabase.from('hw_messages')
      .insert({ conversation_id: convId, sender_id: me, content: body.slice(0, 2000) })
      .select('id, sender_id, content, created_at').single()
    setSending(false)
    if (error) { setError(error.message.includes('จบแล้ว') ? error.message : 'ส่งไม่สำเร็จ'); return }
    setText('')
    setMsgs(prev => prev.some(x => x.id === data.id) ? prev : [...prev, data as Msg])
  }

  const ink = dark ? 'text-white' : 'text-[var(--foreground)]'
  const sub = dark ? 'text-white/55' : 'text-[var(--muted)]'
  const line = dark ? 'border-white/10' : 'border-[var(--border)]'

  return (
    <div className={`flex flex-col h-full min-h-0 ${ink}`}>
      <div className={`flex items-center gap-1.5 px-4 py-3 border-b ${line} text-xs ${sub}`}>
        <IconLock size={13} />{'แชทนี้เห็นเฉพาะคุณกับแพทย์'}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2" aria-live="polite">
        {msgs.length === 0 && !error && (
          <p className={`text-xs text-center pt-6 ${sub}`}>{'พิมพ์ส่งอาการ ชื่อยา หรือคำถามระหว่างคุยได้ที่นี่'}</p>
        )}
        {msgs.map(m => {
          const mine = m.sender_id === me
          if (m.content.startsWith('__img__:')) return null
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-[14px] px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                mine ? 'bg-[var(--hw-primary)] text-[var(--hw-on-primary)]' : dark ? 'bg-white/10' : 'bg-[var(--card-elevated)] border border-[var(--border)]'
              }`}>
                {m.content}
                <div className={`text-[10px] mt-0.5 ${mine ? 'opacity-70' : sub}`}>{bkkTime(m.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
      {error && <p role="alert" className="px-4 pb-1 text-xs text-red-500">{error}</p>}
      {closed ? (
        <p className={`px-4 py-3 border-t ${line} text-xs ${sub}`}>{'การปรึกษานี้จบแล้ว มีคำถามเพิ่มเติม ทักแชทคลินิกทาง LINE @p49clinic ได้ 7 วัน'}</p>
      ) : (
        <form onSubmit={send} className={`flex items-end gap-2 px-3 py-3 border-t ${line}`}>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={1} maxLength={2000}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
            placeholder="พิมพ์ข้อความ"
            aria-label="ข้อความถึงแพทย์"
            className={`flex-1 resize-none rounded-[12px] px-3 py-2 text-sm focus:outline-none ${dark ? 'bg-white/10 placeholder:text-white/40' : 'bg-[var(--background)] border border-[var(--border)]'}`} />
          <button type="submit" disabled={!text.trim() || sending || !convId} aria-label="ส่ง"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--hw-primary)] text-[var(--hw-on-primary)] disabled:opacity-40 flex-shrink-0">
            {sending ? <IconLoader2 size={18} className="animate-spin" /> : <IconSend2 size={18} />}
          </button>
        </form>
      )}
    </div>
  )
}
