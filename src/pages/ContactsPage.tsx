import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus, Phone, Mail, MapPin, Search,
  Users, AlertTriangle, X, Save, Trash2, Edit2,
  ShieldCheck, HeartHandshake, PhoneCall, Sparkles
} from 'lucide-react'
import { db } from '@/db/schema'
import { ContactsDB } from '@/db/operations'
import type { Contact, ContactCategory } from '@/db/schema'

const CATEGORY_CONFIG: Record<ContactCategory, { color: string; bg: string; icon: string; label: string }> = {
  family:    { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', icon: '👨‍👩‍👧', label: 'Family' },
  friend:    { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)',  icon: '👫', label: 'Friends' },
  work:      { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: '💼', label: 'Work' },
  medical:   { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', icon: '🏥', label: 'Medical' },
  emergency: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)',  icon: '🚨', label: 'Emergency' },
  other:     { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)',icon: '👤', label: 'Other' },
}

const PASTEL_GRADIENTS = [
  'linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%)',
  'linear-gradient(135deg, #38bdf8 0%, #7dd3fc 100%)',
  'linear-gradient(135deg, #f472b6 0%, #fbcfe8 100%)',
  'linear-gradient(135deg, #fbbf24 0%, #fde68a 100%)',
  'linear-gradient(135deg, #34d399 0%, #a7f3d0 100%)',
  'linear-gradient(135deg, #818cf8 0%, #c7d2fe 100%)',
]

function ContactModal({ contact, onSave, onClose }: {
  contact?: Contact
  onSave: (c: Partial<Contact>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Contact>>({
    name: '', phone: '', email: '', address: '',
    category: 'other', notes: '', isEmergencyContact: false,
    tags: [], birthday: null, ...contact
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <motion.div
        className="glass-card w-full max-w-lg p-6 relative z-10 space-y-4 max-h-[90vh] overflow-y-auto rounded-3xl"
        style={{
          background: 'linear-gradient(160deg, rgba(26,27,34,0.95), rgba(18,19,24,0.98))',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
              / Cogni:wave
            </span>
            <h3 className="font-display font-bold text-lg" style={{ color: 'var(--color-text)' }}>
              {contact?.id ? 'Edit Contact' : 'New Contact'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Full Name *</label>
            <input className="input-field rounded-2xl" placeholder="e.g. Maya Lin"
              value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Phone</label>
            <input className="input-field rounded-2xl" placeholder="+91 98765 43210"
              value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Email</label>
            <input className="input-field rounded-2xl" placeholder="name@domain.com"
              value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Address / Location</label>
            <input className="input-field rounded-2xl" placeholder="Street, Neighborhood, City"
              value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Category</label>
            <select className="input-field rounded-2xl" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as ContactCategory }))}>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Birthday</label>
            <input type="date" className="input-field rounded-2xl"
              value={form.birthday || ''} onChange={e => setForm(f => ({ ...f, birthday: e.target.value || null }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Personal Notes & Medical Instructions</label>
            <textarea className="input-field rounded-2xl resize-none" rows={2} placeholder="Emergency contact notes, allergies, blood group..."
              value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-2xl transition-colors"
          style={{ background: form.isEmergencyContact ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div onClick={() => setForm(f => ({ ...f, isEmergencyContact: !f.isEmergencyContact }))}
            className="w-11 h-6 rounded-full transition-all"
            style={{ background: form.isEmergencyContact ? '#ef4444' : 'rgba(255,255,255,0.15)' }}>
            <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${form.isEmergencyContact ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: form.isEmergencyContact ? '#fca5a5' : 'var(--color-text)' }}>
              Emergency SOS Contact
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Elevates contact to instant one-tap SOS calling in Emergency Mode
            </p>
          </div>
        </label>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1 rounded-full">Cancel</button>
          <button onClick={() => { if (form.name?.trim()) { onSave(form); onClose() } }}
            className="btn-primary flex-1 flex items-center gap-2 justify-center rounded-full">
            <Save size={14} /> Save Contact
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function ContactsPage() {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [editContact, setEditContact] = useState<Contact | undefined>()
  const [showModal, setShowModal] = useState(false)

  const contacts = useLiveQuery(async () => {
    const list = await db.contacts.toArray()
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [])

  const filtered = contacts?.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q) || (c.address && c.address.toLowerCase().includes(q))
    const matchCat = filterCat === 'all' || c.category === filterCat
    return matchSearch && matchCat
  }) || []

  const emergencyContacts = contacts?.filter(c => c.isEmergencyContact) || []

  const handleSave = async (data: Partial<Contact>) => {
    if (editContact?.id) await ContactsDB.update(editContact.id, data)
    else await ContactsDB.add(data)
  }

  return (
    <div className="page-content">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Cogni:wave Editorial Hero Banner ─────────────────────────────────── */}
        <motion.div
          className="relative overflow-hidden rounded-[32px] p-6 sm:p-8 border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(28,29,38,0.9) 0%, rgba(17,18,24,0.95) 100%)',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
          }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Subtle decorative glow orb */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-300 text-xs font-mono font-medium">
                <Sparkles size={12} />
                <span>OUR CIRCLE • PRIVATE & OFFLINE</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
                Trusted Contacts
              </h1>
              <p className="text-sm max-w-xl" style={{ color: 'var(--color-text-muted)' }}>
                Keep your family, medical specialists, and emergency lifelines stored safely in your device’s local vault. Zero external cloud tracking.
              </p>

              {/* Status Chips */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {contacts?.length || 0} Contacts Saved
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-rose-300">
                  <AlertTriangle size={12} />
                  {emergencyContacts.length} Emergency SOS
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-purple-300">
                  <ShieldCheck size={12} />
                  100% Offline Accessible
                </span>
              </div>
            </div>

            <motion.button
              className="flex-shrink-0 inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full text-sm font-semibold text-white transition-transform shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                boxShadow: '0 8px 20px rgba(124, 58, 237, 0.35)'
              }}
              onClick={() => { setEditContact(undefined); setShowModal(true) }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Plus size={16} />
              <span>Add Contact</span>
            </motion.button>
          </div>
        </motion.div>

        {/* ── Emergency SOS Priority Row ───────────────────────────────────────── */}
        {emergencyContacts.length > 0 && (
          <motion.div
            className="rounded-[28px] p-5 border border-red-500/20"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(26, 20, 24, 0.6) 100%)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  / SOS • Priority Lifelines
                </span>
                <span className="text-xs text-red-300/80 font-medium">Instant One-Tap Calling</span>
              </div>
              <span className="text-xs text-red-400 font-semibold">{emergencyContacts.length} Ready</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {emergencyContacts.map(c => (
                <div
                  key={c.id}
                  className="rounded-2xl p-3 flex items-center justify-between border border-red-500/15 bg-black/20 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-red-100 flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>
                        {c.name}
                      </p>
                      <p className="text-xs text-red-300/80 truncate">
                        {c.notes || CATEGORY_CONFIG[c.category]?.label}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`tel:${c.phone}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-400 text-white transition-transform hover:scale-110 flex-shrink-0 shadow"
                    title={`Call ${c.name}`}
                  >
                    <PhoneCall size={14} />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Search + Filter Pills ───────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="w-full pl-11 pr-4 py-2.5 rounded-full text-sm outline-none transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--color-text)',
              }}
              placeholder="Search by name, phone, address, notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full md:w-auto">
            <button
              onClick={() => setFilterCat('all')}
              className={`flex-shrink-0 text-xs px-4 py-2 rounded-full font-medium transition-all ${
                filterCat === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/5'
              }`}
            >
              All ({contacts?.length || 0})
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => {
              const count = contacts?.filter(c => c.category === k).length || 0
              if (count === 0) return null
              const active = filterCat === k
              return (
                <button
                  key={k}
                  onClick={() => setFilterCat(k)}
                  className={`flex-shrink-0 text-xs px-4 py-2 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/5'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Cogni:wave Card Grid ────────────────────────────────────────────── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((contact, index) => {
              const conf = CATEGORY_CONFIG[contact.category]
              const grad = PASTEL_GRADIENTS[index % PASTEL_GRADIENTS.length]
              const indexStr = String(index + 1).padStart(2, '0')

              return (
                <motion.div
                  key={contact.id}
                  className="flex flex-col group cursor-pointer"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => { setEditContact(contact); setShowModal(true) }}
                >
                  {/* Folder Tab Notch (Signature Cogni:wave) */}
                  <div className="flex items-center pl-4">
                    <div
                      className="px-3.5 py-1 rounded-t-xl text-[11px] font-mono font-medium tracking-wide flex items-center gap-1.5 transition-colors"
                      style={{
                        background: 'rgba(32, 33, 44, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderBottom: 'none',
                        color: conf.color,
                      }}
                    >
                      <span className="opacity-60">/ {indexStr}</span>
                      <span>•</span>
                      <span>{conf.label}</span>
                    </div>
                  </div>

                  {/* Card Container */}
                  <div
                    className="flex-1 rounded-3xl rounded-tl-none p-5 flex flex-col justify-between transition-all duration-300 group-hover:-translate-y-1"
                    style={{
                      background: 'linear-gradient(160deg, rgba(26,27,36,0.95) 0%, rgba(18,19,26,0.98) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {/* Top Content Row */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          {/* Visual Avatar */}
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-xl text-neutral-900 shadow-md flex-shrink-0"
                            style={{ background: grad }}
                          >
                            {contact.photo ? (
                              <img src={contact.photo} alt={contact.name} className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                              <span>{contact.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-display font-bold text-base tracking-tight truncate group-hover:text-purple-300 transition-colors"
                              style={{ color: 'var(--color-text)' }}>
                              {contact.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs" style={{ color: conf.color }}>
                                {conf.icon} {contact.notes || conf.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {contact.isEmergencyContact && (
                          <span className="badge badge-red text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                            🚨 SOS
                          </span>
                        )}
                      </div>

                      {/* Contact Details List */}
                      <div className="space-y-1.5 pt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {contact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={13} className="text-purple-400 flex-shrink-0" />
                            <span className="font-mono">{contact.phone}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail size={13} className="text-cyan-400 flex-shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.address && (
                          <div className="flex items-center gap-2 truncate">
                            <MapPin size={13} className="text-amber-400 flex-shrink-0" />
                            <span className="truncate">{contact.address}</span>
                          </div>
                        )}
                        {contact.birthday && (
                          <div className="flex items-center gap-2">
                            <span>🎂</span>
                            <span>{contact.birthday}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signature Cogni:wave Bottom Action Row */}
                    <div className="pt-5 mt-4 border-t border-white/5 flex items-center justify-between">
                      {/* Left: Pill Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditContact(contact)
                          setShowModal(true)
                        }}
                        className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'var(--color-text)',
                          border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(124, 58, 237, 0.2)'
                          e.currentTarget.style.color = '#c4b5fd'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                          e.currentTarget.style.color = 'var(--color-text)'
                        }}
                      >
                        View Details
                      </button>

                      {/* Right: Circular Icon Actions */}
                      <div className="flex items-center gap-2">
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                            style={{
                              background: 'rgba(124, 58, 237, 0.15)',
                              color: '#a78bfa',
                              border: '1px solid rgba(124, 58, 237, 0.25)'
                            }}
                            title={`Call ${contact.name}`}
                          >
                            <Phone size={14} />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Remove ${contact.name}?`)) {
                              ContactsDB.delete(contact.id!)
                            }
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/20 text-neutral-400 hover:text-red-400"
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                          title="Delete Contact"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[32px] p-16 text-center border border-white/5 bg-white/[0.02]">
            <HeartHandshake size={48} className="mx-auto mb-4 opacity-20 text-purple-400" />
            <p className="font-display font-semibold text-lg mb-1" style={{ color: 'var(--color-text)' }}>
              {search ? 'No matching contacts found' : 'Your offline circle is empty'}
            </p>
            <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Add emergency lifelines, family members, and medical doctors to keep them easily reachable without internet.
            </p>
            <button
              className="btn-primary rounded-full px-6 py-2.5 text-sm"
              onClick={() => { setEditContact(undefined); setShowModal(true) }}
            >
              <Plus size={14} className="inline mr-1.5" /> Add Contact
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <ContactModal
            contact={editContact}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditContact(undefined) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
