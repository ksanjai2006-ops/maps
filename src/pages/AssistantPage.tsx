import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bot, Sparkles, Send, ShieldCheck, ArrowUpRight, Phone,
  DollarSign, Calendar, CheckSquare, AlertTriangle, MapPin,
  FileText, Trash2, ChevronRight, Zap
} from 'lucide-react'
import { copilotEngine, type CopilotMessage } from '@/services/copilotService'

const CATEGORY_PROMPTS = [
  {
    category: 'Finances',
    icon: DollarSign,
    color: '#ef4444',
    prompts: ['How much did I spend this month?', 'Show my top expense category', 'Recent food expenses']
  },
  {
    category: 'Schedule',
    icon: Calendar,
    color: '#7c3aed',
    prompts: ['What is on my calendar today?', 'Show upcoming meetings', 'Any plans for tomorrow?']
  },
  {
    category: 'Tasks & Habits',
    icon: CheckSquare,
    color: '#10b981',
    prompts: ['What are my high priority tasks?', 'Pending tasks for today', 'How is my habit streak?']
  },
  {
    category: 'Emergency & Health',
    icon: AlertTriangle,
    color: '#f59e0b',
    prompts: ['Who are my emergency contacts?', 'What is my blood group & allergies?', 'Show doctor phone']
  },
  {
    category: 'Locations',
    icon: MapPin,
    color: '#06b6d4',
    prompts: ['List my favorite places', 'Where is my home located?', 'Show hospital address']
  },
  {
    category: 'Notes & Vault',
    icon: FileText,
    color: '#ec4899',
    prompts: ['Search notes for passwords', 'Show pinned notes', 'Recent journal entry']
  }
]

export function AssistantPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length === 0) {
      copilotEngine.processQuery('help').then((msg) => setMessages([msg]))
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (queryText?: string) => {
    const text = (queryText || input).trim()
    if (!text || loading) return

    const userMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      await new Promise((r) => setTimeout(r, 350))
      const response = await copilotEngine.processQuery(text)
      setMessages((prev) => [...prev, response])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Unable to query local IndexedDB database at this moment.',
          timestamp: new Date()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[calc(100dvh-60px)] md:h-[100dvh] flex flex-col md:flex-row overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* ── Left Sidebar: Quick Prompts ── */}
      <div className="w-full md:w-80 border-r border-[rgba(124,58,237,0.15)] flex flex-col bg-white/[0.01]">
        <div className="p-4 border-b border-[rgba(124,58,237,0.15)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-accent-violet to-accent-cyan text-white shadow-md">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="font-display font-bold text-base" style={{ color: 'var(--color-text)' }}>
                LifeMap Copilot
              </h1>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck size={11} /> 100% Offline Intelligence
              </div>
            </div>
          </div>
        </div>

        {/* Prompt categories */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Knowledge Inquiries
          </div>

          {CATEGORY_PROMPTS.map((cat) => {
            const Icon = cat.icon
            return (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cat.color }}>
                  <Icon size={14} />
                  <span>{cat.category}</span>
                </div>
                <div className="space-y-1">
                  {cat.prompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSend(p)}
                      className="w-full p-2 text-left rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-[11px] transition-all flex items-center justify-between cursor-pointer"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <span className="truncate">{p}</span>
                      <ChevronRight size={11} style={{ color: 'var(--color-text-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Guarantee footer */}
        <div className="p-3 border-t border-[rgba(124,58,237,0.1)] text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          🔒 Private & Confidential. All queries execute locally in your browser against IndexedDB.
        </div>
      </div>

      {/* ── Main Chat Stream ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(124,58,237,0.15)] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-accent-cyan" />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              Offline Personal Life Query Engine
            </span>
          </div>

          <button
            onClick={() => {
              copilotEngine.processQuery('help').then((msg) => setMessages([msg]))
            }}
            className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1 text-gray-400 hover:text-white"
          >
            <Trash2 size={13} /> Reset Chat
          </button>
        </div>

        {/* Chat Stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-start gap-2.5 max-w-[85%]">
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent-violet/25 text-accent-violet flex-shrink-0 mt-1">
                    <Bot size={15} />
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-accent-violet to-accent-violet/90 text-white rounded-br-xs shadow-md'
                      : 'glass-card rounded-bl-xs'
                  }`}
                  style={{ color: msg.role === 'user' ? '#fff' : 'var(--color-text)' }}
                >
                  <div className="whitespace-pre-line font-normal">{msg.content}</div>

                  {/* Data Cards */}
                  {msg.dataCards && msg.dataCards.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-white/10">
                      {msg.dataCards.map((card, idx) => (
                        <div key={idx} className="bg-black/25 rounded-xl p-3 border border-white/5">
                          <div className="text-xs font-bold text-accent-cyan mb-2">{card.title}</div>
                          <div className="space-y-1.5">
                            {card.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="font-semibold text-xs truncate">{item.primary}</div>
                                  <div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                                    {item.secondary}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {item.badge && (
                                    <span
                                      className="text-[10px] px-2 py-0.5 rounded font-bold"
                                      style={{
                                        background: `${item.badgeColor || '#7c3aed'}20`,
                                        color: item.badgeColor || '#7c3aed'
                                      }}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                  {item.phone && (
                                    <a
                                      href={`tel:${item.phone}`}
                                      className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                      title="Call"
                                    >
                                      <Phone size={13} />
                                    </a>
                                  )}
                                  {item.actionLink && (
                                    <button
                                      onClick={() => navigate(item.actionLink!)}
                                      className="p-1 rounded hover:bg-white/10 text-accent-cyan"
                                      title="Open page"
                                    >
                                      <ArrowUpRight size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              {msg.suggestions && msg === messages[messages.length - 1] && (
                <div className="flex flex-wrap gap-1.5 mt-2.5 ml-9">
                  {msg.suggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sug)}
                      className="text-xs px-3 py-1 rounded-full bg-white/[0.04] hover:bg-accent-violet/20 border border-[rgba(124,58,237,0.25)] transition-all flex items-center gap-1 cursor-pointer"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <span>{sug}</span>
                      <ChevronRight size={12} className="text-accent-violet" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-accent-violet ml-2">
              <Bot size={15} className="animate-spin" />
              <span className="animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                Analyzing offline database...
              </span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[rgba(124,58,237,0.15)] bg-white/[0.02]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 max-w-4xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask LifeMap Copilot about your expenses, calendar, places, tasks, or emergency info..."
              className="input-field flex-1 text-xs py-2.5"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn-primary px-4 py-2.5 rounded-xl disabled:opacity-40 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <span>Ask</span>
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
