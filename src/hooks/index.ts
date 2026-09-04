import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'
import { db } from '@/db/schema'
import Fuse from 'fuse.js'

// ─── Online Status ────────────────────────────────────────────────────────────
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const setConnectivity = useAppStore((s) => s.setConnectivity)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setConnectivity('online')
    }
    const handleOffline = () => {
      setIsOnline(false)
      setConnectivity('offline')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setConnectivity])

  return isOnline
}

// ─── Geolocation ──────────────────────────────────────────────────────────────
interface GeoState {
  coords: GeolocationCoordinates | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ coords: null, error: null, loading: false })

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported' }))
      return
    }
    setState(s => ({ ...s, loading: true }))
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ coords: pos.coords, error: null, loading: false }),
      (err) => setState({ coords: null, error: err.message, loading: false }),
      { timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => { getCurrentPosition() }, [getCurrentPosition])

  return { ...state, refresh: getCurrentPosition }
}

// ─── Global Search ────────────────────────────────────────────────────────────
export function useGlobalSearch(query: string) {
  const [results, setResults] = useState<Array<{
    type: string; id: number; title: string; subtitle: string; icon: string; color: string
  }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return }
    const search = async () => {
      setLoading(true)
      try {
        const [notes, tasks, places, contacts, expenses] = await Promise.all([
          db.notes.where('isDeleted').equals(0).toArray(),
          db.tasks.toArray(),
          db.savedPlaces.toArray(),
          db.contacts.toArray(),
          db.expenses.toArray(),
        ])

        const fuseNotes = new Fuse(notes, { keys: ['title', 'content', 'tags'], threshold: 0.4 })
        const fuseTasks = new Fuse(tasks, { keys: ['title', 'description'], threshold: 0.4 })
        const fusePlaces = new Fuse(places, { keys: ['name', 'address', 'description', 'tags'], threshold: 0.4 })
        const fuseContacts = new Fuse(contacts, { keys: ['name', 'email', 'phone', 'notes'], threshold: 0.4 })
        const fuseExpenses = new Fuse(expenses, { keys: ['description', 'category'], threshold: 0.4 })

        const allResults = [
          ...fuseNotes.search(query).map(r => ({ type: 'note', id: r.item.id!, title: r.item.title || 'Untitled', subtitle: r.item.content.slice(0, 60), icon: '📝', color: '#7c3aed' })),
          ...fuseTasks.search(query).map(r => ({ type: 'task', id: r.item.id!, title: r.item.title, subtitle: r.item.priority, icon: '✅', color: '#10b981' })),
          ...fusePlaces.search(query).map(r => ({ type: 'place', id: r.item.id!, title: r.item.name, subtitle: r.item.address, icon: '📍', color: '#06b6d4' })),
          ...fuseContacts.search(query).map(r => ({ type: 'contact', id: r.item.id!, title: r.item.name, subtitle: r.item.phone, icon: '👤', color: '#f59e0b' })),
          ...fuseExpenses.search(query).map(r => ({ type: 'expense', id: r.item.id!, title: r.item.description, subtitle: `₹${r.item.amount} — ${r.item.category}`, icon: '💰', color: '#ef4444' })),
        ].slice(0, 30)

        setResults(allResults)
      } finally {
        setLoading(false)
      }
    }
    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [query])

  return { results, loading }
}

// ─── Theme ────────────────────────────────────────────────────────────────────
export function useTheme() {
  const { theme, toggleTheme } = useAppStore()
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return { theme, toggleTheme, isDark: theme === 'dark' }
}

// ─── Clock ────────────────────────────────────────────────────────────────────
export function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

// ─── Weather (online only) ────────────────────────────────────────────────────
interface WeatherData {
  temp: number
  condition: string
  icon: string
  city: string
}

export function useWeather(lat: number | null, lon: number | null) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!lat || !lon || !navigator.onLine) return
    setLoading(true)
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`)
      .then(r => r.json())
      .then(data => {
        const code = data.current?.weathercode ?? 0
        const temp = Math.round(data.current?.temperature_2m ?? 0)
        const conditions: Record<number, { condition: string; icon: string }> = {
          0: { condition: 'Clear Sky', icon: '☀️' },
          1: { condition: 'Mainly Clear', icon: '🌤️' },
          2: { condition: 'Partly Cloudy', icon: '⛅' },
          3: { condition: 'Overcast', icon: '☁️' },
          51: { condition: 'Light Drizzle', icon: '🌦️' },
          61: { condition: 'Slight Rain', icon: '🌧️' },
          71: { condition: 'Slight Snow', icon: '🌨️' },
          95: { condition: 'Thunderstorm', icon: '⛈️' },
        }
        const w = conditions[code] ?? { condition: 'Unknown', icon: '🌡️' }
        setWeather({ temp, ...w, city: 'Your Location' })
      })
      .catch(() => setWeather(null))
      .finally(() => setLoading(false))
  }, [lat, lon])

  return { weather, loading }
}
