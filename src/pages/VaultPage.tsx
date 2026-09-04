import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { Lock, Eye, EyeOff, Plus, X, Save, Shield, Key, Trash2, ChevronDown } from 'lucide-react'
import CryptoJS from 'crypto-js'
import { db } from '@/db/schema'
import type { VaultItem, VaultCategory } from '@/db/schema'

const CATEGORY_CONFIG: Record<VaultCategory, { icon: string; label: string; color: string }> = {
  personal:  { icon: '👤', label: 'Personal Info', color: '#7c3aed' },
  address:   { icon: '🏠', label: 'Addresses', color: '#06b6d4' },
  document:  { icon: '📄', label: 'Documents', color: '#f59e0b' },
  vehicle:   { icon: '🚗', label: 'Vehicle', color: '#10b981' },
  academic:  { icon: '🎓', label: 'Academic', color: '#8b5cf6' },
  work:      { icon: '💼', label: 'Work', color: '#ec4899' },
  insurance: { icon: '🛡️', label: 'Insurance', color: '#14b8a6' },
  financial: { icon: '💰', label: 'Financial', color: '#f97316' },
  other:     { icon: '📦', label: 'Other', color: '#94a3b8' },
}

const DEFAULT_PIN = '1234'

function PinEntry({ onSuccess, title, subtitle }: {
  onSuccess: (pin: string) => void
  title: string
  subtitle?: string
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleDigit = (d: string) => {
    const next = pin + d
    setPin(next)
    setError(false)
    if (next.length === 4) {
      // Validate against stored PIN (default: 1234)
      const stored = localStorage.getItem('lifemap_vault_pin') || DEFAULT_PIN
      if (next === stored) {
        onSuccess(next)
      } else {
        setError(true)
        setTimeout(() => { setPin(''); setError(false) }, 600)
      }
    }
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
        <Lock size={28} color="white" />
      </div>
      <h2 className="font-display font-bold text-2xl mb-1" style={{ color: 'var(--color-text)' }}>{title}</h2>
      {subtitle && <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>}

      {/* PIN Dots */}
      <div className="flex gap-4 mb-8">
        {[0,1,2,3].map(i => (
          <motion.div key={i}
            className="w-4 h-4 rounded-full border-2"
            style={{
              borderColor: error ? '#ef4444' : '#7c3aed',
              background: i < pin.length ? (error ? '#ef4444' : '#7c3aed') : 'transparent'
            }}
            animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.3 }} />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {digits.map((d, i) => (
          <motion.button key={i}
            className="h-16 rounded-2xl font-display font-bold text-xl flex items-center justify-center"
            style={{
              background: d ? 'rgba(124,58,237,0.1)' : 'transparent',
              border: d ? '1px solid rgba(124,58,237,0.2)' : 'none',
              color: 'var(--color-text)'
            }}
            onClick={() => {
              if (d === '⌫') setPin(p => p.slice(0, -1))
              else if (d) handleDigit(d)
            }}
            whileHover={d ? { scale: 1.05, background: 'rgba(124,58,237,0.2)' } : {}}
            whileTap={d ? { scale: 0.95 } : {}}>
            {d}
          </motion.button>
        ))}
      </div>
      <p className="text-xs mt-6" style={{ color: 'var(--color-text-dim)' }}>Default PIN: 1234</p>
    </div>
  )
}

function AddVaultItemModal({ onSave, onClose, pin }: {
  onSave: (item: Partial<VaultItem>) => void
  onClose: () => void
  pin: string
}) {
  const [form, setForm] = useState({ category: 'personal' as VaultCategory, label: '', fields: [{ key: '', value: '' }] })

  const addField = () => setForm(f => ({ ...f, fields: [...f.fields, { key: '', value: '' }] }))
  const updateField = (i: number, k: string, v: string) =>
    setForm(f => ({ ...f, fields: f.fields.map((fld, j) => j === i ? { ...fld, [k]: v } : fld) }))

  const handleSave = () => {
    if (!form.label.trim()) return
    const data: Record<string, string> = {}
    form.fields.filter(f => f.key && f.value).forEach(f => { data[f.key] = f.value })
    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(data), pin).toString()
    onSave({ category: form.category, label: form.label, encryptedData, icon: CATEGORY_CONFIG[form.category].icon })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div className="glass-card w-full max-w-md p-5 relative z-10 max-h-[90vh] overflow-y-auto space-y-3"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>Add to Vault</h3>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>

        <select className="input-field" value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value as VaultCategory }))}>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>

        <input className="input-field" placeholder="Label (e.g. 'Driving License')"
          value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />

        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Fields (encrypted with your PIN)
          </p>
          {form.fields.map((field, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input className="input-field text-xs" placeholder="Field name"
                value={field.key} onChange={e => updateField(i, 'key', e.target.value)} />
              <input className="input-field text-xs" placeholder="Value" type="text"
                value={field.value} onChange={e => updateField(i, 'value', e.target.value)} />
            </div>
          ))}
          <button onClick={addField} className="btn-ghost w-full text-xs flex items-center gap-1 justify-center">
            <Plus size={12} /> Add Field
          </button>
        </div>

        <div className="p-3 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <Lock size={14} style={{ color: '#7c3aed' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Data is encrypted with AES before storage. Only you can decrypt it with your PIN.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 flex items-center gap-2 justify-center">
            <Save size={14} /> Encrypt & Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function VaultCard({ item, pin }: { item: VaultItem; pin: string }) {
  const [revealed, setRevealed] = useState(false)
  const [decrypted, setDecrypted] = useState<Record<string, string>>({})
  const cfg = CATEGORY_CONFIG[item.category]

  const reveal = () => {
    try {
      const bytes = CryptoJS.AES.decrypt(item.encryptedData, pin)
      const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
      setDecrypted(data)
      setRevealed(true)
    } catch { setRevealed(false) }
  }

  return (
    <motion.div className="glass-card p-4" layout
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${cfg.color}20` }}>
            {cfg.icon}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{item.label}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{cfg.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => revealed ? setRevealed(false) : reveal()}
            className="p-2 rounded-lg transition-all hover:bg-[rgba(124,58,237,0.1)]"
            style={{ color: revealed ? '#7c3aed' : 'var(--color-text-muted)' }}>
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button onClick={() => db.vaultItems.delete(item.id!)}
            className="p-2 rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-colors"
            style={{ color: 'var(--color-text-dim)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {revealed && Object.entries(decrypted).length > 0 && (
        <motion.div className="space-y-1.5" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
          {Object.entries(decrypted).map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 p-2 rounded-lg"
              style={{ background: 'rgba(124,58,237,0.05)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0"
                style={{ color: 'var(--color-text-muted)' }}>{k}</span>
              <span className="text-sm text-right font-mono" style={{ color: 'var(--color-text)' }}>{v}</span>
            </div>
          ))}
        </motion.div>
      )}

      {!revealed && (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex gap-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: 'rgba(124,58,237,0.3)' }} />
            ))}
          </div>
          <span className="text-xs" style={{ color: 'var(--color-text-dim)' }}>Tap eye to reveal</span>
        </div>
      )}
    </motion.div>
  )
}

export function VaultPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [filterCat, setFilterCat] = useState<VaultCategory | 'all'>('all')

  const items = useLiveQuery(() => db.vaultItems.orderBy('category').toArray(), [])

  const filtered = items?.filter(i => filterCat === 'all' || i.category === filterCat) || []

  const grouped = filtered.reduce<Record<string, VaultItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const handleUnlock = (enteredPin: string) => {
    setPin(enteredPin)
    setUnlocked(true)
  }

  const handleAdd = async (data: Partial<VaultItem>) => {
    await db.vaultItems.add({ ...data, createdAt: new Date(), updatedAt: new Date() } as VaultItem)
  }

  if (!unlocked) {
    return (
      <div className="page-content">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <h1 className="font-display font-bold text-2xl gradient-text">Secure Vault</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              AES-encrypted local storage
            </p>
          </div>
          <div className="glass-card p-2" style={{ background: 'rgba(124,58,237,0.05)' }}>
            <PinEntry onSuccess={handleUnlock} title="Enter Vault PIN"
              subtitle="Your data is encrypted locally. Only you can access it." />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-2xl gradient-text">Secure Vault</h1>
              <span className="badge badge-green text-xs flex items-center gap-1">
                <Shield size={10} /> Unlocked
              </span>
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {items?.length || 0} encrypted items • AES-256
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setUnlocked(false); setPin('') }} className="btn-ghost flex items-center gap-2">
              <Lock size={14} /> Lock
            </button>
            <motion.button className="btn-primary flex items-center gap-2"
              onClick={() => setShowAdd(true)} whileHover={{ scale: 1.03 }}>
              <Plus size={16} /> Add Item
            </motion.button>
          </div>
        </div>

        {/* Security Banner */}
        <div className="glass-card p-4 mb-6 flex items-center gap-3"
          style={{ background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.25)' }}>
          <Lock size={18} style={{ color: '#7c3aed' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            All vault data is encrypted with AES-256 using your PIN before being saved to IndexedDB.
            The PIN never leaves your device.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {(['all', ...Object.keys(CATEGORY_CONFIG)] as (VaultCategory | 'all')[]).map(cat => (
            <button key={cat}
              onClick={() => setFilterCat(cat)}
              className={`flex-shrink-0 badge text-xs px-3 py-1.5 cursor-pointer ${filterCat === cat ? 'badge-violet' : ''}`}
              style={{ background: filterCat === cat ? undefined : 'rgba(255,255,255,0.05)', color: filterCat === cat ? undefined : 'var(--color-text-muted)' }}>
              {cat === 'all' ? '🔐 All' : `${CATEGORY_CONFIG[cat].icon} ${CATEGORY_CONFIG[cat].label}`}
            </button>
          ))}
        </div>

        {/* Vault Items */}
        {Object.entries(grouped).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cat, catItems]) => (
              <div key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
                  style={{ color: CATEGORY_CONFIG[cat as VaultCategory]?.color || '#94a3b8' }}>
                  {CATEGORY_CONFIG[cat as VaultCategory]?.icon} {CATEGORY_CONFIG[cat as VaultCategory]?.label}
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {catItems.map(item => <VaultCard key={item.id} item={item} pin={pin} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-16 text-center">
            <Lock size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-display font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Vault is empty</p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Store sensitive info encrypted with your PIN
            </p>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={14} className="inline mr-1" /> Add First Item
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddVaultItemModal pin={pin} onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      </AnimatePresence>
    </div>
  )
}
