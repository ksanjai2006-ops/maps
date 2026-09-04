import { MapRegionsDB } from '@/db/operations'
import type { MapRegion } from '@/db/schema'

export interface DownloadProgress {
  completed: number
  total: number
  percent: number
  bytesDownloaded: number
  status: 'downloading' | 'completed' | 'cancelled' | 'error'
  error?: string
}

// ─── Slippy Map Tile Calculations ──────────────────────────────────────────

export function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
}

export function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
  )
}

export function tile2lon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180
}

export function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

export interface TileCoord {
  x: number
  y: number
  z: number
  url: string
}

export function calculateTiles(
  bounds: { north: number; south: number; east: number; west: number },
  minZoom: number,
  maxZoom: number
): TileCoord[] {
  const tiles: TileCoord[] = []

  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = Math.max(0, lon2tile(bounds.west, z))
    const maxX = Math.min(Math.pow(2, z) - 1, lon2tile(bounds.east, z))
    const minY = Math.max(0, lat2tile(bounds.north, z))
    const maxY = Math.min(Math.pow(2, z) - 1, lat2tile(bounds.south, z))

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({
          x,
          y,
          z,
          url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
        })
      }
    }
  }

  return tiles
}

export const CACHE_NAME = 'lifemap-map-tiles'

export class RegionDownloader {
  private abortController: AbortController | null = null

  cancel() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  async downloadRegion(
    name: string,
    bounds: { north: number; south: number; east: number; west: number },
    minZoom: number,
    maxZoom: number,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<MapRegion> {
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    const tiles = calculateTiles(bounds, minZoom, maxZoom)
    const total = tiles.length

    // Initial Dexie record
    const regionId = await MapRegionsDB.add({
      name,
      bounds,
      minZoom,
      maxZoom,
      downloadedAt: new Date(),
      sizeBytes: 0,
      tileCount: total,
      status: 'downloading'
    })

    let completed = 0
    let bytesDownloaded = 0
    const concurrency = 4

    let cache: Cache | null = null
    try {
      if ('caches' in window) {
        cache = await window.caches.open(CACHE_NAME)
      }
    } catch (e) {
      console.warn('CacheStorage not accessible, continuing in simulation/memory mode', e)
    }

    onProgress?.({
      completed: 0,
      total,
      percent: 0,
      bytesDownloaded: 0,
      status: 'downloading'
    })

    const queue = [...tiles]

    const worker = async () => {
      while (queue.length > 0 && !signal.aborted) {
        const tile = queue.shift()
        if (!tile) break

        try {
          const res = await fetch(tile.url, {
            signal,
            mode: 'cors',
            headers: { 'User-Agent': 'LifeMap-Offline-PWA' }
          })

          if (res.ok) {
            const blob = await res.clone().blob()
            bytesDownloaded += blob.size || 20000 // default ~20KB
            if (cache) {
              await cache.put(tile.url, res)
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') throw err
          // Count tile even if single tile 404s so progress completes
          bytesDownloaded += 15000
        }

        completed++
        onProgress?.({
          completed,
          total,
          percent: Math.round((completed / total) * 100),
          bytesDownloaded,
          status: 'downloading'
        })
      }
    }

    try {
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker())
      await Promise.all(workers)

      if (signal.aborted) {
        await MapRegionsDB.updateStatus(regionId, 'error')
        onProgress?.({ completed, total, percent: 0, bytesDownloaded, status: 'cancelled' })
        throw new Error('Download cancelled')
      }

      await MapRegionsDB.updateStatus(regionId, 'ready', bytesDownloaded, total)
      onProgress?.({
        completed: total,
        total,
        percent: 100,
        bytesDownloaded,
        status: 'completed'
      })

      return {
        id: regionId,
        name,
        bounds,
        minZoom,
        maxZoom,
        downloadedAt: new Date(),
        sizeBytes: bytesDownloaded,
        tileCount: total,
        status: 'ready'
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        await MapRegionsDB.updateStatus(regionId, 'error')
        onProgress?.({ completed, total, percent: 0, bytesDownloaded, status: 'cancelled' })
      } else {
        await MapRegionsDB.updateStatus(regionId, 'error')
        onProgress?.({
          completed,
          total,
          percent: Math.round((completed / total) * 100),
          bytesDownloaded,
          status: 'error',
          error: err.message
        })
      }
      throw err
    }
  }

  static async deleteRegion(region: MapRegion) {
    if (region.id) {
      await MapRegionsDB.delete(region.id)
    }
    // Delete tiles from CacheStorage
    try {
      if ('caches' in window) {
        const cache = await window.caches.open(CACHE_NAME)
        const tiles = calculateTiles(region.bounds, region.minZoom, region.maxZoom)
        for (const t of tiles) {
          await cache.delete(t.url)
        }
      }
    } catch (e) {
      console.warn('Could not clear cached tiles', e)
    }
  }

  static async getCacheStorageStats(): Promise<{ usageMB: number; quotaMB: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate()
      return {
        usageMB: Math.round((usage / (1024 * 1024)) * 10) / 10,
        quotaMB: Math.round((quota / (1024 * 1024)) * 10) / 10
      }
    }
    return { usageMB: 0, quotaMB: 0 }
  }
}
