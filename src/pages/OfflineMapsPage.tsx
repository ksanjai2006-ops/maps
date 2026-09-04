import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  Download, HardDrive, MapPin, Trash2, CheckCircle2,
  AlertCircle, RefreshCw, Layers, ArrowLeft, ExternalLink
} from 'lucide-react'
import { db } from '@/db/schema'
import {
  RegionDownloader, calculateTiles, type DownloadProgress
} from '@/services/tileDownloader'
import { useGeolocation } from '@/hooks'

interface PresetRegion {
  name: string
  bounds: { north: number; south: number; east: number; west: number }
  description: string
}

const PRESETS: PresetRegion[] = [
  {
    name: 'Chennai Central & Coast',
    bounds: { north: 13.1200, south: 13.0400, east: 80.3000, west: 80.2200 },
    description: 'Covers Anna Nagar, Marina Beach, Central Station, and T Nagar'
  },
  {
    name: 'Bengaluru Tech Corridor',
    bounds: { north: 12.9800, south: 12.9100, east: 77.6800, west: 77.5800 },
    description: 'Indiranagar, Koramangala, and HSR Layout'
  },
  {
    name: 'Mumbai South & Harbour',
    bounds: { north: 18.9600, south: 18.9000, east: 72.8400, west: 72.8000 },
    description: 'Colaba, Fort, Gateway of India, and Marine Drive'
  },
]

