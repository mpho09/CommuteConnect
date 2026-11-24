import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MAX_SAVED_SEARCHES, useSavedSearches } from './savedSearches'
import type { SearchQuery } from './searchQuery'

afterEach(() => localStorage.clear())

const query = (to: string, time?: string): SearchQuery => ({
  origin: { id: 'tembisa-plaza', label: 'Tembisa Plaza' },
  destination: { id: to, label: to },
  date: '2026-12-01',
  time,
  frequency: 'once_off',
})

describe('useSavedSearches', () => {
  it('saves newest first without the date, and replaces duplicates', () => {
    const { result } = renderHook(() => useSavedSearches('u-1'))
    act(() => result.current.save(query('a')))
    act(() => result.current.save(query('b')))
    act(() => result.current.save({ ...query('a'), date: '2026-12-25' }))

    expect(result.current.searches.map((s) => s.query.destination.id)).toEqual(['a', 'b'])
    expect(result.current.searches[0].query).not.toHaveProperty('date')
    expect(result.current.isSaved(query('b'))).toBe(true)
    expect(result.current.isSaved(query('b', '07:00'))).toBe(false)
  })

  it(`keeps at most ${MAX_SAVED_SEARCHES}, per user`, () => {
    const { result } = renderHook(() => useSavedSearches('u-1'))
    for (let i = 0; i < MAX_SAVED_SEARCHES + 2; i++) act(() => result.current.save(query(`p${i}`)))
    expect(result.current.searches).toHaveLength(MAX_SAVED_SEARCHES)
    expect(result.current.searches[0].query.destination.id).toBe(`p${MAX_SAVED_SEARCHES + 1}`)

    const other = renderHook(() => useSavedSearches('u-2'))
    expect(other.result.current.searches).toEqual([])
  })

  it('removes a search and survives corrupt storage', () => {
    localStorage.setItem('cc.savedSearches.u-1', '{not json')
    const { result } = renderHook(() => useSavedSearches('u-1'))
    expect(result.current.searches).toEqual([])
    act(() => result.current.save(query('a')))
    act(() => result.current.remove(result.current.searches[0].id))
    expect(result.current.searches).toEqual([])
  })
})
