// Analysis history, kept in this browser's localStorage (no database).
// Each entry stores the full result plus a small thumbnail of the image.
// Limitation: history stays on this device and this browser.

import type { ClassifyResponse } from './types'

const KEY = 'adastra:history'
const MAX_ENTRIES = 20
const THUMB_SIDE = 240

export interface HistoryEntry {
  id: string            // the request_id from the backend
  savedAt: string       // ISO date-time
  fileName: string
  thumbnail: string | null  // small JPEG as a data: URL (null for TIFF)
  result: ClassifyResponse
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function save(entries: HistoryEntry[]): void {
  // If storage is full, drop the oldest entries until it fits.
  let list = entries.slice(0, MAX_ENTRIES)
  while (list.length > 0) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list))
      return
    } catch {
      list = list.slice(0, -1)
    }
  }
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage disabled: history simply isn't kept */
  }
}

export function addToHistory(result: ClassifyResponse, fileName: string, thumbnail: string | null): void {
  const entry: HistoryEntry = {
    id: result.request_id,
    savedAt: new Date().toISOString(),
    fileName,
    thumbnail,
    result,
  }
  save([entry, ...loadHistory().filter((e) => e.id !== entry.id)]) // newest first
}

export function removeFromHistory(id: string): HistoryEntry[] {
  const rest = loadHistory().filter((e) => e.id !== id)
  save(rest)
  return rest
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function findThumbnail(requestId: string): string | null {
  return loadHistory().find((e) => e.id === requestId)?.thumbnail ?? null
}

/** A small JPEG copy of the image (about 10-20 KB) for the history list. */
export async function makeThumbnail(file: File): Promise<string | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return null // e.g. TIFF
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, THUMB_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}