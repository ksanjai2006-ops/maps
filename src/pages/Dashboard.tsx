import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Map, FileText, CheckSquare, MapPin, Users, DollarSign,
  Calendar, AlertTriangle, Compass, Bookmark, Plus,
  ChevronRight, Star, Clock, TrendingUp
} from 'lucide-react'
import { db } from '@/db/schema'
import { TasksDB } from '@/db/operations'
import { useClock, useGeolocation, useWeather } from '@/hooks'
import { format } from 'date-fns'

const quickActions = [
  { icon: '📍', label: 'Open Map', path: '/map', color: '#06b6d4' },
  { icon: '📝', label: 'New Note', path: '/notes?new=1', color: '#7c3aed' },
  { icon: '✅', label: 'Add Task', path: '/tasks?new=1', color: '#10b981' },
  { icon: '📅', label: 'Add Event', path: '/calendar?new=1', color: '#f59e0b' },
  { icon: '👤', label: 'Contacts', path: '/contacts', color: '#8b5cf6' },
  { icon: '💬', label: 'Messages', path: '/notes', color: '#06b6d4' },
  { icon: '💰', label: 'Expense', path: '/expenses?new=1', color: '#ef4444' },
  { icon: '🚨', label: 'Emergency', path: '/emergency', color: '#ef4444' },
  { icon: '🧭', label: 'Places', path: '/places', color: '#f59e0b' },
  { icon: '🔖', label: 'Saved', path: '/places?filter=favorite', color: '#7c3aed' },
]

