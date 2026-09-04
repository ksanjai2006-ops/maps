import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, CheckSquare, MapPin, Users, DollarSign, X, Loader2 } from 'lucide-react'
import { useGlobalSearch } from '@/hooks'
import { useNavigate } from 'react-router-dom'

const TYPE_CONFIG: Record<string, { icon: string; color: string; path: string }> = {
  note:    { icon: '📝', color: '#7c3aed', path: '/notes' },
  task:    { icon: '✅', color: '#10b981', path: '/tasks' },
  place:   { icon: '📍', color: '#06b6d4', path: '/places' },
  contact: { icon: '👤', color: '#f59e0b', path: '/contacts' },
  expense: { icon: '💰', color: '#ef4444', path: '/expenses' },
  event:   { icon: '📅', color: '#8b5cf6', path: '/calendar' },
}

const EXAMPLE_SEARCHES = [
  'project', 'hospital', 'food', 'college', 'work', 'travel', 'doctor', 'home'
]

export function SearchPage() {
  const [query, setQuery] = useState('')
  const { results, loading } = useGlobalSearch(query)
  const navigate = useNavigate()

  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  return (
    <div className="page-content">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl gradient-text mb-1">Global Search</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Search across all your data — notes, tasks, places, contacts, expenses
          </p>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          {loading && (
            <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin"
              style={{ color: '#7c3aed' }} />
          )}
          {query && !loading && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2"
              onClick={() => setQuery('')} style={{ color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          )}
          <input
            className="input-field pl-12 pr-10 py-4 text-base"
            placeholder="Search everything..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Example Searches */}
        {!query && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-text-muted)' }}>Try searching for</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {EXAMPLE_SEARCHES.map(term => (
                <button key={term}
                  onClick={() => setQuery(term)}
                  className="badge badge-violet text-sm px-4 py-2 cursor-pointer transition-all hover:scale-105">
                  {term}
                </button>
              ))}
            </div>

            {/* Category shortcuts */}
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-text-muted)' }}>Quick Access</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                <motion.button key={type}
                  className="glass-card p-4 flex items-center gap-3 cursor-pointer text-left"
                  onClick={() => navigate(cfg.path)}
                  whileHover={{ y: -2 }}>
                  <span className="text-2xl">{cfg.icon}</span>
                  <div>
                    <p className="font-semibold text-sm capitalize" style={{ color: 'var(--color-text)' }}>{type}s</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Browse all</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {query && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {results.length === 0 && !loading ? (
                <div className="glass-card p-12 text-center">
                  <Search size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="font-display font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    No results for "{query}"
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Try a different search term
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm mb-4 font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {results.length} results for "{query}"
                  </p>
                  <div className="space-y-6">
                    {Object.entries(grouped).map(([type, items]) => {
                      const cfg = TYPE_CONFIG[type]
                      return (
                        <div key={type}>
                          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2"
                            style={{ color: cfg?.color }}>
                            <span>{cfg?.icon}</span> {type}s ({items.length})
                          </h3>
                          <div className="glass-card divide-y divide-white/5">
                            {items.map((result, i) => (
                              <motion.button key={i}
                                className="w-full p-3 flex items-center gap-3 text-left hover:bg-[rgba(124,58,237,0.05)] transition-colors"
                                onClick={() => navigate(cfg?.path || '/')}
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                                  style={{ background: `${cfg?.color}15` }}>
                                  {result.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                                    {result.title}
                                  </p>
                                  {result.subtitle && (
                                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                                      {result.subtitle}
                                    </p>
                                  )}
                                </div>
                                <div className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background: `${cfg?.color}15`, color: cfg?.color }}>
                                  {type}
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
