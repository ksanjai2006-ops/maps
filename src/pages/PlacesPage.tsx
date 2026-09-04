import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  MapPin, Star, Tag, Map, ArrowRight, SlidersHorizontal, X, Plus,
  Search, Compass, Navigation, Eye, CheckCircle2, Sparkles, Building, Bookmark
} from 'lucide-react'
import { db } from '@/db/schema'
import { PlacesDB } from '@/db/operations'
import type { SavedPlace, PlaceCategory } from '@/db/schema'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string; gradient: string }> = {
  home:       { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', icon: '🏠', label: 'Home',       gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' },
  work:       { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)',  icon: '🏢', label: 'Work',       gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)' },
  college:    { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: '🎓', label: 'Education',  gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)' },
  hospital:   { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)',  icon: '🏥', label: 'Hospital',   gradient: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)' },
  police:     { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: '👮', label: 'Police',     gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' },
  pharmacy:   { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: '💊', label: 'Pharmacy',   gradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)' },
  restaurant: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', icon: '🍽️', label: 'Dining',     gradient: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)' },
  hotel:      { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', icon: '🏨', label: 'Stay',       gradient: 'linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)' },
  friend:     { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', icon: '👫', label: 'Friends',    gradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)' },
  family:     { color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)', icon: '👨‍👩‍👧', label: 'Family',     gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' },
  shopping:   { color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)',  icon: '🛍️', label: 'Shopping',   gradient: 'linear-gradient(135deg, #a16207 0%, #eab308 100%)' },
  parking:    { color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)',icon: '🅿️', label: 'Parking',    gradient: 'linear-gradient(135deg, #334155 0%, #64748b 100%)' },
  travel:     { color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)',  icon: '✈️', label: 'Travel',     gradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)' },
  custom:     { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)',icon: '📍', label: 'Custom',     gradient: 'linear-gradient(135deg, #475569 0%, #94a3b8 100%)' }
}

const ALL_CATEGORIES: PlaceCategory[] = [
  'home','work','college','hospital','police','pharmacy',
  'restaurant','hotel','friend','family','shopping','parking','travel','custom'
]

function PlaceDetailDrawer({ place, onClose }: { place: SavedPlace; onClose: () => void }) {
  const navigate = useNavigate()
  const cfg = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.custom

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <motion.div
        className="glass-card w-full max-w-lg p-6 relative z-10 rounded-[32px] space-y-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(160deg, rgba(28,29,38,0.96) 0%, rgba(18,19,25,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)'
        }}
        initial={{ y: 60, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.95 }}
      >
        {/* Drawer Header Visual */}
        <div
          className="relative w-full h-32 rounded-2xl overflow-hidden p-4 flex flex-col justify-between"
          style={{ background: cfg.gradient }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white/90 border border-white/10">
              {cfg.icon} {cfg.label}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div>
            <h3 className="font-display font-extrabold text-xl text-white tracking-tight drop-shadow">
              {place.name}
            </h3>
          </div>
        </div>

        {place.address && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
            <MapPin size={16} className="mt-0.5 flex-shrink-0 text-purple-400" />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{place.address}</p>
          </div>
        )}

        {place.description && (
          <p className="text-sm px-1" style={{ color: 'var(--color-text-muted)' }}>{place.description}</p>
        )}

        {place.notes && (
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-xs font-semibold mb-1 text-cyan-300">Notes & Directions</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{place.notes}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl text-center bg-white/[0.03] border border-white/5">
            <p className="text-2xl font-bold font-mono text-purple-300">{place.visitCount}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Recorded Visits</p>
          </div>
          <div className="p-3.5 rounded-2xl text-center bg-white/[0.03] border border-white/5">
            <p className="text-sm font-semibold font-mono text-cyan-300 mt-1">
              {place.lastVisited ? format(new Date(place.lastVisited), 'MMM d, yyyy') : 'First Visit'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Last Visited</p>
          </div>
        </div>

        {place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {place.tags.map(t => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="p-3 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between text-xs font-mono text-neutral-400">
          <span>GPS Coordinates</span>
          <span className="text-white/80">{place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}</span>
        </div>

        {/* Action Row */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => PlacesDB.update(place.id!, { isFavorite: !place.isFavorite })}
            className="flex-1 py-3 rounded-full text-xs font-semibold flex items-center gap-2 justify-center transition-all"
            style={{
              background: place.isFavorite ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: place.isFavorite ? '#fbbf24' : 'var(--color-text)',
              border: `1px solid ${place.isFavorite ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
            }}
          >
            <Star size={14} fill={place.isFavorite ? '#fbbf24' : 'none'} />
            {place.isFavorite ? 'Favorited' : 'Add to Favorites'}
          </button>
          <button
            onClick={() => navigate('/map')}
            className="flex-1 py-3 rounded-full text-xs font-semibold flex items-center gap-2 justify-center text-white shadow-lg transition-transform hover:scale-102"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
              boxShadow: '0 8px 20px rgba(124, 58, 237, 0.35)'
            }}
          >
            <Navigation size={14} /> Open on Map
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function PlacesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<SavedPlace | null>(null)

  const places = useLiveQuery(async () => {
    const list = await db.savedPlaces.toArray()
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [])

  const filtered = places?.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) || p.tags.some(t => t.includes(q))
    const matchCat = filterCat === 'all' || p.category === filterCat
    const matchFav = !showFavOnly || p.isFavorite
    return matchSearch && matchCat && matchFav
  }) || []

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
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-medium">
                <Sparkles size={12} />
                <span>SANCTUARY & LOCATIONS • YOUR MAP DIRECTORY</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
                Saved Places
              </h1>
              <p className="text-sm max-w-xl" style={{ color: 'var(--color-text-muted)' }}>
                Organize your home, workspaces, medical hubs, and safe havens with offline GPS coordinates, personal notes, and visit history.
              </p>

              {/* Status Chips */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {places?.length || 0} Locations Logged
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-amber-300">
                  <Star size={12} />
                  {places?.filter(p => p.isFavorite).length || 0} Favorites
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-300">
                  <Compass size={12} />
                  Zero-Cloud Offline Maps
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
                onClick={() => navigate('/offline-maps')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span>📦 Tile Packs</span>
              </motion.button>
              <motion.button
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                  boxShadow: '0 8px 20px rgba(124, 58, 237, 0.35)'
                }}
                onClick={() => navigate('/map')}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <Plus size={16} />
                <span>Add on Map</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Search + Filter Bar ─────────────────────────────────────────────── */}
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
              placeholder="Search places, address, tags, notes..."
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
              All ({places?.length || 0})
            </button>
            {ALL_CATEGORIES.filter(cat => places?.some(p => p.category === cat)).map(cat => {
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.custom
              const count = places?.filter(p => p.category === cat).length || 0
              const active = filterCat === cat
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
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
            <button
              onClick={() => setShowFavOnly(!showFavOnly)}
              className={`flex-shrink-0 text-xs px-4 py-2 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                showFavOnly
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-amber-300/80 border border-white/5'
              }`}
            >
              <Star size={12} fill={showFavOnly ? '#fff' : 'none'} />
              <span>Favorites</span>
            </button>
          </div>
        </div>

        {/* ── Cogni:wave Place Cards Grid ─────────────────────────────────────── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((place, index) => {
              const cfg = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.custom
              const indexStr = String(index + 1).padStart(2, '0')

              return (
                <motion.div
                  key={place.id}
                  className="flex flex-col group cursor-pointer"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    setSelectedPlace(place)
                    PlacesDB.incrementVisit(place.id!)
                  }}
                >
                  {/* Folder Tab Notch (Cogni:wave Signature) */}
                  <div className="flex items-center pl-4">
                    <div
                      className="px-3.5 py-1 rounded-t-xl text-[11px] font-mono font-medium tracking-wide flex items-center gap-1.5 transition-colors"
                      style={{
                        background: 'rgba(32, 33, 44, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderBottom: 'none',
                        color: cfg.color,
                      }}
                    >
                      <span className="opacity-60">/ {indexStr}</span>
                      <span>•</span>
                      <span>{cfg.label}</span>
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
                    <div>
                      {/* Visual Header Banner Container */}
                      <div
                        className="relative w-full h-32 rounded-2xl overflow-hidden p-3.5 mb-4 flex flex-col justify-between transition-transform duration-300 group-hover:scale-[1.01]"
                        style={{ background: cfg.gradient }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md text-white/95 border border-white/10">
                            {cfg.icon} {cfg.label}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              PlacesDB.update(place.id!, { isFavorite: !place.isFavorite })
                            }}
                            className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center transition-transform hover:scale-110"
                            style={{ color: place.isFavorite ? '#fbbf24' : '#ffffffcc' }}
                          >
                            <Star size={14} fill={place.isFavorite ? '#fbbf24' : 'none'} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-white/90">
                          <span className="font-mono bg-black/25 px-2 py-0.5 rounded-full">
                            📍 {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
                          </span>
                          {place.visitCount > 0 && (
                            <span className="bg-black/30 px-2 py-0.5 rounded-full font-medium">
                              • {place.visitCount} visits
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="space-y-2">
                        <h3
                          className="font-display font-bold text-lg tracking-tight truncate group-hover:text-purple-300 transition-colors"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {place.name}
                        </h3>

                        {place.address && (
                          <div className="flex items-center gap-1.5 text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                            <MapPin size={13} className="text-purple-400 flex-shrink-0" />
                            <span className="truncate">{place.address}</span>
                          </div>
                        )}

                        {place.description && (
                          <p className="text-xs line-clamp-2 pt-1" style={{ color: 'var(--color-text-dim)' }}>
                            {place.description}
                          </p>
                        )}

                        {place.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {place.tags.slice(0, 3).map(t => (
                              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                                #{t}
                              </span>
                            ))}
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
                          setSelectedPlace(place)
                          PlacesDB.incrementVisit(place.id!)
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

                      {/* Right: Circular Action Button */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('/map')
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                          style={{
                            background: 'rgba(6, 182, 212, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(6, 182, 212, 0.25)'
                          }}
                          title="Open on Interactive Map"
                        >
                          <Navigation size={14} />
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
            <MapPin size={48} className="mx-auto mb-4 opacity-20 text-cyan-400" />
            <p className="font-display font-semibold text-lg mb-1" style={{ color: 'var(--color-text)' }}>
              {search ? 'No matching places found' : 'No places recorded yet'}
            </p>
            <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Tap any location on your offline map to save it with custom tags and offline notes.
            </p>
            <button
              className="btn-primary rounded-full px-6 py-2.5 text-sm"
              onClick={() => navigate('/map')}
            >
              <Map size={14} className="inline mr-1.5" /> Open Map
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedPlace(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
