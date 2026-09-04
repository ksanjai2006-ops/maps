import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, X, Send, Bot, User, ArrowUpRight,
  Phone, Trash2, ShieldCheck, ChevronRight
} from 'lucide-react'
import { copilotEngine, type CopilotMessage } from '@/services/copilotService'
import { useAppStore } from '@/stores/appStore'

export function CopilotModal() {
  const { isCopilotOpen, setCopilotOpen, toggleCopilot } = useAppStore()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize with greeting if empty
  useEffect(() => {
    if (messages.length === 0) {
      copilotEngine.processQuery('help').then((initial) => {
        setMessages([initial])
      })
    }
  }, [])

  // Auto scroll
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
      // Simulate quick processing delay for conversational feel
      await new Promise((r) => setTimeout(r, 400))
      const response = await copilotEngine.processQuery(text)
      setMessages((prev) => [...prev, response])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I encountered an issue accessing local IndexedDB data.',
          timestamp: new Date()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleActionLink = (link?: string) => {
    if (link) {
      setCopilotOpen(false)
      navigate(link)
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={toggleCopilot}
        className="fixed bottom-20 md:bottom-6 right-5 z-40 p-3.5 rounded-full shadow-2xl flex items-center gap-2 group text-white cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          boxShadow: '0 8px 25px rgba(124, 58, 237, 0.45)'
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles size={20} className="animate-pulse" />
        <span className="text-xs font-bold hidden sm:inline-block pr-1 font-display">Copilot AI</span>
      </motion.button>

      {/* Copilot Popup Window */}
      <AnimatePresence>
        {isCopilotOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 pointer-events-none">
            {/* Backdrop on mobile */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-xs sm:hidden pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCopilotOpen(false)}
            />

            {/* Modal Card */}
            <motion.div
              className="pointer-events-auto w-full sm:w-[440px] h-[85vh] sm:h-[620px] max-h-[92vh] flex flex-col glass-card border border-[rgba(124,58,237,0.3)] shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="p-4 border-b border-[rgba(124,58,237,0.15)] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-accent-violet to-accent-cyan text-white shadow-md">
                    <Bot size={18} />
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm flex items-center gap-1.5">
                      LifeMap Copilot
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20 flex items-center gap-1">
                        <ShieldCheck size={10} /> 100% Offline
                      </span>
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      Local Knowledge & Life Assistant
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      copilotEngine.processQuery('help').then((init) => setMessages([init]))
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-xs"
                    title="Clear chat"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => setCopilotOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-start gap-2 max-w-[88%]">
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-accent-violet/30 text-accent-violet flex-shrink-0 mt-1">
                          <Bot size={13} />
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-accent-violet to-accent-violet/90 text-white rounded-br-xs shadow-md'
                            : 'bg-white/[0.05] border border-white/10 rounded-bl-xs'
                        }`}
                        style={{ color: msg.role === 'user' ? '#fff' : 'var(--color-text)' }}
                      >
                        <div className="whitespace-pre-line font-normal">{msg.content}</div>

                        {/* Embedded Data Cards */}
                        {msg.dataCards && msg.dataCards.length > 0 && (
                          <div className="mt-3 space-y-2 pt-2 border-t border-white/10">
                            {msg.dataCards.map((card, idx) => (
                              <div
                                key={idx}
                                className="bg-black/25 rounded-xl p-2.5 border border-white/5"
                              >
                                <div className="text-[11px] font-bold text-accent-cyan mb-1.5">
                                  {card.title}
                                </div>
                                <div className="space-y-1.5">
                                  {card.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                                    >
                                      <div className="min-w-0 flex-1 pr-2">
                                        <div className="font-medium truncate">{item.primary}</div>
                                        <div
                                          className="text-[10px] truncate"
                                          style={{ color: 'var(--color-text-muted)' }}
                                        >
                                          {item.secondary}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        {item.badge && (
                                          <span
                                            className="text-[10px] px-1.5 py-0.5 rounded font-bold"
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
                                            className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                            title="Call"
                                          >
                                            <Phone size={12} />
                                          </a>
                                        )}

                                        {item.actionLink && (
                                          <button
                                            onClick={() => handleActionLink(item.actionLink)}
                                            className="p-1 rounded hover:bg-white/10 text-accent-cyan"
                                            title="Open page"
                                          >
                                            <ArrowUpRight size={12} />
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

                      {msg.role === 'user' && (
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-cyan-500/30 text-cyan-300 flex-shrink-0 mt-1">
                          <User size={13} />
                        </div>
                      )}
                    </div>

                    {/* Suggestions below last assistant message */}
                    {msg.suggestions && msg === messages[messages.length - 1] && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 ml-8">
                        {msg.suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSend(sug)}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-accent-violet/20 border border-[rgba(124,58,237,0.25)] transition-all flex items-center gap-1 cursor-pointer"
                            style={{ color: 'var(--color-text)' }}
                          >
                            <span>{sug}</span>
                            <ChevronRight size={11} className="text-accent-violet" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-xs text-accent-violet">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-accent-violet/20">
                      <Bot size={13} className="animate-spin" />
                    </div>
                    <span className="animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                      Querying local memory...
                    </span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-[rgba(124,58,237,0.15)] bg-white/[0.02]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about tasks, expenses, places, emergency..."
                    className="input-field flex-1 text-xs py-2"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="btn-primary p-2.5 rounded-xl disabled:opacity-40 cursor-pointer"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
