'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  role: 'user' | 'assistant'
  content: string
  actions?: string[]
}

const SUGGESTED_QUESTIONS = [
  '¿Qué actividad me recomiendas hacer hoy?',
  'Crea un plan para esta semana',
  '¿Cuál es mi ritmo estimado para un 21K?',
  '¿Estoy en riesgo de lesión?',
]

const ACTION_LABELS: Record<string, string> = {
  save_training_plan: '📅 Plan guardado',
  delete_training_plan_days: '🗑 Días eliminados',
  add_activity_note: '📝 Nota guardada',
  create_race_goal: '🏁 Meta de carrera creada',
  get_training_plan: '📋 Plan consultado',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const HISTORY_LIMIT = 100 // mensajes a cargar al iniciar

async function loadHistory(): Promise<Message[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chat_history?order=created_at.asc&limit=${HISTORY_LIMIT}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (!res.ok) return []
    const rows: { role: string; content: string; actions: string[] | null }[] = await res.json()
    return rows.map(r => ({ role: r.role as 'user' | 'assistant', content: r.content, actions: r.actions ?? undefined }))
  } catch { return [] }
}

async function saveMessage(msg: Message) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_history`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        role: msg.role,
        content: msg.content,
        actions: msg.actions ?? null,
      }),
    })
  } catch { /* silent */ }
}

async function clearHistory() {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_history?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
  } catch { /* silent */ }
}

export default function Chat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Load history on first open
  useEffect(() => {
    if (open && !historyLoaded) {
      loadHistory().then(msgs => {
        setMessages(msgs)
        setHistoryLoaded(true)
      })
    }
  }, [open, historyLoaded])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    // Save user message to Supabase
    await saveMessage(userMsg)

    try {
      // Send last 20 messages as context (avoid huge payloads)
      const contextWindow = history.slice(-20)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: contextWindow.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error('Error en la respuesta')
      const data = await res.json()

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply || 'Sin respuesta.',
        actions: data.actionsExecuted?.length ? data.actionsExecuted : undefined,
      }

      setMessages(prev => [...prev, assistantMsg])
      await saveMessage(assistantMsg)

      if (data.refreshNeeded) {
        startTransition(() => router.refresh())
      }
    } catch {
      const errMsg: Message = { role: 'assistant', content: 'Hubo un error al conectar. Intenta de nuevo.' }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    setMessages([])
    await clearHistory()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0 && historyLoaded

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-900/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
        aria-label="Abrir chat con MatiBot"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="close"
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}
              className="text-white text-xl">✕</motion.span>
          ) : (
            <motion.span key="open"
              initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}
              className="text-2xl">🤖</motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-1.5rem)] h-[560px] flex flex-col rounded-2xl border border-white/10 bg-gray-950/95 backdrop-blur-xl shadow-2xl shadow-black/60"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm">🤖</div>
              <div>
                <p className="text-sm font-semibold text-white">MatiBot</p>
                <p className="text-xs text-gray-400">
                  {historyLoaded && messages.length > 0
                    ? `${messages.length} mensajes guardados`
                    : 'Asistente · memoria permanente'}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-gray-400">en línea</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

              {/* Loading skeleton */}
              {open && !historyLoaded && (
                <div className="flex flex-col gap-3 pt-4">
                  {[1,2,3].map(i => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                      <div className="h-8 rounded-xl bg-white/5 animate-pulse" style={{ width: `${50 + i * 15}%` }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {isEmpty && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <p className="text-gray-400 text-sm">
                    Hola Matias 👋 Recuerdo todo lo que hemos hablado. ¿En qué te ayudo?
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button key={q} onClick={() => sendMessage(q)}
                        className="text-left text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/40 text-gray-300 hover:text-white transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} gap-1`}>
                  <div className={`max-w-[88%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white/8 text-gray-100 rounded-bl-sm border border-white/10'
                  }`}>
                    {m.content}
                  </div>
                  {m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-w-[88%]">
                      {m.actions.map((a, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                          {ACTION_LABELS[a] || a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl rounded-bl-sm bg-white/8 border border-white/10">
                    <div className="flex gap-1 items-center h-4">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pregunta o pide un cambio en tu plan..."
                  disabled={loading}
                  className="flex-1 bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                >
                  <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
              {historyLoaded && messages.length > 0 && (
                <button onClick={handleClear}
                  className="mt-2 w-full text-xs text-gray-600 hover:text-red-400 transition-colors">
                  Borrar historial completo
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
