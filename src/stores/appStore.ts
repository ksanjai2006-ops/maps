import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── App Store ───────────────────────────────────────────────────────────────

type Theme = 'dark' | 'light'
type ConnectivityStatus = 'online' | 'offline' | 'syncing' | 'sync-complete' | 'sync-error'

interface AppStore {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void

  connectivity: ConnectivityStatus
  setConnectivity: (s: ConnectivityStatus) => void

  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  activeModal: string | null
  openModal: (name: string) => void
  closeModal: () => void

  vaultUnlocked: boolean
  setVaultUnlocked: (v: boolean) => void

  currentPage: string
  setCurrentPage: (p: string) => void

  isNotificationDrawerOpen: boolean
  setNotificationDrawerOpen: (open: boolean) => void
  toggleNotificationDrawer: () => void

  isCopilotOpen: boolean
  setCopilotOpen: (open: boolean) => void
  toggleCopilot: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
        document.documentElement.classList.toggle('dark', theme === 'dark')
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        get().setTheme(next)
      },

      connectivity: 'online',
      setConnectivity: (connectivity) => set({ connectivity }),

      isSidebarOpen: false,
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

      activeModal: null,
      openModal: (name) => set({ activeModal: name }),
      closeModal: () => set({ activeModal: null }),

      vaultUnlocked: false,
      setVaultUnlocked: (vaultUnlocked) => set({ vaultUnlocked }),

      currentPage: 'dashboard',
      setCurrentPage: (currentPage) => set({ currentPage }),

      isNotificationDrawerOpen: false,
      setNotificationDrawerOpen: (isNotificationDrawerOpen) => set({ isNotificationDrawerOpen }),
      toggleNotificationDrawer: () => set((s) => ({ isNotificationDrawerOpen: !s.isNotificationDrawerOpen })),

      isCopilotOpen: false,
      setCopilotOpen: (isCopilotOpen) => set({ isCopilotOpen }),
      toggleCopilot: () => set((s) => ({ isCopilotOpen: !s.isCopilotOpen })),
    }),
    {
      name: 'lifemap-app-store',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)

// ─── Search Store ─────────────────────────────────────────────────────────────

interface SearchResult {
  type: 'note' | 'task' | 'place' | 'contact' | 'expense' | 'event'
  id: number
  title: string
  subtitle: string
  icon: string
  color: string
}

interface SearchStore {
  query: string
  setQuery: (q: string) => void
  results: SearchResult[]
  setResults: (r: SearchResult[]) => void
  isSearchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
  results: [],
  setResults: (results) => set({ results }),
  isSearchOpen: false,
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false, query: '' }),
}))
