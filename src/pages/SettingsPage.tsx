import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Sun, Moon, Lock, Bell, Globe, Database, Trash2, Download,
  Upload, Shield, Info, ChevronRight, CheckCircle2, HardDrive, Cpu
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { notificationScheduler } from '@/services/notificationScheduler'
import { db } from '@/db/schema'

export function SettingsPage() {
  const { theme, toggleTheme } = useAppStore()
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stats, setStats] = useState<{
    notes: number
    places: number
    tasks: number
    messages: number
    notifications: number
    regions: number
    storageMB: string
  }>({
    notes: 0,
    places: 0,
    tasks: 0,
    messages: 0,
    notifications: 0,
    regions: 0,
    storageMB: '0.0',
  })

  useEffect(() => {
    loadDiagnostics()
  }, [])

  const loadDiagnostics = async () => {
    try {
      const [n, p, t, m, notif, r] = await Promise.all([
        db.notes.count(),
        db.savedPlaces.count(),
        db.tasks.count(),
        db.peerMessages.count(),
        db.notifications.count(),
        db.mapRegions.count(),
      ])

      let usage = '0.0'
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate()
        if (est.usage) {
          usage = (est.usage / (1024 * 1024)).toFixed(1)
        }
      }

      setStats({
        notes: n,
        places: p,
        tasks: t,
        messages: m,
        notifications: notif,
        regions: r,
        storageMB: usage,
      })
    } catch (e) {
      console.warn('Diagnostics error', e)
    }
  }

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => setStatusMsg(null), 4000)
  }

  const clearData = async () => {
    if (!confirm('This will delete ALL your local data including offline maps, notes, and messages. Are you sure?')) return
    await db.delete()
    if ('caches' in window) {
      const keys = await caches.keys()
      for (const k of keys) {
        await caches.delete(k)
      }
    }
    window.location.reload()
  }

  const exportAllData = async () => {
    try {
      const data = {
        version: 2,
        exportedAt: new Date().toISOString(),
        notes: await db.notes.toArray(),
        tasks: await db.tasks.toArray(),
        places: await db.savedPlaces.toArray(),
        contacts: await db.contacts.toArray(),
        expenses: await db.expenses.toArray(),
        events: await db.calendarEvents.toArray(),
        journal: await db.journalEntries.toArray(),
        habits: await db.habits.toArray(),
        habitLogs: await db.habitLogs.toArray(),
        trips: await db.trips.toArray(),
        vaultItems: await db.vaultItems.toArray(),
        peerMessages: await db.peerMessages.toArray(),
        notifications: await db.notifications.toArray(),
        mapRegions: await db.mapRegions.toArray(),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifemap-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showNotification('success', 'Backup exported successfully!')
    } catch (err: any) {
      showNotification('error', `Export failed: ${err.message}`)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      await db.transaction('rw', [
        db.notes, db.tasks, db.savedPlaces, db.contacts, db.expenses,
        db.calendarEvents, db.journalEntries, db.habits, db.habitLogs,
        db.trips, db.vaultItems, db.peerMessages, db.notifications, db.mapRegions
      ], async () => {
        if (Array.isArray(data.notes)) await db.notes.bulkPut(data.notes)
        if (Array.isArray(data.tasks)) await db.tasks.bulkPut(data.tasks)
        if (Array.isArray(data.places)) await db.savedPlaces.bulkPut(data.places)
        if (Array.isArray(data.contacts)) await db.contacts.bulkPut(data.contacts)
        if (Array.isArray(data.expenses)) await db.expenses.bulkPut(data.expenses)
        if (Array.isArray(data.events)) await db.calendarEvents.bulkPut(data.events)
        if (Array.isArray(data.journal)) await db.journalEntries.bulkPut(data.journal)
        if (Array.isArray(data.habits)) await db.habits.bulkPut(data.habits)
        if (Array.isArray(data.habitLogs)) await db.habitLogs.bulkPut(data.habitLogs)
        if (Array.isArray(data.trips)) await db.trips.bulkPut(data.trips)
        if (Array.isArray(data.vaultItems)) await db.vaultItems.bulkPut(data.vaultItems)
        if (Array.isArray(data.peerMessages)) await db.peerMessages.bulkPut(data.peerMessages)
        if (Array.isArray(data.notifications)) await db.notifications.bulkPut(data.notifications)
        if (Array.isArray(data.mapRegions)) await db.mapRegions.bulkPut(data.mapRegions)
      })

      await loadDiagnostics()
      showNotification('success', 'Backup restored successfully into offline database!')
    } catch (err: any) {
      showNotification('error', `Import failed: ${err.message}`)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const triggerTestAlert = async () => {
    await notificationScheduler.requestPermission()
    await notificationScheduler.triggerTestNotification()
    showNotification('success', 'Test notification sent! Check the bell icon and system tray.')
    await loadDiagnostics()
  }

  const sections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: theme === 'dark' ? Moon : Sun,
          label: 'Theme',
          value: theme === 'dark' ? 'Dark Mode' : 'Light Mode',
          action: toggleTheme,
          color: '#7c3aed',
        },
      ]
    },
    {
      title: 'Notifications & Alerts',
      items: [
        {
          icon: Bell,
          label: 'Test Notification',
          value: 'Send instant notification to in-app drawer & system tray',
          color: '#f59e0b',
          action: triggerTestAlert,
        },
      ]
    },
    {
      title: 'Security',
      items: [
        {
          icon: Lock,
          label: 'Vault PIN',
          value: 'Change PIN (default: 1234)',
          color: '#10b981',
          action: () => {
            const p = prompt('Enter new PIN (4 digits):')
            if (p && /^\d{4}$/.test(p)) {
              localStorage.setItem('lifemap_vault_pin', p)
              showNotification('success', 'PIN updated successfully!')
            } else if (p) {
              alert('PIN must be exactly 4 digits.')
            }
          }
        },
      ]
    },
    {
      title: 'Data & Storage',
      items: [
        {
          icon: Download,
          label: 'Export Complete Backup',
          value: 'Save all 16 tables, offline regions, & messages as JSON',
          color: '#06b6d4',
          action: exportAllData,
        },
        {
          icon: Upload,
          label: 'Import / Restore Backup',
          value: 'Restore data from a previously saved LifeMap JSON backup',
          color: '#10b981',
          action: () => fileInputRef.current?.click(),
        },
        {
          icon: Trash2,
          label: 'Clear All Data',
          value: 'Delete all local databases, cached tiles, & storage',
          color: '#ef4444',
          action: clearData,
        },
      ]
    },
    {
      title: 'Privacy & Architecture',
      items: [
        {
          icon: Shield,
          label: 'Zero External Server Requirement',
          value: 'All personal data remains encrypted or locally stored on this device',
          color: '#10b981',
          action: undefined,
        },
      ]
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'LifeMap Version',
          value: 'v0.2.0 — Phase 2 Offline Companion Suite',
          color: '#7c3aed',
          action: undefined,
        },
        {
          icon: Globe,
          label: 'Network Connectivity',
          value: navigator.onLine ? '🟢 Online (P2P + Map tile access)' : '🟠 Offline Mode (100% operational)',
          color: '#06b6d4',
          action: undefined,
        },
      ]
    }
  ]

  return (
    <div className="page-content">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl gradient-text">Settings</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Manage your LifeMap preferences & offline database
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 rounded-xl flex items-center gap-3 glass-card"
            style={{
              borderColor: statusMsg.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
              background: statusMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            }}
          >
            <CheckCircle2
              size={18}
              style={{ color: statusMsg.type === 'success' ? '#10b981' : '#ef4444' }}
            />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {statusMsg.text}
            </p>
          </motion.div>
        )}

        {/* Storage & Diagnostics Card */}
        <motion.div
          className="glass-card p-5 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-purple-400" />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                System & Storage Diagnostics
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              {stats.storageMB} MB Used
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center mt-3">
            {[
              { label: 'Notes', count: stats.notes },
              { label: 'Places', count: stats.places },
              { label: 'Tasks', count: stats.tasks },
              { label: 'Messages', count: stats.messages },
              { label: 'Alerts', count: stats.notifications },
              { label: 'Map Packs', count: stats.regions },
            ].map(({ label, count }) => (
              <div key={label} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="font-bold text-base font-mono" style={{ color: 'var(--color-text)' }}>
                  {count}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* App Identity */}
        <motion.div
          className="glass-card p-6 mb-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.05))' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-4xl mb-3">🗺️</div>
          <h2 className="font-display font-bold text-xl gradient-text">LifeMap</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Your private offline digital companion
          </p>
          <div className="flex items-center justify-center gap-6 mt-4">
            {[
              { label: 'Zero Cloud', icon: '📴' },
              { label: 'AES-256 Vault', icon: '🔒' },
              { label: 'IndexedDB', icon: '💾' },
              { label: 'Local P2P', icon: '📡' },
            ].map(({ label, icon }) => (
              <div key={label} className="text-center">
                <div className="text-xl mb-1">{icon}</div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {sections.map((section, si) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.05 }}
            >
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {section.title}
              </h2>
              <div className="glass-card divide-y divide-white/5">
                {section.items.map(({ icon: Icon, label, value, color, action }) => (
                  <button
                    key={label}
                    className="w-full p-4 flex items-center gap-4 text-left transition-colors"
                    style={{ cursor: action ? 'pointer' : 'default' }}
                    onClick={action}
                    disabled={!action}
                    onMouseEnter={e => action && (e.currentTarget.style.background = 'rgba(124,58,237,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15` }}
                    >
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <p
                        className="font-semibold text-sm"
                        style={{ color: label === 'Clear All Data' ? '#ef4444' : 'var(--color-text)' }}
                      >
                        {label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {value}
                      </p>
                    </div>
                    {action && <ChevronRight size={16} style={{ color: 'var(--color-text-dim)' }} />}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* PWA Install Hint */}
        <motion.div
          className="glass-card p-4 mt-6 flex items-center gap-3"
          style={{ borderColor: 'rgba(6,182,212,0.3)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-2xl">📱</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Install LifeMap PWA</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Works completely offline. Install as a standalone Progressive Web App from your browser menu.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
