import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus, DollarSign, TrendingDown, TrendingUp,
  PieChart as LucidePieChart, Calendar, X, Save, Trash2
} from 'lucide-react'
import {
  PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import { db } from '@/db/schema'
import { ExpensesDB } from '@/db/operations'
import type { Expense, ExpenseCategory, PaymentMethod } from '@/db/schema'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns'

const CATEGORY_CONFIG: Record<ExpenseCategory, { icon: string; color: string; label: string }> = {
  food:          { icon: '🍽️', color: '#f97316', label: 'Food' },
  travel:        { icon: '🚗', color: '#06b6d4', label: 'Travel' },
  shopping:      { icon: '🛍️', color: '#8b5cf6', label: 'Shopping' },
  education:     { icon: '📚', color: '#f59e0b', label: 'Education' },
  bills:         { icon: '💡', color: '#ef4444', label: 'Bills' },
  entertainment: { icon: '🎬', color: '#10b981', label: 'Entertainment' },
  health:        { icon: '💊', color: '#14b8a6', label: 'Health' },
  other:         { icon: '📦', color: '#94a3b8', label: 'Other' },
}

const PAYMENT_ICONS: Record<PaymentMethod, string> = {
  cash: '💵', card: '💳', upi: '📱', bank: '🏦', other: '💸'
}

function AddExpenseModal({ onSave, onClose }: {
  onSave: (e: Partial<Expense>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Expense>>({
    amount: 0, currency: 'INR', category: 'food',
    description: '', date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'upi', tags: []
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div className="glass-card w-full max-w-md p-5 relative z-10 space-y-3"
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>Add Expense</h3>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>

        {/* Amount */}
        <div className="glass-card p-4 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.05))' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Amount (INR)</p>
          <input
            type="number" min="0" step="0.01"
            className="text-3xl font-display font-bold text-center w-full bg-transparent border-none outline-none"
            style={{ color: '#7c3aed' }}
            value={form.amount || ''}
            placeholder="0.00"
            onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
        </div>

        {/* Category Grid */}
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Category</p>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <button key={key}
                onClick={() => setForm(f => ({ ...f, category: key as ExpenseCategory }))}
                className="p-2 rounded-xl text-center transition-all flex flex-col items-center gap-1"
                style={{
                  background: form.category === key ? `${cfg.color}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${form.category === key ? cfg.color : 'transparent'}`,
                  transform: form.category === key ? 'scale(1.05)' : 'scale(1)'
                }}>
                <span className="text-lg">{cfg.icon}</span>
                <span className="text-[10px]" style={{ color: form.category === key ? cfg.color : 'var(--color-text-muted)' }}>
                  {cfg.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <input className="input-field" placeholder="Description"
          value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Date</label>
            <input type="date" className="input-field"
              value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Payment</label>
            <select className="input-field" value={form.paymentMethod}
              onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}>
              {Object.entries(PAYMENT_ICONS).map(([k, v]) => (
                <option key={k} value={k}>{v} {k.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => { if ((form.amount || 0) > 0) { onSave(form); onClose() } }}
            className="btn-primary flex-1 flex items-center gap-2 justify-center">
            <Save size={14} /> Add Expense
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const CHART_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#14b8a6', '#94a3b8']

export function ExpensesPage() {
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'charts'>('list')
  const [selectedMonth] = useState(new Date())

  const allExpenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray(), [])

  const monthExpenses = useLiveQuery(async () => {
    const from = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
    const to = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
    return db.expenses.where('date').between(from, to, true, true).toArray()
  }, [selectedMonth])

  const todayExpenses = useLiveQuery(async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const exps = await db.expenses.where('date').equals(today).toArray()
    return exps.reduce((s, e) => s + e.amount, 0)
  }, [])

  const monthTotal = monthExpenses?.reduce((s, e) => s + e.amount, 0) || 0

  // Category breakdown for pie chart
  const categoryData = Object.entries(
    (monthExpenses || []).reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})
  ).map(([name, value]) => ({
    name: CATEGORY_CONFIG[name as ExpenseCategory]?.label || name,
    value,
    icon: CATEGORY_CONFIG[name as ExpenseCategory]?.icon || '📦',
    color: CATEGORY_CONFIG[name as ExpenseCategory]?.color || '#94a3b8'
  })).sort((a, b) => b.value - a.value)

  // Daily spending for bar chart (last 7 days)
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr = format(d, 'yyyy-MM-dd')
    const total = (allExpenses || []).filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0)
    return { day: format(d, 'EEE'), amount: total }
  })

  const handleAdd = async (expData: Partial<Expense>) => {
    await ExpensesDB.add(expData)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-3 py-2 text-sm">
          <p style={{ color: 'var(--color-text)' }}>₹{payload[0].value.toLocaleString('en-IN')}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="page-content">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl gradient-text">Expenses</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {format(selectedMonth, 'MMMM yyyy')} tracker
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 glass-card p-1">
              {(['list', 'charts'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: viewMode === m ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'transparent',
                    color: viewMode === m ? 'white' : 'var(--color-text-muted)'
                  }}>
                  {m === 'list' ? '📋' : '📊'} {m}
                </button>
              ))}
            </div>
            <motion.button className="btn-primary flex items-center gap-2"
              onClick={() => setShowModal(true)} whileHover={{ scale: 1.03 }}>
              <Plus size={16} /> Add
            </motion.button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Today", value: todayExpenses || 0, icon: '📅', color: '#06b6d4' },
            { label: "This Month", value: monthTotal, icon: '📆', color: '#7c3aed' },
            { label: "Transactions", value: monthExpenses?.length || 0, icon: '🧾', color: '#f59e0b', isCount: true },
            { label: "Top Category", value: categoryData[0]?.name || 'N/A', icon: categoryData[0]?.icon || '📦', color: '#10b981', isText: true },
          ].map(({ label, value, icon, color, isCount, isText }) => (
            <motion.div key={label} className="glass-card p-4"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{icon}</span>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              </div>
              <p className="font-display font-bold text-xl" style={{ color }}>
                {isText ? value : isCount ? value : `₹${(value as number).toLocaleString('en-IN')}`}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Charts View */}
        {viewMode === 'charts' && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Pie Chart */}
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                Category Breakdown
              </h3>
              {categoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsPieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={3} dataKey="value">
                        {categoryData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, '']}
                        contentStyle={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#e2e8f0' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-3">
                    {categoryData.map(cat => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {cat.icon} {cat.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: cat.color }}>
                          ₹{cat.value.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                  No data this month
                </div>
              )}
            </div>

            {/* Bar Chart */}
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
                Last 7 Days
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" />
                  <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="glass-card divide-y divide-white/5">
            {allExpenses && allExpenses.length > 0 ? (
              allExpenses.slice(0, 50).map((expense, i) => {
                const cfg = CATEGORY_CONFIG[expense.category]
                return (
                  <motion.div key={expense.id}
                    className="p-4 flex items-center gap-4"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${cfg.color}15` }}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                        {expense.description || cfg.label}
                      </p>
                      <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                        <span>{expense.date}</span>
                        <span>{PAYMENT_ICONS[expense.paymentMethod]}</span>
                        <span className="badge text-[9px]" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm" style={{ color: '#ef4444' }}>
                        -₹{expense.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <button onClick={() => ExpensesDB.delete(expense.id!)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-colors opacity-30 hover:opacity-100"
                      style={{ color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                )
              })
            ) : (
              <div className="p-16 text-center">
                <DollarSign size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-display font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No expenses yet</p>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Track your spending offline</p>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                  <Plus size={14} className="inline mr-1" /> Add First Expense
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && <AddExpenseModal onSave={handleAdd} onClose={() => setShowModal(false)} />}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 rounded-full flex items-center justify-center z-30"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
        onClick={() => setShowModal(true)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <Plus size={24} color="white" />
      </motion.button>
    </div>
  )
}
