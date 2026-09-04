import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus, Search, Star, Archive, Trash2, Pin, Lock,
  CheckSquare, FileText, X, Tag, Filter, MoreVertical, Save
} from 'lucide-react'
import { db } from '@/db/schema'
import { NotesDB } from '@/db/operations'
import type { Note } from '@/db/schema'
import { format } from 'date-fns'

const NOTE_COLORS = [
  '#141C35', '#1a1a2e', '#16213e', '#0f3460', '#1b4332', '#1a0a2e'
]

const CATEGORIES = ['All', 'general', 'work', 'personal', 'travel', 'study', 'health']

function NoteCard({ note, onClick, onTogglePin, onToggleFav, onArchive, onDelete }: {
  note: Note
  onClick: () => void
  onTogglePin: () => void
  onToggleFav: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const done = note.checklistItems.filter(i => i.checked).length
  const total = note.checklistItems.length

  return (
    <motion.div
      layout
      className="glass-card p-4 cursor-pointer relative"
      style={{ background: note.color || '#141C35' }}
      onClick={onClick}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}>

      {note.isPinned && (
        <div className="absolute top-2 right-8">
          <Pin size={12} style={{ color: '#f59e0b' }} />
        </div>
      )}

      <div className="absolute top-2 right-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
          className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-muted)' }}>
          <MoreVertical size={14} />
        </button>
        <AnimatePresence>
          {showMenu && (
            <motion.div
              className="glass-card absolute right-0 top-6 w-40 py-1 z-50 text-xs"
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={e => e.stopPropagation()}>
              {[
                { label: note.isPinned ? 'Unpin' : 'Pin', action: onTogglePin, icon: Pin },
                { label: note.isFavorite ? 'Unfavorite' : 'Favorite', action: onToggleFav, icon: Star },
                { label: 'Archive', action: onArchive, icon: Archive },
                { label: 'Delete', action: onDelete, icon: Trash2, danger: true },
              ].map(({ label, action, icon: Icon, danger }) => (
                <button key={label}
                  onClick={() => { action(); setShowMenu(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[rgba(124,58,237,0.1)] transition-colors"
                  style={{ color: danger ? '#ef4444' : 'var(--color-text-muted)' }}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pr-6">
        {note.isLocked ? (
          <div className="flex items-center gap-2 my-4">
            <Lock size={20} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Locked</span>
          </div>
        ) : (
          <>
            {note.title && (
              <h3 className="font-semibold text-sm mb-1 font-display" style={{ color: 'var(--color-text)' }}>
                {note.title}
              </h3>
            )}
            {note.type === 'text' && note.content && (
              <p className="text-xs line-clamp-4" style={{ color: 'var(--color-text-muted)' }}>
                {note.content.replace(/[#*_`\[\]]/g, '').slice(0, 180)}
              </p>
            )}
            {note.type === 'checklist' && total > 0 && (
              <div className="space-y-1 mt-1">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(done / total) * 100}%` }} />
                </div>
                {note.checklistItems.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded flex-shrink-0 ${item.checked ? 'bg-violet-500' : 'border border-[rgba(124,58,237,0.3)]'}`}
                      style={{ background: item.checked ? '#7c3aed' : undefined }} />
                    <span className={`text-xs ${item.checked ? 'line-through opacity-50' : ''}`}
                      style={{ color: 'var(--color-text-muted)' }}>{item.text}</span>
                  </div>
                ))}
                {total > 4 && (
                  <p className="text-xs opacity-50" style={{ color: 'var(--color-text-muted)' }}>+{total - 4} more</p>
                )}
                <p className="text-xs mt-1" style={{ color: '#a78bfa' }}>{done}/{total} done</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="badge badge-violet text-[9px]">#{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2"
        style={{ borderTop: '1px solid rgba(124,58,237,0.1)' }}>
        <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
          {format(new Date(note.updatedAt), 'MMM d')}
        </span>
        <div className="flex items-center gap-1">
          {note.isFavorite && <Star size={10} style={{ color: '#f59e0b' }} fill="#f59e0b" />}
          {note.type === 'checklist' ? <CheckSquare size={10} style={{ color: '#7c3aed' }} /> : <FileText size={10} style={{ color: '#06b6d4' }} />}
        </div>
      </div>
    </motion.div>
  )
}

function NoteEditor({ note, onSave, onClose }: {
  note: Partial<Note>
  onSave: (n: Partial<Note>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Note>>({
    title: '', content: '', type: 'text', checklistItems: [],
    tags: [], category: 'general', color: '#141C35',
    isPinned: false, isFavorite: false, ...note
  })
  const [tagInput, setTagInput] = useState('')
  const [newItem, setNewItem] = useState('')

  const addTag = () => {
    if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...(f.tags || []), tagInput.trim()] }))
      setTagInput('')
    }
  }

  const addChecklistItem = () => {
    if (newItem.trim()) {
      const item = { id: crypto.randomUUID(), text: newItem.trim(), checked: false, createdAt: new Date() }
      setForm(f => ({ ...f, checklistItems: [...(f.checklistItems || []), item] }))
      setNewItem('')
    }
  }

  const toggleItem = (id: string) => {
    setForm(f => ({
      ...f,
      checklistItems: f.checklistItems?.map(i => i.id === id ? { ...i, checked: !i.checked } : i) || []
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div
        className="glass-card w-full max-w-xl max-h-[90vh] overflow-y-auto relative z-10 p-5"
        style={{ background: form.color || '#141C35' }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, type: 'text', checklistItems: [] }))}
              className={`badge text-xs px-3 py-1 cursor-pointer ${form.type === 'text' ? 'badge-violet' : ''}`}>
              <FileText size={10} /> Text
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, type: 'checklist' }))}
              className={`badge text-xs px-3 py-1 cursor-pointer ${form.type === 'checklist' ? 'badge-violet' : ''}`}>
              <CheckSquare size={10} /> List
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setForm(f => ({ ...f, isPinned: !f.isPinned }))}
              style={{ color: form.isPinned ? '#f59e0b' : 'var(--color-text-muted)' }}>
              <Pin size={16} />
            </button>
            <button onClick={() => setForm(f => ({ ...f, isFavorite: !f.isFavorite }))}
              style={{ color: form.isFavorite ? '#f59e0b' : 'var(--color-text-muted)' }}>
              <Star size={16} fill={form.isFavorite ? '#f59e0b' : 'none'} />
            </button>
            <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
          </div>
        </div>

        <input
          className="input-field mb-3 text-base font-semibold"
          placeholder="Title"
          value={form.title || ''}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />

        {form.type === 'text' ? (
          <textarea
            className="input-field resize-none mb-3"
            rows={8}
            placeholder="Start writing... (markdown supported)"
            value={form.content || ''}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
        ) : (
          <div className="mb-3 space-y-2">
            {form.checklistItems?.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <button onClick={() => toggleItem(item.id)}
                  className="w-4 h-4 rounded border-2 flex-shrink-0 transition-all"
                  style={{
                    borderColor: '#7c3aed',
                    background: item.checked ? '#7c3aed' : 'transparent'
                  }} />
                <span className={`flex-1 text-sm ${item.checked ? 'line-through opacity-50' : ''}`}
                  style={{ color: 'var(--color-text)' }}>{item.text}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input className="input-field text-sm" placeholder="Add item..."
                value={newItem} onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                style={{ background: 'rgba(255,255,255,0.05)' }} />
              <button onClick={addChecklistItem} className="btn-primary p-2">
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            {form.tags?.map(tag => (
              <span key={tag} className="badge badge-violet text-xs flex items-center gap-1">
                #{tag}
                <button onClick={() => setForm(f => ({ ...f, tags: f.tags?.filter(t => t !== tag) }))}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input-field text-sm" placeholder="Add tag..."
              value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              style={{ background: 'rgba(255,255,255,0.05)' }} />
            <button onClick={addTag} className="btn-ghost p-2"><Tag size={14} /></button>
          </div>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Color:</span>
          {NOTE_COLORS.map(color => (
            <button key={color} onClick={() => setForm(f => ({ ...f, color }))}
              className="w-6 h-6 rounded-lg border-2 transition-all"
              style={{ background: color, borderColor: form.color === color ? '#7c3aed' : 'transparent' }} />
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => { onSave(form); onClose() }} className="btn-primary flex-1 flex items-center gap-2 justify-center">
            <Save size={14} /> Save Note
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function NotesPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [showTrash, setShowTrash] = useState(false)

  const notes = useLiveQuery(() => db.notes
    .where({ isArchived: showArchive ? 1 : 0, isDeleted: showTrash ? 1 : 0 })
    .reverse()
    .sortBy('updatedAt'), [showArchive, showTrash])

  const filteredNotes = notes?.filter(note => {
    const matchesSearch = !search || note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.content.toLowerCase().includes(search.toLowerCase()) ||
      note.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchesFilter = filter === 'All' || note.category === filter
    return matchesSearch && matchesFilter
  }) || []

  const pinnedNotes = filteredNotes.filter(n => n.isPinned)
  const regularNotes = filteredNotes.filter(n => !n.isPinned)

  const handleSaveNote = async (noteData: Partial<Note>) => {
    if (noteData.id) {
      await NotesDB.update(noteData.id, noteData)
    } else {
      await NotesDB.add(noteData)
    }
  }

  return (
    <div className="page-content">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl gradient-text">Notes</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {notes?.length ?? 0} notes stored offline
            </p>
          </div>
          <motion.button
            className="btn-primary flex items-center gap-2"
            onClick={() => setEditingNote({})}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Plus size={16} /> New Note
          </motion.button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              className="input-field pl-9"
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button key={cat}
                onClick={() => setFilter(cat)}
                className={`flex-shrink-0 badge text-xs px-3 py-1.5 cursor-pointer transition-all ${filter === cat ? 'badge-violet' : ''}`}
                style={{ background: filter === cat ? undefined : 'rgba(255,255,255,0.05)', color: filter === cat ? undefined : 'var(--color-text-muted)' }}>
                {cat}
              </button>
            ))}
            <button onClick={() => setShowArchive(!showArchive)}
              className={`flex-shrink-0 badge text-xs px-3 py-1.5 cursor-pointer ${showArchive ? 'badge-amber' : ''}`}
              style={{ background: showArchive ? undefined : 'rgba(255,255,255,0.05)', color: showArchive ? undefined : 'var(--color-text-muted)' }}>
              <Archive size={10} /> Archive
            </button>
          </div>
        </div>

        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1"
              style={{ color: 'var(--color-text-muted)' }}>
              <Pin size={10} /> Pinned
            </h2>
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" layout>
              {pinnedNotes.map(note => (
                <NoteCard key={note.id} note={note}
                  onClick={() => setEditingNote(note)}
                  onTogglePin={() => NotesDB.update(note.id!, { isPinned: !note.isPinned })}
                  onToggleFav={() => NotesDB.update(note.id!, { isFavorite: !note.isFavorite })}
                  onArchive={() => NotesDB.update(note.id!, { isArchived: true })}
                  onDelete={() => NotesDB.softDelete(note.id!)}
                />
              ))}
            </motion.div>
          </div>
        )}

        {/* Regular Notes */}
        {regularNotes.length > 0 ? (
          <div>
            {pinnedNotes.length > 0 && (
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-muted)' }}>Others</h2>
            )}
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" layout>
              {regularNotes.map(note => (
                <NoteCard key={note.id} note={note}
                  onClick={() => setEditingNote(note)}
                  onTogglePin={() => NotesDB.update(note.id!, { isPinned: !note.isPinned })}
                  onToggleFav={() => NotesDB.update(note.id!, { isFavorite: !note.isFavorite })}
                  onArchive={() => NotesDB.update(note.id!, { isArchived: !note.isArchived })}
                  onDelete={() => NotesDB.softDelete(note.id!)}
                />
              ))}
            </motion.div>
          </div>
        ) : (
          filteredNotes.length === 0 && (
            <div className="glass-card p-16 text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-display font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                {search ? 'No notes found' : 'Start writing!'}
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                {search ? 'Try a different search term' : 'Your notes are stored privately, offline-first.'}
              </p>
              {!search && (
                <button className="btn-primary" onClick={() => setEditingNote({})}>
                  <Plus size={14} className="inline mr-1" /> Create First Note
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* Note Editor Modal */}
      <AnimatePresence>
        {editingNote !== null && (
          <NoteEditor
            note={editingNote}
            onSave={handleSaveNote}
            onClose={() => setEditingNote(null)}
          />
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 rounded-full flex items-center justify-center z-30 shadow-glow-violet"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}
        onClick={() => setEditingNote({})}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <Plus size={24} color="white" />
      </motion.button>
    </div>
  )
}
