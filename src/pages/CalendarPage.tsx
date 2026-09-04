import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { Plus, X, Save, Calendar as CalIcon, MapPin } from 'lucide-react'
import { db } from '@/db/schema'
import { EventsDB } from '@/db/operations'
import type { CalendarEvent, EventType } from '@/db/schema'
import { format } from 'date-fns'

const EVENT_TYPE_CONFIG: Record<EventType, { color: string; icon: string; label: string }> = {
  event:     { color: '#7c3aed', icon: '📅', label: 'Event' },
  reminder:  { color: '#f59e0b', icon: '⏰', label: 'Reminder' },
  birthday:  { color: '#ec4899', icon: '🎂', label: 'Birthday' },
  travel:    { color: '#06b6d4', icon: '✈️', label: 'Travel' },
  exam:      { color: '#ef4444', icon: '📝', label: 'Exam' },
  meeting:   { color: '#10b981', icon: '👥', label: 'Meeting' },
  personal:  { color: '#8b5cf6', icon: '⭐', label: 'Personal' },
}

function EventModal({ event, onSave, onDelete, onClose }: {
  event?: Partial<CalendarEvent>
  onSave: (e: Partial<CalendarEvent>) => void
  onDelete?: (id: number) => void
  onClose: () => void
}) {
  const now = new Date()
  const [form, setForm] = useState<Partial<CalendarEvent>>({
    title: '', description: '', type: 'event', color: '#7c3aed',
    allDay: false, reminder: 30,
    isRecurring: false, recurRule: 'weekly',
    start: now, end: new Date(now.getTime() + 3600000),
    ...event
  })

  const toDateTimeLocal = (d: Date | undefined) =>
    d ? new Date(d).toISOString().slice(0, 16) : ''

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div className="glass-card w-full max-w-md p-5 relative z-10 space-y-3 max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>
            {event?.id ? 'Edit Event' : 'New Event'}
          </h3>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>

        <input className="input-field" placeholder="Event title *"
          value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

        {/* Event Type */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
            <button key={key}
              onClick={() => setForm(f => ({ ...f, type: key as EventType, color: cfg.color }))}
              className="p-2 rounded-xl flex flex-col items-center gap-1 text-center transition-all"
              style={{
                background: form.type === key ? `${cfg.color}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${form.type === key ? cfg.color : 'transparent'}`
              }}>
              <span className="text-base">{cfg.icon}</span>
              <span className="text-[9px]" style={{ color: form.type === key ? cfg.color : 'var(--color-text-muted)' }}>
                {cfg.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between py-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setForm(f => ({ ...f, allDay: !f.allDay }))}
              className="w-10 h-5 rounded-full transition-all"
              style={{ background: form.allDay ? '#7c3aed' : 'rgba(124,58,237,0.2)' }}>
              <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${form.allDay ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>All day</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring }))}
              className="w-10 h-5 rounded-full transition-all"
              style={{ background: form.isRecurring ? '#10b981' : 'rgba(16,185,129,0.2)' }}>
              <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${form.isRecurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Repeat</span>
          </label>
        </div>

        {form.isRecurring && (
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
              Repeat Interval
            </label>
            <select className="input-field" value={form.recurRule || 'weekly'}
              onChange={e => setForm(f => ({ ...f, recurRule: e.target.value }))}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}

        {!form.allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Start</label>
              <input type="datetime-local" className="input-field text-xs"
                value={toDateTimeLocal(form.start as Date)}
                onChange={e => setForm(f => ({ ...f, start: new Date(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>End</label>
              <input type="datetime-local" className="input-field text-xs"
                value={toDateTimeLocal(form.end as Date)}
                onChange={e => setForm(f => ({ ...f, end: new Date(e.target.value) }))} />
            </div>
          </div>
        )}

        {form.allDay && (
          <input type="date" className="input-field"
            value={form.start ? new Date(form.start).toISOString().slice(0, 10) : ''}
            onChange={e => setForm(f => ({ ...f, start: new Date(e.target.value), end: new Date(e.target.value) }))} />
        )}

        <textarea className="input-field resize-none" rows={2} placeholder="Description"
          value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>
            Reminder (minutes before)
          </label>
          <select className="input-field" value={form.reminder || 30}
            onChange={e => setForm(f => ({ ...f, reminder: parseInt(e.target.value) }))}>
            {[5, 10, 15, 30, 60, 120, 1440].map(m => (
              <option key={m} value={m}>{m < 60 ? `${m} min` : m < 1440 ? `${m / 60}h` : '1 day'} before</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {event?.id && onDelete && (
            <button onClick={() => { if (confirm('Delete this event?')) { onDelete(event.id!); onClose() } }}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors">
              Delete
            </button>
          )}
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => { if (form.title?.trim()) { onSave(form); onClose() } }}
            className="btn-primary flex-1 flex items-center gap-2 justify-center">
            <Save size={14} /> Save Event
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function CalendarPage() {
  const calendarRef = useRef<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState<Partial<CalendarEvent> | undefined>()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const events = useLiveQuery(() => db.calendarEvents.toArray(), [])
  const upcomingEvents = useLiveQuery(() => db.calendarEvents.where('start').above(new Date()).limit(5).sortBy('start'), [])

  const fcEvents = events?.flatMap(e => {
    const base = {
      id: String(e.id),
      title: `${EVENT_TYPE_CONFIG[e.type]?.icon || ''} ${e.title}`,
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      backgroundColor: e.color,
      borderColor: e.color,
      extendedProps: { eventId: e.id, isRecurring: e.isRecurring }
    }
    if (!e.isRecurring || !e.recurRule) return [base]

    const occurrences = [base]
    const origStart = new Date(e.start)
    const origEnd = new Date(e.end)
    const duration = origEnd.getTime() - origStart.getTime()

    const maxOccurrences = e.recurRule === 'daily' ? 30 : e.recurRule === 'weekly' ? 12 : 6
    for (let i = 1; i <= maxOccurrences; i++) {
      const nextStart = new Date(origStart)
      if (e.recurRule === 'daily') nextStart.setDate(origStart.getDate() + i)
      else if (e.recurRule === 'weekly') nextStart.setDate(origStart.getDate() + i * 7)
      else if (e.recurRule === 'monthly') nextStart.setMonth(origStart.getMonth() + i)
      else if (e.recurRule === 'yearly') nextStart.setFullYear(origStart.getFullYear() + i)

      const nextEnd = new Date(nextStart.getTime() + duration)
      occurrences.push({
        ...base,
        id: `${e.id}_rec_${i}`,
        title: `🔁 ${EVENT_TYPE_CONFIG[e.type]?.icon || ''} ${e.title}`,
        start: nextStart,
        end: nextEnd,
      })
    }
    return occurrences
  }) || []

  const handleSave = async (data: Partial<CalendarEvent>) => {
    if (editEvent?.id) await EventsDB.update(editEvent.id, data)
    else await EventsDB.add(data)
  }

  const handleDelete = async (id: number) => {
    await EventsDB.delete(id)
  }

  const handleDateClick = (info: any) => {
    setSelectedDate(new Date(info.date))
    setEditEvent({ start: new Date(info.date), end: new Date(info.date) })
    setShowModal(true)
  }

  const handleEventClick = async (info: any) => {
    const eventId = info.event.extendedProps.eventId
    const ev = await db.calendarEvents.get(eventId)
    if (ev) { setEditEvent(ev); setShowModal(true) }
  }

  return (
    <div className="page-content">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl gradient-text">Calendar</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {events?.length || 0} events scheduled
            </p>
          </div>
          <motion.button className="btn-primary flex items-center gap-2"
            onClick={() => { setEditEvent(undefined); setShowModal(true) }}
            whileHover={{ scale: 1.03 }}>
            <Plus size={16} /> New Event
          </motion.button>
        </div>

        <div className="grid md:grid-cols-[1fr_280px] gap-6">
          {/* FullCalendar */}
          <div className="glass-card p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              events={fcEvents}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              height="auto"
              editable
              selectable
              dayMaxEvents={3}
            />
          </div>

          {/* Upcoming Events Sidebar */}
          <div className="space-y-4">
            <div className="glass-card p-4">
              <h3 className="font-display font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                Upcoming Events
              </h3>
              <div className="space-y-2">
                {upcomingEvents && upcomingEvents.length > 0 ? (
                  upcomingEvents.map(event => {
                    const cfg = EVENT_TYPE_CONFIG[event.type]
                    return (
                      <motion.div key={event.id}
                        className="p-3 rounded-xl cursor-pointer transition-all hover:bg-[rgba(124,58,237,0.08)]"
                        style={{ borderLeft: `3px solid ${cfg.color}` }}
                        onClick={() => { setEditEvent(event); setShowModal(true) }}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cfg.icon}</span>
                          <p className="font-semibold text-sm flex-1 truncate" style={{ color: 'var(--color-text)' }}>
                            {event.title}
                          </p>
                        </div>
                        <p className="text-xs mt-1 ml-6" style={{ color: 'var(--color-text-muted)' }}>
                          {format(new Date(event.start), 'MMM d, h:mm a')}
                        </p>
                        {event.description && (
                          <p className="text-xs mt-0.5 ml-6 truncate" style={{ color: 'var(--color-text-dim)' }}>
                            {event.description}
                          </p>
                        )}
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="py-6 text-center">
                    <CalIcon size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No upcoming events</p>
                  </div>
                )}
              </div>
            </div>

            {/* Event Type Legend */}
            <div className="glass-card p-4">
              <h3 className="font-display font-semibold mb-3 text-sm" style={{ color: 'var(--color-text)' }}>
                Event Types
              </h3>
              <div className="space-y-1.5">
                {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <EventModal event={editEvent} onSave={handleSave} onDelete={handleDelete}
            onClose={() => { setShowModal(false); setEditEvent(undefined) }} />
        )}
      </AnimatePresence>
    </div>
  )
}
