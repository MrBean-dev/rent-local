'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  sender_name?: string
}

interface RequestDetail {
  id: string
  service_id: string
  service_title: string
  start_date: string
  end_date: string
  status: string
  hirer_id: string
  hirer_name: string
  owner_id: string
  owner_name: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const isToday = d.toDateString() === new Date().toDateString()
  if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function ServiceMessagesPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()

  const [request, setRequest]   = useState<RequestDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [blocked, setBlocked]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  const CONTACT_PATTERN = /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/\S+|www\.\S+)/i

  useEffect(() => {
    if (!user) return
    const sb = createClient()

    ;(sb.from('service_requests') as any)
      .select('id, service_id, start_date, end_date, status, hirer_id, service_listings(title, owner_id, profiles(name)), profiles(name)')
      .eq('id', requestId)
      .single()
      .then(({ data }: any) => {
        if (!data) { router.push('/'); return }
        const ownerId = data.service_listings?.owner_id ?? ''
        if (user.id !== data.hirer_id && user.id !== ownerId) { router.push('/'); return }
        setRequest({
          id: data.id,
          service_id: data.service_id,
          service_title: data.service_listings?.title ?? '',
          start_date: data.start_date,
          end_date: data.end_date,
          status: data.status,
          hirer_id: data.hirer_id,
          hirer_name: data.profiles?.name ?? 'Hirer',
          owner_id: ownerId,
          owner_name: data.service_listings?.profiles?.name ?? 'Provider',
        })
      })

    ;(sb.from('service_messages') as any)
      .select('id, sender_id, content, created_at, profiles(name)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
      .then(({ data }: any) => {
        setMessages((data ?? []).map((m: any) => ({ ...m, sender_name: m.profiles?.name ?? '' })))
      })

    const channel = sb
      .channel(`service_messages:${requestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'service_messages',
        filter: `request_id=eq.${requestId}`,
      }, async (payload: any) => {
        const { data: profile } = await (sb.from('profiles') as any)
          .select('name')
          .eq('id', payload.new.sender_id)
          .single()
        setMessages((prev) => [...prev, { ...payload.new, sender_name: profile?.name ?? '' }])
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [user, requestId, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !user || sending) return

    if (CONTACT_PATTERN.test(input)) {
      setBlocked(true)
      setTimeout(() => setBlocked(false), 4000)
      return
    }

    setSending(true)
    const sb = createClient()
    await (sb.from('service_messages') as any).insert({
      request_id: requestId,
      sender_id: user.id,
      content: input.trim(),
    })
    setInput('')
    setSending(false)
    inputRef.current?.focus()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="text-xl font-bold text-gray-900">Sign in to view messages</h2>
        <Link href="/login" className="mt-4 inline-block px-5 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors">Sign in</Link>
      </div>
    </div>
  )

  const isOwner    = user.id === request?.owner_id
  const otherName  = isOwner ? request?.hirer_name : request?.owner_name

  const statusColors: Record<string, string> = {
    pending:  'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-600',
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={isOwner ? `/services/${request?.service_id}/requests` : '/profile/requests'}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
              {otherName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{otherName}</p>
              {request && <p className="text-xs text-gray-400 truncate">{request.service_title}</p>}
            </div>
            {request && (
              <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${statusColors[request.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {request.status}
              </span>
            )}
          </div>
          {request && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="bg-gray-100 rounded-lg px-2.5 py-1">📅 {request.start_date} → {request.end_date}</span>
              <Link href={`/services/${request.service_id}`} className="bg-gray-100 rounded-lg px-2.5 py-1 hover:bg-gray-200 transition-colors">
                View service →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 space-y-3 pb-32">
        {messages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm font-medium text-gray-500">No messages yet</p>
            <p className="text-xs mt-1">Send a message to get the conversation started.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe      = msg.sender_id === user.id
          const showName  = i === 0 || messages[i - 1].sender_id !== msg.sender_id

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {showName && !isMe && (
                <p className="text-xs text-gray-400 mb-1 ml-1">{msg.sender_name}</p>
              )}
              <div className={`max-w-xs sm:max-w-sm lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                isMe
                  ? 'bg-teal-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-900 border border-gray-100 shadow-sm rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              <p className={`text-xs text-gray-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                {formatTime(msg.created_at)}
              </p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        {blocked && (
          <div className="max-w-2xl mx-auto mb-2 bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Phone numbers, emails, and links aren't allowed. All communication stays in-app.
          </div>
        )}
        <form onSubmit={sendMessage} className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-400 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-11 h-11 flex items-center justify-center bg-teal-600 text-white rounded-xl hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-40 shrink-0"
          >
            <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
