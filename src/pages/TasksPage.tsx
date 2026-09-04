import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus, CheckSquare, Circle, Flame, BookOpen,
  Droplets, Moon, Target, Calendar, TrendingUp,
  ChevronDown, X, Save, Smile, BarChart2
} from 'lucide-react'
import { db } from '@/db/schema'
import { TasksDB, HabitsDB, JournalDB } from '@/db/operations'
import type { Task, Habit, MoodLevel } from '@/db/schema'
import { format, startOfWeek, addDays } from 'date-fns'

const PRIORITY_CONFIG = {
  urgent: { color: '#ef4444', label: 'Urgent', bg: 'rgba(239,68,68,0.1)' },
  high: { color: '#f59e0b', label: 'High', bg: 'rgba(245,158,11,0.1)' },
  medium: { color: '#7c3aed', label: 'Medium', bg: 'rgba(124,58,237,0.1)' },
  low: { color: '#06b6d4', label: 'Low', bg: 'rgba(6,182,212,0.1)' },
}

const MOOD_CONFIG: Record<MoodLevel, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😔', label: 'Rough', color: '#ef4444' },
  2: { emoji: '😕', label: 'Meh', color: '#f59e0b' },
  3: { emoji: '😐', label: 'Okay', color: '#94a3b8' },
  4: { emoji: '😊', label: 'Good', color: '#10b981' },
  5: { emoji: '😄', label: 'Amazing', color: '#7c3aed' },
}

const HABIT_ICONS: Record<string, string> = {
  '🏃': 'Exercise', '📖': 'Read', '💧': 'Hydrate',
  '🧘': 'Meditate', '😴': 'Sleep', '✏️': 'Study',
}