export function OfflineMapsPage() {
  const navigate = useNavigate()
  const { coords } = useGeolocation()
  const savedRegions = useLiveQuery(() => db.mapRegions.toArray(), []) || []

  const [downloader] = useState(() => new RegionDownloader())
  const [selectedPreset, setSelectedPreset] = useState<PresetRegion>(PRESETS[0])
  const [minZoom, setMinZoom] = useState(11)
  const [maxZoom, setMaxZoom] = useState(13)
  const [customName, setCustomName] = useState('')
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [storageStats, setStorageStats] = useState<{ usageMB: number; quotaMB: number }>({ usageMB: 0, quotaMB: 0 })

  useEffect(() => {
    RegionDownloader.getCacheStorageStats().then(setStorageStats)
  }, [savedRegions])

  // Custom region based on user location
  const handleUseMyLocation = () => {
    if (!coords) return
    const delta = 0.04
    const myPreset: PresetRegion = {
      name: 'Current City Radius (~10km)',
      bounds: {
        north: coords.latitude + delta,
        south: coords.latitude - delta,
        east: coords.longitude + delta,
        west: coords.longitude - delta
      },
      description: `Centered at ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
    }
    setSelectedPreset(myPreset)
    setCustomName('My Vicinity Offline Pack')
  }

  const calculatedTiles = calculateTiles(selectedPreset.bounds, minZoom, maxZoom)
  const estimatedMB = Math.round((calculatedTiles.length * 20) / 1024 * 10) / 10

  const handleStartDownload = async () => {
    const name = customName.trim() || selectedPreset.name
    try {
      await downloader.downloadRegion(
        name,
        selectedPreset.bounds,
        minZoom,
        maxZoom,
        (p) => setProgress(p)
      )
      setCustomName('')
      RegionDownloader.getCacheStorageStats().then(setStorageStats)
    } catch (err) {
      console.warn('Download finished or interrupted', err)
    }
  }

  const handleDelete = async (region: any) => {
    await RegionDownloader.deleteRegion(region)
    RegionDownloader.getCacheStorageStats().then(setStorageStats)
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/map')}
              className="p-1 rounded-lg hover:bg-white/10 text-accent-cyan"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text)' }}>
              Offline Map Packs
            </h1>
          </div>
          <p className="text-xs md:text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Pre-cache map regions into your browser cache for 100% offline navigation without internet.
          </p>
        </div>

        {/* Storage stats */}
        <div className="glass-card px-4 py-2.5 flex items-center gap-3">
          <HardDrive size={18} className="text-accent-cyan" />
          <div className="text-xs">
            <div className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {storageStats.usageMB} MB / {storageStats.quotaMB} MB
            </div>
            <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Offline Cache Storage Used
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Downloader Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-5 space-y-5">
            <h2 className="font-display font-bold text-base flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Download size={18} className="text-accent-violet" /> Download New Region
            </h2>

            {/* Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Select Bounding Box Region
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setSelectedPreset(preset)
                      setCustomName('')
                    }}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      selectedPreset.name === preset.name
                        ? 'border-accent-violet bg-accent-violet/10 shadow-sm'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>
                      {preset.name}
                    </div>
                    <div className="text-[10px] mt-1 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>

              {coords && (
                <button
                  onClick={handleUseMyLocation}
                  className="mt-2 text-xs text-accent-cyan hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <MapPin size={13} /> Center on My Current GPS Location ({coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)})
                </button>
              )}
            </div>

            {/* Custom Pack Name */}
            <div>
              <label className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Pack Name (Optional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={selectedPreset.name}
                className="input-field mt-1 text-xs"
              />
            </div>

            {/* Zoom Levels */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Min Zoom: {minZoom}
                </label>
                <input
                  type="range"
                  min="10"
                  max="13"
                  value={minZoom}
                  onChange={(e) => setMinZoom(Math.min(Number(e.target.value), maxZoom))}
                  className="w-full mt-1 accent-[#7c3aed]"
                />
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  Regional Overview
                </span>
              </div>
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Max Zoom: {maxZoom}
                </label>
                <input
                  type="range"
                  min="12"
                  max="14"
                  value={maxZoom}
                  onChange={(e) => setMaxZoom(Math.max(Number(e.target.value), minZoom))}
                  className="w-full mt-1 accent-[#06b6d4]"
                />
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  Street & Building Level
                </span>
              </div>
            </div>

            {/* Summary Pill */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-accent-cyan" />
                <span style={{ color: 'var(--color-text-muted)' }}>Estimated Tiles:</span>
                <span className="font-bold text-accent-cyan">{calculatedTiles.length} tiles</span>
              </div>
              <div className="font-bold text-accent-violet">
                ~{estimatedMB} MB
              </div>
            </div>

            {/* Progress Bar */}
            {progress && progress.status === 'downloading' && (
              <div className="space-y-2 p-3.5 rounded-xl bg-accent-violet/10 border border-accent-violet/30">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-accent-cyan">
                    <RefreshCw size={13} className="animate-spin" /> Downloading map tiles...
                  </span>
                  <span>{progress.percent}% ({progress.completed} / {progress.total})</span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-violet to-accent-cyan transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{Math.round(progress.bytesDownloaded / (1024 * 1024) * 10) / 10} MB downloaded</span>
                  <button
                    onClick={() => downloader.cancel()}
                    className="text-red-400 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleStartDownload}
                disabled={progress?.status === 'downloading'}
                className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                <Download size={15} /> Download Map Pack ({calculatedTiles.length} tiles)
              </button>
              <button
                onClick={() => navigate('/map')}
                className="btn-ghost px-4 py-2.5 text-xs flex items-center gap-1"
              >
                Open Map <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Saved Regions */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-display font-bold text-base flex items-center justify-between" style={{ color: 'var(--color-text)' }}>
              <span>Saved Packs ({savedRegions.length})</span>
            </h2>

            {savedRegions.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <MapPin size={28} className="mx-auto text-gray-500 opacity-40" />
                <div className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  No offline regions saved yet.
                </div>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  Download a region pack to use MapLibre without mobile data or Wi-Fi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedRegions.map((region) => (
                  <div
                    key={region.id}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/[0.03] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs truncate" style={{ color: 'var(--color-text)' }}>
                          {region.name}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          Zoom {region.minZoom} - {region.maxZoom} • {region.tileCount} tiles
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {region.status === 'ready' ? (
                          <span className="p-1 rounded bg-emerald-500/15 text-emerald-400" title="Ready for offline use">
                            <CheckCircle2 size={14} />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-red-500/15 text-red-400" title="Download incomplete">
                            <AlertCircle size={14} />
                          </span>
                        )}
                        <button
                          onClick={() => handleDelete(region)}
                          className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-red-400"
                          title="Delete pack"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                      <span className="font-semibold text-accent-cyan">
                        {Math.round((region.sizeBytes / (1024 * 1024)) * 10) / 10} MB
                      </span>
                      <button
                        onClick={() => navigate('/map')}
                        className="text-accent-violet hover:underline flex items-center gap-0.5 font-medium"
                      >
                        View <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
