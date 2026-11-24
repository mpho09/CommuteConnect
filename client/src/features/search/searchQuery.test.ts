import { describe, expect, it } from 'vitest'
import {
  parseResultsView,
  parseSearchQuery,
  toSearchParams,
  toSearchUrl,
  type SearchQuery,
} from './searchQuery'

const query: SearchQuery = {
  origin: { id: 'tembisa-plaza', label: 'Tembisa Plaza' },
  destination: { id: 'midrand-gautrain', label: 'Midrand Gautrain' },
  date: '2026-12-01',
  time: '07:00',
  frequency: 'recurring',
}

describe('search query URL', () => {
  it('round-trips through the URL', () => {
    const url = toSearchUrl(query)
    expect(url.startsWith('/search/results?')).toBe(true)
    expect(parseSearchQuery(new URLSearchParams(url.split('?')[1]))).toEqual(query)
  })

  it('leaves out an empty time', () => {
    const url = toSearchUrl({ ...query, time: undefined })
    expect(url).not.toContain('time=')
  })

  it('returns null without origin or destination', () => {
    expect(parseSearchQuery(new URLSearchParams('from=a'))).toBeNull()
  })

  it('drops malformed dates and times and defaults to once-off', () => {
    const q = parseSearchQuery(new URLSearchParams('from=a&to=b&date=soon&time=25:00'))
    expect(q).toMatchObject({ date: undefined, time: undefined, frequency: 'once_off' })
    expect(q?.origin.label).toBe('a')
  })

  it('maps to API search params', () => {
    expect(toSearchParams(query)).toEqual({
      originId: 'tembisa-plaza',
      destinationId: 'midrand-gautrain',
      date: '2026-12-01',
      time: '07:00',
      windowMinutes: 60,
      frequency: 'recurring',
    })
  })

  it('round-trips the window, type and view options', () => {
    const q: SearchQuery = { ...query, window: 30, type: 'shuttle' }
    const url = toSearchUrl(q, { verifiedOnly: true, sort: 'fare' })
    const params = new URLSearchParams(url.split('?')[1])
    expect(parseSearchQuery(params)).toEqual(q)
    expect(parseResultsView(params)).toEqual({ verifiedOnly: true, sort: 'fare' })
    expect(toSearchParams(q)).toMatchObject({ windowMinutes: 30, transportType: 'shuttle' })
  })

  it('keeps default options out of the URL and ignores unknown values', () => {
    const url = toSearchUrl({ ...query, window: 60 }, { sort: 'recommended' })
    expect(url).not.toMatch(/window=|sort=|verified=|type=/)
    const params = new URLSearchParams('from=a&to=b&window=45&type=rocket&sort=random')
    expect(parseSearchQuery(params)).toMatchObject({ window: undefined, type: undefined })
    expect(parseResultsView(params)).toEqual({ verifiedOnly: false, sort: 'recommended' })
  })

  it('sends no single type for "all operator services", and no window without a time', () => {
    expect(toSearchParams({ ...query, type: 'operators' }).transportType).toBeUndefined()
    expect(toSearchParams({ ...query, time: undefined }).windowMinutes).toBeUndefined()
  })
})
