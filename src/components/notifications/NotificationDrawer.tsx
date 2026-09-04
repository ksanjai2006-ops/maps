import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Bell, X, Check, CheckCheck, Trash2, AlertTriangle,
  Calendar, CheckSquare, Flame, Info, ExternalLink
} from 'lucide-react'
import { db } from '@/db/schema'
import { NotificationsDB } from '@/db/operations'
import { useAppStore } from '@/stores/appStore'

export function NotificationDrawer() {
  const { isNotificationDrawerOpen, setNotificationDrawerOpen } = useAppStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all')

  const notifications = useLiveQuery(() => NotificationsDB.getAll(), []) || []
  const unreadCount = notifications.filter(n => !n.isRead).length

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead
    if (filter === 'high') return n.priority === 'high'
    return true
  })

  const getIcon = (type: string) => {
    switch (type) {
      case 'emergency': return <AlertTriangle size={16} className="text-red-400" />
      case 'task': return <CheckSquare size={16} className="text-emerald-400" />
      case 'calendar': return <Calendar size={16} className="text-purple-400" />
      case 'habit': return <Flame size={16} className="text-amber-400" />
      default: return <Info size={16} className="text-cyan-400" />
    }
  }

  const handleAction = (link?: string, id?: number) => {
    if (id) NotificationsDB.markRead(id)
    if (link) {
      setNotificationDrawerOpen(false)
      navigate(link)
    }
  }

  if (!isNotificationDrawerOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setNotificationDrawerOpen(false)}
      />

      {/* Drawer Panel */}
      <motion.div
        className="relative z-10 w-full max-w-md h-full flex flex-col glass-card border-l border-[rgba(124,58,237,0.2)] rounded-none"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-[rgba(124,58,237,0.15)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed20, #06b6d420)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <Bell size={16} className="text-accent-violet" />
            </div>
            <div>
              <div className="font-display font-bold text-sm">Notifications</div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => NotificationsDB.markAllRead()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-xs flex items-center gap-1"
                title="Mark all as read"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <CheckCheck size={16} />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => NotificationsDB.clear()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-xs"
                title="Clear all"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={() => setNotificationDrawerOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex px-4 pt-3 gap-2 border-b border-[rgba(124,58,237,0.1)] pb-2 text-xs">
          {(['all', 'unread', 'high'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-full capitalize font-medium transition-all ${
                filter === tab
                  ? 'bg-accent-violet text-white shadow-sm'
                  : 'hover:bg-white/5'
              }`}
              style={{ color: filter === tab ? '#fff' : 'var(--color-text-muted)' }}
            >
              {tab === 'high' ? '🚨 High Priority' : tab}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center">
                <Bell size={28} className="text-gray-500 mb-2 opacity-50" />
                <div className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  All clear! No notifications.
                </div>
              </div>
            ) : (
              filtered.map(notif => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3 rounded-xl border transition-all ${
                    notif.isRead
                      ? 'bg-white/[0.02] border-white/5 opacity-75'
                      : 'bg-white/[0.06] border-[rgba(124,58,237,0.25)] shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-black/20">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-semibold truncate ${notif.isRead ? '' : 'text-accent-cyan'}`}>
                          {notif.title}
                        </span>
                        {notif.priority === 'high' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                            HIGH
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[10px]">
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-2">
                          {!notif.isRead && (
                            <button
                              onClick={() => NotificationsDB.markRead(notif.id!)}
                              className="text-accent-violet hover:underline flex items-center gap-0.5"
                            >
                              <Check size={12} /> Read
                            </button>
                          )}
                          {notif.link && (
                            <button
                              onClick={() => handleAction(notif.link, notif.id)}
                              className="text-accent-cyan hover:underline flex items-center gap-0.5 font-medium"
                            >
                              View <ExternalLink size={10} />
                            </button>
                          )}
                          <button
                            onClick={() => NotificationsDB.delete(notif.id!)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
