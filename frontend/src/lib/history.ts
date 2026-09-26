// Analysis history.
//
// When accounts are switched on (production), history is saved on the
// server (MongoDB), tied to the signed-in user — so it follows them to any
// device or browser. When accounts are switched off (local development
// only, no Firebase project configured), this falls back to this browser's
// localStorage exactly as before.
//
// `firebaseEnabled` (a plain constant, not a React hook) is enough to decide
// which path to take: /api/classify already requires sign-in whenever
// accounts are on, so by the time addToHistory() is called after a
// successful analysis, the user is already signed in.

import { clearHistoryRemote, deleteHistoryEntryRemote, getHistory as getHistoryRemote, saveHistoryEntry } from './api'
import { firebaseEnabled } from './firebase'
import type { ClassifyResponse, ServerHistoryEntry } from './types'

const KEY = 'adastra:history'
const MAX_ENTRIES = 20
const THUMB_SIDE = 240

export interface HistoryEntry {
  id: string                 // the request_id from the backend
  savedAt: string             // ISO date-time
  fileName: string
  thumbnail: string | null    // small JPEG as a data: URL (null for TIFF)
  result: ClassifyResponse
}

function fromServer(e: ServerHistoryEntry): HistoryEntry {
  return { id: e.id, savedAt: e.saved_at, fileName: e.file_name, thumbnail: e.thumbnail, result: e.result }
}

// ---------------------------------------------------------- local fallback
function loadLocal(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function saveLocal(entries: HistoryEntry[]): void {
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

// ---------------------------------------------------------------- public API
/** Most recent first. Server-backed when signed in; this browser's storage otherwise. */
export async function loadHistory(): Promise<HistoryEntry[]> {
  if (!firebaseEnabled) return loadLocal()
  try {
    const { entries } = await getHistoryRemote()
    return entries.map(fromServer)
  } catch {
    // Not signed in yet, server unreachable, etc. — show local data rather than nothing.
    return loadLocal()
  }
}

export async function addToHistory(
  result: ClassifyResponse,
  fileName: string,
  thumbnail: string | null,
): Promise<void> {
  if (firebaseEnabled) {
    try {
      await saveHistoryEntry(result, fileName, thumbnail)
      return
    } catch {
      // Server save failed (offline, token hiccup, etc.) — keep the entry
      // somewhere rather than losing it silently.
    }
  }
  const entry: HistoryEntry = { id: result.request_id, savedAt: new Date().toISOString(), fileName, thumbnail, result }
  saveLocal([entry, ...loadLocal().filter((e) => e.id !== entry.id)]) // newest first
}

export async function removeFromHistory(id: string): Promise<HistoryEntry[]> {
  if (firebaseEnabled) {
    try {
      await deleteHistoryEntryRemote(id)
      return loadHistory()
    } catch {
      /* fall through to local */
    }
  }
  const rest = loadLocal().filter((e) => e.id !== id)
  saveLocal(rest)
  return rest
}

export async function clearHistory(): Promise<void> {
  if (firebaseEnabled) {
    try {
      await clearHistoryRemote()
      return
    } catch {
      /* fall through to local */
    }
  }
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export async function findThumbnail(requestId: string): Promise<string | null> {
  const entries = await loadHistory()
  return entries.find((e) => e.id === requestId)?.thumbnail ?? null
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