const moodEmojis: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '😊', 5: '😄' }

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
}
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export function Dashboard() {
  const navigate = useNavigate()
  const now = useClock()
  const { coords } = useGeolocation()
  const { weather } = useWeather(coords?.latitude ?? null, coords?.longitude ?? null)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = now.getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else if (h < 21) setGreeting('Good evening')
    else setGreeting('Good night')
  }, [now])

  // Live queries
  const tasks = useLiveQuery(() => db.tasks.where('isCompleted').equals(0).limit(5).toArray(), [])
  const notes = useLiveQuery(() => db.notes.where({ isArchived: 0, isDeleted: 0 }).reverse().limit(4).sortBy('updatedAt'), [])
  const places = useLiveQuery(() => db.savedPlaces.where('isFavorite').equals(1).limit(4).toArray(), [])
  const todayExpenses = useLiveQuery(async () => {
    const today = new Date().toISOString().slice(0, 10)
    const exps = await db.expenses.where('date').equals(today).toArray()
    return exps.reduce((sum, e) => sum + e.amount, 0)
  }, [])
  const completedToday = useLiveQuery(() => db.tasks.where('isCompleted').equals(1).count(), [])
  const totalTasks = useLiveQuery(() => db.tasks.count(), [])

  const priorityColor = (p: string) => ({ urgent: '#ef4444', high: '#f59e0b', medium: '#7c3aed', low: '#06b6d4' }[p] || '#7c3aed')

  return (
    <div className="page-content">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">

        {/* ─── Hero Header ─────────────────────────────── */}
        <motion.div variants={item}
          className="glass-card p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.08) 100%)' }}>
          {/* Decorative gradient blob */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <motion.p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {format(now, 'EEEE, MMMM d')}
              </motion.p>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">
                <span className="gradient-text">{greeting}! 👋</span>
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {format(now, 'h:mm:ss a')} • {navigator.onLine ? '🟢 Online' : '🟠 Offline — data available'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Weather Widget */}
              {weather ? (
                <motion.div className="glass-card px-4 py-3 text-center" whileHover={{ scale: 1.02 }}>
                  <div className="text-2xl mb-0.5">{weather.icon}</div>
                  <div className="text-xl font-bold font-display" style={{ color: 'var(--color-text)' }}>{weather.temp}°C</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{weather.condition}</div>
                </motion.div>
              ) : (
                <div className="glass-card px-4 py-3 text-center">
                  <div className="text-2xl mb-0.5">🌡️</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Weather offline</div>
                </div>
              )}

              {/* Stats mini */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Tasks Left', value: (totalTasks ?? 0) - (completedToday ?? 0), icon: '✅', color: '#10b981' },
                  { label: 'Today Spend', value: `₹${(todayExpenses ?? 0).toLocaleString('en-IN')}`, icon: '💰', color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} className="glass-card px-3 py-2 text-center">
                    <div className="text-base">{s.icon}</div>
                    <div className="font-bold text-sm font-display" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Quick Actions ────────────────────────────── */}
        <motion.section variants={item}>
          <h2 className="font-display font-bold text-lg mb-3" style={{ color: 'var(--color-text)' }}>Quick Actions</h2>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {quickActions.map((action) => (
              <motion.button
                key={action.label}
                className="quick-action"
                onClick={() => navigate(action.path)}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="quick-action-icon">{action.icon}</span>
                <span className="quick-action-label">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* ─── Tasks + Notes (2-column) ─────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Tasks */}
          <motion.section variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                📋 Today's Tasks
              </h2>
              <button onClick={() => navigate('/tasks')}
                className="text-xs flex items-center gap-1 transition-colors hover:text-violet-400"
                style={{ color: 'var(--color-text-muted)' }}>
                See all <ChevronRight size={14} />
              </button>
            </div>
            <div className="glass-card divide-y divide-white/5">
              {tasks && tasks.length > 0 ? tasks.map((task, i) => (
                <motion.div key={task.id} className="p-3 flex items-start gap-3"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}>
                  <div className="w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0 cursor-pointer"
                    style={{ borderColor: priorityColor(task.priority) }}
                    onClick={() => TasksDB.toggle(task.id!)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{task.title}</p>
                    {task.deadline && (
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Clock size={10} />
                        {format(new Date(task.deadline), 'MMM d')}
                      </p>
                    )}
                  </div>
                  <span className="badge text-[10px]"
                    style={{ background: `${priorityColor(task.priority)}20`, color: priorityColor(task.priority) }}>
                    {task.priority}
                  </span>
                </motion.div>
              )) : (
                <div className="p-8 text-center">
                  <CheckSquare size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>All caught up! 🎉</p>
                </div>
              )}
              <button onClick={() => navigate('/tasks?new=1')}
                className="w-full p-3 flex items-center gap-2 text-sm transition-colors hover:bg-[rgba(124,58,237,0.05)]"
                style={{ color: 'var(--color-text-muted)' }}>
                <Plus size={14} /> Add task
              </button>
            </div>
          </motion.section>

          {/* Recent Notes */}
          <motion.section variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                📝 Recent Notes
              </h2>
              <button onClick={() => navigate('/notes')}
                className="text-xs flex items-center gap-1 hover:text-violet-400 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}>
                See all <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {notes && notes.length > 0 ? notes.map((note, i) => (
                <motion.div key={note.id}
                  className="glass-card p-3 cursor-pointer card-hover"
                  onClick={() => navigate('/notes')}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 2 }}>
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{note.type === 'checklist' ? '☑️' : '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                        {note.title || 'Untitled'}
                      </p>
                      {note.type === 'text' && note.content && (
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
                          {note.content.replace(/[#*_`]/g, '').slice(0, 60)}
                        </p>
                      )}
                      {note.type === 'checklist' && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {note.checklistItems.filter(i => i.checked).length}/{note.checklistItems.length} done
                        </p>
                      )}
                    </div>
                    {note.isPinned && <Star size={12} className="text-amber-400 mt-0.5" />}
                  </div>
                </motion.div>
              )) : (
                <div className="glass-card p-8 text-center">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No notes yet</p>
                </div>
              )}
            </div>
          </motion.section>
        </div>

        {/* ─── Saved Places ─────────────────────────────── */}
        <motion.section variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--color-text)' }}>
              ⭐ Favorite Places
            </h2>
            <button onClick={() => navigate('/places')}
              className="text-xs flex items-center gap-1 hover:text-violet-400 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}>
              See all <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {places && places.length > 0 ? places.map((place, i) => (
              <motion.div key={place.id}
                className="glass-card p-4 cursor-pointer card-hover"
                onClick={() => navigate('/map')}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3 }}>
                <div className="text-2xl mb-2">{place.icon}</div>
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{place.name}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{place.category}</p>
                {place.visitCount > 0 && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-text-dim)' }}>
                    <TrendingUp size={10} /> {place.visitCount} visits
                  </p>
                )}
              </motion.div>
            )) : (
              <div className="col-span-4 glass-card p-8 text-center">
                <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No saved places yet</p>
              </div>
            )}
          </div>
        </motion.section>

        {/* ─── Emergency Quick-Access ───────────────────── */}
        <motion.section variants={item}>
          <motion.button
            className="w-full glass-card p-4 flex items-center gap-4 text-left cursor-pointer"
            style={{ background: 'linear-gradient(135deg, rgba(127,29,29,0.4), rgba(239,68,68,0.15))', borderColor: 'rgba(239,68,68,0.3)' }}
            onClick={() => navigate('/emergency')}
            whileHover={{ scale: 1.01, borderColor: 'rgba(239,68,68,0.6)' }}
            whileTap={{ scale: 0.99 }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl animate-pulse-slow"
              style={{ background: 'rgba(239,68,68,0.2)' }}>🚨</div>
            <div className="flex-1">
              <p className="font-display font-bold text-base" style={{ color: '#fca5a5' }}>Emergency Mode</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(252,165,165,0.7)' }}>
                Quick access to contacts, medical info & GPS location
              </p>
            </div>
            <ChevronRight size={20} style={{ color: '#fca5a5' }} />
          </motion.button>
        </motion.section>

      </motion.div>
    </div>
  )
}
