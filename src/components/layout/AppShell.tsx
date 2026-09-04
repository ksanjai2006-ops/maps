import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Home, Map, FileText, CheckSquare, MapPin, Users,
  DollarSign, Calendar, Shield, Lock, Search,
  Settings, AlertTriangle, Sun, Moon, Menu, X,
  Wifi, WifiOff, RefreshCw, Bell, MessageSquare,
  Layers, Bot
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { NotificationsDB } from '@/db/operations'
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer'
import { CopilotModal } from '@/components/assistant/CopilotModal'
import { notificationScheduler } from '@/services/notificationScheduler'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/assistant', label: 'Copilot AI', icon: Bot, highlight: true },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
  { path: '/map', label: 'Map', icon: Map },
  { path: '/offline-maps', label: 'Offline Maps', icon: Layers },
  { path: '/notes', label: 'Notes', icon: FileText },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/places', label: 'Places', icon: MapPin },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/expenses', label: 'Expenses', icon: DollarSign },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/vault', label: 'Vault', icon: Lock },
  { path: '/emergency', label: 'Emergency', icon: AlertTriangle },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/settings', label: 'Settings', icon: Settings },
]

const bottomNavItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/map', label: 'Map', icon: Map },
  { path: '/messages', label: 'Mesh', icon: MessageSquare },
  { path: '/assistant', label: 'Copilot', icon: Bot },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/emergency', label: '🚨', icon: AlertTriangle, danger: true },
]

function ConnectivityBadge() {
  const connectivity = useAppStore((s) => s.connectivity)
  const config = {
    online: { label: 'Online', color: '#10b981', pulse: true, icon: Wifi },
    offline: { label: 'Offline', color: '#f59e0b', pulse: false, icon: WifiOff },
    syncing: { label: 'Syncing', color: '#06b6d4', pulse: true, icon: RefreshCw },
    'sync-complete': { label: 'Synced', color: '#10b981', pulse: false, icon: Wifi },
    'sync-error': { label: 'Sync Error', color: '#ef4444', pulse: false, icon: WifiOff },
  }
  const c = config[connectivity]
  const Icon = c.icon

  return (
    <motion.div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: `${c.color}15`,
        border: `1px solid ${c.color}40`,
        color: c.color
      }}
      animate={c.pulse ? { opacity: [1, 0.7, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      <Icon size={10} strokeWidth={2.5} className={connectivity === 'syncing' ? 'animate-spin' : ''} />
      {c.label}
    </motion.div>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme, isSidebarOpen, toggleSidebar, setSidebarOpen, toggleNotificationDrawer } = useAppStore()
  const unreadCount = useLiveQuery(() => NotificationsDB.getUnreadCount(), []) || 0
  const ThemeIcon = theme === 'dark' ? Sun : Moon

  useEffect(() => {
    notificationScheduler.init()
    return () => notificationScheduler.destroy()
  }, [])

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Background Orbs */}
      <div className="orb orb-violet" />
      <div className="orb orb-cyan" />

      {/* ── Desktop Sidebar ─────────────────────────── */}
      <aside className="sidebar hidden md:flex">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[rgba(124,58,237,0.15)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
              🗺️
            </div>
            <div>
              <div className="font-display font-bold text-base" style={{ color: 'var(--color-text)' }}>LifeMap</div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Personal Companion</div>
            </div>
          </div>
        </div>

        {/* Connectivity & Notification Bell */}
        <div className="px-4 py-3 flex items-center justify-between">
          <ConnectivityBadge />
          <button
            onClick={toggleNotificationDrawer}
            className="relative p-2 rounded-xl hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent-violet text-white text-[9px] font-bold flex items-center justify-center animate-pulse shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`nav-item w-full ${isActive(path) ? 'active' : ''} ${path === '/emergency' ? 'text-red-400' : ''}`}
            >
              <Icon size={16} strokeWidth={isActive(path) ? 2.5 : 2} />
              <span>{label}</span>
              {path === '/emergency' && (
                <span className="ml-auto text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/30">SOS</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom Controls */}
        <div className="px-4 py-4 border-t border-[rgba(124,58,237,0.15)] flex items-center justify-between">
          <button onClick={toggleTheme}
            className="p-2 rounded-lg transition-all hover:bg-[rgba(124,58,237,0.15)]"
            style={{ color: 'var(--color-text-muted)' }}>
            <ThemeIcon size={18} />
          </button>
          <button onClick={() => navigate('/settings')}
            className="p-2 rounded-lg transition-all hover:bg-[rgba(124,58,237,0.15)]"
            style={{ color: 'var(--color-text-muted)' }}>
            <Settings size={18} />
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="sidebar fixed left-0 top-0 z-50 md:hidden"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="px-5 py-5 border-b border-[rgba(124,58,237,0.15)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>🗺️</div>
                  <div>
                    <div className="font-display font-bold text-base" style={{ color: 'var(--color-text)' }}>LifeMap</div>
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Personal Companion</div>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} style={{ color: 'var(--color-text-muted)' }}>
                  <X size={20} />
                </button>
              </div>
              <div className="px-4 py-3"><ConnectivityBadge /></div>
              <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
                {navItems.map(({ path, label, icon: Icon }) => (
                  <button key={path} onClick={() => { navigate(path); setSidebarOpen(false) }}
                    className={`nav-item w-full ${isActive(path) ? 'active' : ''}`}>
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
              <div className="px-4 py-4 border-t border-[rgba(124,58,237,0.15)] flex gap-2">
                <button onClick={toggleTheme} className="btn-ghost flex items-center gap-2 flex-1 justify-center">
                  <ThemeIcon size={16} /> {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3"
          style={{ background: 'rgba(10,15,30,0.95)', borderBottom: '1px solid rgba(124,58,237,0.15)', backdropFilter: 'blur(20px)' }}>
          <button onClick={toggleSidebar} style={{ color: 'var(--color-text-muted)' }}>
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base" style={{ color: 'var(--color-text)' }}>🗺️ LifeMap</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleNotificationDrawer}
              className="relative p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)]"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-accent-violet text-white text-[8px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <ConnectivityBadge />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="bottom-nav md:hidden">
          {bottomNavItems.map(({ path, label, icon: Icon, danger }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`bottom-nav-item ${isActive(path) ? 'active' : ''} ${danger ? 'text-red-400' : ''}`}
            >
              <Icon size={20} strokeWidth={isActive(path) ? 2.5 : 2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Global Slide-Over Notification Drawer & Floating Copilot AI */}
      <NotificationDrawer />
      <CopilotModal />
    </div>
  )
}