function TaskModal({ onSave, onClose, initial }: {
  onSave: (t: Partial<Task>) => void
  onClose: () => void
  initial?: Partial<Task>
}) {
  const [form, setForm] = useState<Partial<Task>>({
    title: '', description: '', priority: 'medium',
    category: 'personal', deadline: null, isRepeating: false, ...initial
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div className="glass-card w-full max-w-md p-5 relative z-10 space-y-3"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>
            {initial?.id ? 'Edit Task' : 'New Task'}
          </h3>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>
        <input className="input-field" placeholder="What needs to be done? *"
          value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <textarea className="input-field resize-none" rows={2} placeholder="Description (optional)"
          value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Priority</label>
            <select className="input-field" value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Category</label>
            <select className="input-field" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {['personal', 'work', 'health', 'study', 'finance', 'social'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Deadline</label>
          <input type="datetime-local" className="input-field"
            value={form.deadline ? new Date(form.deadline).toISOString().slice(0, 16) : ''}
            onChange={e => setForm(f => ({ ...f, deadline: e.target.value ? new Date(e.target.value) : null }))} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => setForm(f => ({ ...f, isRepeating: !f.isRepeating }))}
            className={`w-10 h-5 rounded-full transition-all ${form.isRepeating ? 'bg-violet-600' : 'bg-[rgba(124,58,237,0.2)]'}`}>
            <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${form.isRepeating ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Recurring task</span>
        </label>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => { if (form.title?.trim()) { onSave(form); onClose() } }} className="btn-primary flex-1 flex items-center gap-2 justify-center">
            <Save size={14} /> Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function TasksPage() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'habits' | 'journal'>('tasks')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editTask, setEditTask] = useState<Partial<Task> | undefined>()
  const [filterCompleted, setFilterCompleted] = useState(false)

  const tasks = useLiveQuery(() =>
    filterCompleted
      ? db.tasks.where('isCompleted').equals(1).reverse().sortBy('completedAt')
      : db.tasks.where('isCompleted').equals(0).reverse().sortBy('createdAt'),
    [filterCompleted])

  const habits = useLiveQuery(() => db.habits.toArray(), [])
  const today = new Date().toISOString().slice(0, 10)
  const todayLogs = useLiveQuery(() => db.habitLogs.where('date').equals(today).toArray(), [today])
  const todayJournal = useLiveQuery(() => db.journalEntries.where('date').equals(today).first(), [today])

  const [journalForm, setJournalForm] = useState({ mood: 3 as MoodLevel, title: '', content: '' })

  const saveJournal = async () => {
    const existing = await db.journalEntries.where('date').equals(today).first()
    if (existing) {
      await JournalDB.update(existing.id!, { ...journalForm })
    } else {
      await JournalDB.add({ ...journalForm, date: today })
    }
  }

  const completedCount = useLiveQuery(() => db.tasks.where('isCompleted').equals(1).count(), [])
  const totalCount = useLiveQuery(() => db.tasks.count(), [])
  const progress = totalCount ? Math.round(((completedCount || 0) / totalCount) * 100) : 0

  return (
    <div className="page-content">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl gradient-text">My Day</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
          {activeTab === 'tasks' && (
            <motion.button className="btn-primary flex items-center gap-2"
              onClick={() => setShowTaskModal(true)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Plus size={16} /> Add Task
            </motion.button>
          )}
        </div>

        {/* Progress bar */}
        <div className="glass-card p-4 mb-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Daily Progress
              </span>
              <span className="text-sm font-bold" style={{ color: '#7c3aed' }}>
                {completedCount}/{totalCount} tasks
              </span>
            </div>
            <div className="progress-bar">
              <motion.div className="progress-fill" animate={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="text-2xl font-display font-bold" style={{ color: progress === 100 ? '#10b981' : '#7c3aed' }}>
            {progress}%
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 glass-card w-fit">
          {(['tasks', 'habits', 'journal'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize"
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--color-text-muted)'
              }}>
              {tab === 'tasks' ? '✅' : tab === 'habits' ? '🔥' : '📔'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Tasks Tab ── */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setFilterCompleted(false)}
                className={`badge text-xs px-3 py-1.5 cursor-pointer ${!filterCompleted ? 'badge-violet' : ''}`}
                style={{ background: !filterCompleted ? undefined : 'rgba(255,255,255,0.05)', color: !filterCompleted ? undefined : 'var(--color-text-muted)' }}>
                Active ({totalCount || 0})
              </button>
              <button onClick={() => setFilterCompleted(true)}
                className={`badge text-xs px-3 py-1.5 cursor-pointer ${filterCompleted ? 'badge-green' : ''}`}
                style={{ background: filterCompleted ? undefined : 'rgba(255,255,255,0.05)', color: filterCompleted ? undefined : 'var(--color-text-muted)' }}>
                Completed
              </button>
            </div>

            <AnimatePresence>
              {tasks && tasks.length > 0 ? tasks.map((task, i) => {
                const p = PRIORITY_CONFIG[task.priority]
                return (
                  <motion.div key={task.id}
                    className="glass-card p-4 flex items-start gap-4"
                    style={{ borderLeft: `3px solid ${p.color}` }}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.04 }}
                    layout>
                    <button onClick={() => TasksDB.toggle(task.id!)}
                      className="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                      style={{ borderColor: p.color, background: task.isCompleted ? p.color : 'transparent' }}>
                      {task.isCompleted && <span className="text-white text-xs">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${task.isCompleted ? 'line-through opacity-50' : ''}`}
                        style={{ color: 'var(--color-text)' }}>{task.title}</p>
                      {task.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="badge text-[10px]" style={{ background: p.bg, color: p.color }}>
                          {p.label}
                        </span>
                        <span className="badge badge-cyan text-[10px]">{task.category}</span>
                        {task.deadline && (
                          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--color-text-dim)' }}>
                            <Calendar size={10} />
                            {format(new Date(task.deadline), 'MMM d, h:mm a')}
                          </span>
                        )}
                        {task.isRepeating && (
                          <span className="badge badge-amber text-[10px]">🔁 Recurring</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditTask(task); setShowTaskModal(true) }}
                        className="p-1.5 rounded-lg hover:bg-[rgba(124,58,237,0.1)] transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}>
                        <Target size={14} />
                      </button>
                      <button onClick={() => TasksDB.delete(task.id!)}
                        className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-colors"
                        style={{ color: 'var(--color-text-dim)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                )
              }) : (
                <div className="glass-card p-12 text-center">
                  <CheckSquare size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="font-display font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                    {filterCompleted ? 'No completed tasks yet' : 'All clear! 🎉'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {filterCompleted ? '' : 'Add tasks to stay on track with your day.'}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Habits Tab ── */}
        {activeTab === 'habits' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {habits && habits.map(habit => {
                const log = todayLogs?.find(l => l.habitId === habit.id)
                const done = (log?.count ?? 0) >= habit.targetCount
                return (
                  <motion.div key={habit.id} className="glass-card p-4 flex items-center gap-4"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <button
                      onClick={() => HabitsDB.logToday(habit.id!)}
                      className={`habit-circle text-xl flex-shrink-0 ${done ? 'done' : ''}`}>
                      {habit.icon}
                    </button>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{habit.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{habit.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="progress-bar flex-1">
                          <div className="progress-fill" style={{ width: `${Math.min(100, ((log?.count || 0) / habit.targetCount) * 100)}%`, background: habit.color }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: habit.color }}>
                          {log?.count || 0}/{habit.targetCount}
                        </span>
                      </div>
                    </div>
                    {done && (
                      <div className="text-xl animate-bounce">🎉</div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Journal Tab ── */}
        {activeTab === 'journal' && (
          <div className="space-y-4">
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                📔 Today's Entry — {format(new Date(), 'MMMM d, yyyy')}
              </h3>

              {/* Mood Selector */}
              <div className="mb-4">
                <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  How are you feeling?
                </p>
                <div className="flex gap-3">
                  {([1, 2, 3, 4, 5] as MoodLevel[]).map(m => (
                    <button key={m}
                      onClick={() => setJournalForm(f => ({ ...f, mood: m }))}
                      className={`mood-btn ${journalForm.mood === m ? 'selected' : ''}`}>
                      {MOOD_CONFIG[m].emoji}
                    </button>
                  ))}
                </div>
                {journalForm.mood && (
                  <p className="text-xs mt-1" style={{ color: MOOD_CONFIG[journalForm.mood].color }}>
                    {MOOD_CONFIG[journalForm.mood].label}
                  </p>
                )}
              </div>

              <input className="input-field mb-3" placeholder="Entry title..."
                value={journalForm.title}
                onChange={e => setJournalForm(f => ({ ...f, title: e.target.value }))} />
              <textarea className="input-field resize-none mb-4" rows={6}
                placeholder="How was your day? What are you thinking about? Record anything — thoughts, achievements, moments..."
                value={journalForm.content}
                onChange={e => setJournalForm(f => ({ ...f, content: e.target.value }))} />
              <button onClick={saveJournal} className="btn-primary w-full flex items-center gap-2 justify-center">
                <Save size={16} /> Save Entry
              </button>
            </div>

            {/* Previous Entries */}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <TaskModal
            initial={editTask}
            onSave={async (task) => {
              if (editTask?.id) await TasksDB.update(editTask.id, task)
              else await TasksDB.add(task)
            }}
            onClose={() => { setShowTaskModal(false); setEditTask(undefined) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
