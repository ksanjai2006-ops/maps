import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import * as MapLibre from 'maplibre-gl'
import {
  MapPin, Plus, Navigation, Search, Star, Trash2, X,
  ChevronDown, Map, Grid3X3, SlidersHorizontal, Download
} from 'lucide-react'
import { db } from '@/db/schema'
import { PlacesDB } from '@/db/operations'
import type { SavedPlace, PlaceCategory } from '@/db/schema'
import { useGeolocation } from '@/hooks'

const CATEGORY_ICONS: Record<string, string> = {
  home: '🏠', work: '🏢', college: '🎓', hospital: '🏥',
  police: '👮', pharmacy: '💊', restaurant: '🍽️', hotel: '🏨',
  friend: '👫', family: '👨‍👩‍👧', shopping: '🛍️', parking: '🅿️',
  travel: '✈️', custom: '📍'
}

const CATEGORY_COLORS: Record<string, string> = {
  home: '#7c3aed', work: '#06b6d4', college: '#f59e0b', hospital: '#ef4444',
  police: '#3b82f6', pharmacy: '#10b981', restaurant: '#f97316', hotel: '#8b5cf6',
  friend: '#ec4899', family: '#14b8a6', shopping: '#f59e0b', parking: '#6b7280',
  travel: '#06b6d4', custom: '#94a3b8'
}

const ALL_CATEGORIES: PlaceCategory[] = [
  'home', 'work', 'college', 'hospital', 'police', 'pharmacy',
  'restaurant', 'hotel', 'friend', 'family', 'shopping', 'parking', 'travel', 'custom'
]

interface PlaceDrawerProps {
  place: SavedPlace
  onClose: () => void
  onDelete: () => void
}

