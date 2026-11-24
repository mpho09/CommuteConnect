import { useCallback, useSyncExternalStore } from 'react'
import type { SearchQuery } from './searchQuery'

/**
 * Saved searches, kept on this device per user. There is no saved-search
 * table or endpoint in the PRD data model yet; if one is added, only this
 * module needs to change.
 */
export interface SavedSearch {
  id: string
  /** Date is left out: a saved search is for re-running, so it uses "today". */
  query: Omit<SearchQuery, 'date'>
  savedAt: string
}

export const MAX_SAVED_SEARCHES = 10
const key = (userId: string) => `cc.savedSearches.${userId}`
const listeners = new Set<() => void>()
let seq = 0
const cache = new Map<string, { raw: string | null; value: SavedSearch[] }>()

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}

function read(userId: string): SavedSearch[] {
  const raw = storage()?.getItem(key(userId)) ?? null
  const hit = cache.get(userId)
  // Same snapshot for unchanged storage, as useSyncExternalStore requires.
  if (hit && hit.raw === raw) return hit.value
  let value: SavedSearch[] = []
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) value = parsed as SavedSearch[]
  } catch {
    value = []
  }
  cache.set(userId, { raw, value })
  return value
}

function write(userId: string, list: SavedSearch[]) {
  storage()?.setItem(key(userId), JSON.stringify(list))
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

const sameSearch = (a: SavedSearch['query'], b: SavedSearch['query']) =>
  a.origin.id === b.origin.id &&
  a.destination.id === b.destination.id &&
  a.frequency === b.frequency &&
  (a.time ?? '') === (b.time ?? '') &&
  (a.window ?? 0) === (b.window ?? 0) &&
  (a.type ?? '') === (b.type ?? '')

export function useSavedSearches(userId: string) {
  const searches = useSyncExternalStore(
    subscribe,
    () => read(userId),
    () => [],
  )

  const save = useCallback(
    (query: SearchQuery) => {
      const { date: _date, ...rest } = query
      const list = read(userId).filter((s) => !sameSearch(s.query, rest))
      const entry: SavedSearch = {
        id: `s-${Date.now().toString(36)}-${++seq}`,
        query: rest,
        savedAt: new Date().toISOString(),
      }
      write(userId, [entry, ...list].slice(0, MAX_SAVED_SEARCHES))
    },
    [userId],
  )

  const remove = useCallback(
    (id: string) =>
      write(
        userId,
        read(userId).filter((s) => s.id !== id),
      ),
    [userId],
  )

  const isSaved = useCallback(
    (query: SearchQuery) => {
      const { date: _date, ...rest } = query
      return searches.some((s) => sameSearch(s.query, rest))
    },
    [searches],
  )

  return { searches, save, remove, isSaved }
}