function PlaceDrawer({ place, onClose, onDelete }: PlaceDrawerProps) {
  return (
    <motion.div
      className="glass-card absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-20 p-4"
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${CATEGORY_COLORS[place.category]}20` }}>
            {CATEGORY_ICONS[place.category]}
          </div>
          <div>
            <h3 className="font-display font-bold text-sm" style={{ color: 'var(--color-text)' }}>{place.name}</h3>
            <p className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{place.category}</p>
          </div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
      </div>
      {place.address && (
        <p className="text-xs mb-2 flex items-start gap-2" style={{ color: 'var(--color-text-muted)' }}>
          <MapPin size={12} className="mt-0.5 flex-shrink-0" /> {place.address}
        </p>
      )}
      {place.description && (
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>{place.description}</p>
      )}
      {place.notes && (
        <p className="text-xs p-2 rounded-lg mb-3"
          style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-text-muted)' }}>
          {place.notes}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { PlacesDB.update(place.id!, { isFavorite: !place.isFavorite }) }}
          className="btn-ghost flex items-center gap-1 text-xs flex-1 justify-center"
          style={{ color: place.isFavorite ? '#f59e0b' : undefined }}>
          <Star size={12} fill={place.isFavorite ? '#f59e0b' : 'none'} />
          {place.isFavorite ? 'Saved' : 'Save'}
        </button>
        <button onClick={onDelete} className="btn-ghost flex items-center gap-1 text-xs flex-1 justify-center"
          style={{ color: '#ef4444' }}>
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </motion.div>
  )
}

interface AddPlaceModalProps {
  lngLat: { lng: number; lat: number } | null
  onSave: (place: Omit<SavedPlace, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'remoteId'>) => void
  onClose: () => void
}

function AddPlaceModal({ lngLat, onSave, onClose }: AddPlaceModalProps) {
  const [form, setForm] = useState({
    name: '', category: 'custom' as PlaceCategory,
    address: '', description: '', notes: ''
  })

  if (!lngLat) return null

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({
      ...form,
      latitude: lngLat.lat,
      longitude: lngLat.lng,
      photos: [], tags: [],
      visitCount: 0, lastVisited: null,
      isFavorite: false,
      color: CATEGORY_COLORS[form.category],
      icon: CATEGORY_ICONS[form.category]
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="glass-card w-full max-w-md p-5 relative z-10"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>Save Location</h3>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>
        <div className="space-y-3">
          <input className="input-field" placeholder="Location name *" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <select className="input-field" value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value as PlaceCategory }))}>
            {ALL_CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <input className="input-field" placeholder="Address" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <textarea className="input-field resize-none" rows={2} placeholder="Description" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <textarea className="input-field resize-none" rows={2} placeholder="Notes" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            📍 {lngLat.lat.toFixed(5)}, {lngLat.lng.toFixed(5)}
          </p>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1">Save Place</button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function MapPage() {
  const navigate = useNavigate()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre.Map | null>(null)
  const markersRef = useRef<globalThis.Map<number, MapLibre.Marker>>(new globalThis.Map())
  const { coords } = useGeolocation()

  const [selectedPlace, setSelectedPlace] = useState<SavedPlace | null>(null)
  const [pendingPin, setPendingPin] = useState<{ lng: number; lat: number } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [mapStyle, setMapStyle] = useState<'default' | 'satellite'>('default')

  const places = useLiveQuery(() => db.savedPlaces.toArray(), [])

  // Init map
  useEffect(() => {
    if (!mapContainer.current) return
    const map = new MapLibre.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: coords ? [coords.longitude, coords.latitude] : [80.2707, 13.0827],
      zoom: 12,
    })
    map.addControl(new MapLibre.NavigationControl(), 'top-right')
    mapRef.current = map

    map.on('click', (e) => {
      setPendingPin({ lng: e.lngLat.lng, lat: e.lngLat.lat })
      setShowAddModal(true)
    })

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Fly to user location
  useEffect(() => {
    if (coords && mapRef.current) {
      mapRef.current.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14, duration: 1500 })
    }
  }, [coords])

  // Add/update place markers
  useEffect(() => {
    if (!mapRef.current || !places) return
    const map = mapRef.current

    // Remove old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()

    // Filter places
    const filtered = filterCategory === 'all' ? places : places.filter(p => p.category === filterCategory)

    filtered.forEach(place => {
      const el = document.createElement('div')
      el.style.cssText = `
        width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
        background: linear-gradient(135deg, ${CATEGORY_COLORS[place.category]}, ${CATEGORY_COLORS[place.category]}aa);
        border: 2px solid white; cursor: pointer; transform: rotate(-45deg);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        transition: transform 0.2s;
        font-size: 14px;
      `
      const inner = document.createElement('div')
      inner.style.cssText = 'transform: rotate(45deg); line-height: 1;'
      inner.textContent = CATEGORY_ICONS[place.category]
      el.appendChild(inner)

      el.addEventListener('mouseenter', () => { el.style.transform = 'rotate(-45deg) scale(1.15)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'rotate(-45deg) scale(1)' })

      const marker = new MapLibre.Marker({ element: el, anchor: 'bottom-left' })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map)

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelectedPlace(place)
        map.flyTo({ center: [place.longitude, place.latitude], zoom: 15, duration: 800 })
        PlacesDB.incrementVisit(place.id!)
      })

      markersRef.current.set(place.id!, marker)
    })
  }, [places, filterCategory])

  const handleSavePlace = async (placeData: Omit<SavedPlace, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'remoteId'>) => {
    await PlacesDB.add(placeData)
    setPendingPin(null)
  }

  const handleDeletePlace = async () => {
    if (!selectedPlace?.id) return
    await PlacesDB.delete(selectedPlace.id)
    setSelectedPlace(null)
  }

  const flyToLocation = () => {
    if (coords && mapRef.current) {
      mapRef.current.flyTo({ center: [coords.longitude, coords.latitude], zoom: 15, duration: 1000 })
    }
  }

  return (
    <div className="h-[100dvh] md:h-[calc(100vh-0px)] flex flex-col">
      {/* ─── Toolbar ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 z-10"
        style={{ background: 'rgba(10,15,30,0.95)', borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
        <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterCategory('all')}
            className={`flex-shrink-0 badge text-xs px-3 py-1.5 cursor-pointer transition-all ${filterCategory === 'all' ? 'badge-violet' : ''}`}
            style={{ background: filterCategory === 'all' ? undefined : 'rgba(255,255,255,0.05)', color: filterCategory === 'all' ? undefined : 'var(--color-text-muted)' }}>
            All ({places?.length ?? 0})
          </button>
          {ALL_CATEGORIES.map(cat => {
            const count = places?.filter(p => p.category === cat).length ?? 0
            if (count === 0) return null
            return (
              <button key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`flex-shrink-0 badge text-xs px-3 py-1.5 cursor-pointer transition-all ${filterCategory === cat ? 'badge-violet' : ''}`}
                style={{ background: filterCategory === cat ? undefined : 'rgba(255,255,255,0.05)', color: filterCategory === cat ? undefined : 'var(--color-text-muted)' }}>
                {CATEGORY_ICONS[cat]} {cat} ({count})
              </button>
            )
          })}
        </div>
        <button
          onClick={() => navigate('/offline-maps')}
          className="btn-ghost px-2.5 py-1.5 flex-shrink-0 flex items-center gap-1.5 text-xs text-accent-violet hover:bg-accent-violet/10 rounded-xl"
          title="Manage Offline Map Regions"
        >
          <Download size={14} />
          <span className="hidden sm:inline font-semibold">Offline Packs</span>
        </button>
        <button onClick={flyToLocation}
          className="btn-ghost p-2 flex-shrink-0" title="My location">
          <Navigation size={16} style={{ color: '#06b6d4' }} />
        </button>
      </div>

      {/* ─── Map ─────────────────────────────────────── */}
      <div className="relative flex-1">
        <div ref={mapContainer} className="w-full h-full" />

        {/* No internet message for map */}
        {!navigator.onLine && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <div className="glass-card px-3 py-2 text-xs flex items-center gap-2"
              style={{ color: '#fcd34d' }}>
              🟠 Offline — map tiles may be limited. Saved places still visible.
            </div>
          </div>
        )}

        {/* Click hint */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 md:hidden pointer-events-none">
          <div className="glass-card px-3 py-2 text-xs text-center"
            style={{ color: 'var(--color-text-muted)' }}>
            Tap on map to save a location
          </div>
        </div>

        {/* Selected place drawer */}
        <AnimatePresence>
          {selectedPlace && (
            <PlaceDrawer
              place={selectedPlace}
              onClose={() => setSelectedPlace(null)}
              onDelete={handleDeletePlace}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Add place modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddPlaceModal
            lngLat={pendingPin}
            onSave={handleSavePlace}
            onClose={() => { setShowAddModal(false); setPendingPin(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
