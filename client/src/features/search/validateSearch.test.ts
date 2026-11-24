import { describe, expect, it } from 'vitest'
import { validateSearch } from './validateSearch'

// 2026-12-01 08:30 SAST
const now = new Date('2026-12-01T06:30:00Z')
const a = { id: 'a', label: 'A' }
const b = { id: 'b', label: 'B' }

describe('validateSearch', () => {
  it('accepts a valid future search', () => {
    expect(
      validateSearch({ origin: a, destination: b, date: '2026-12-01', time: '09:00' }, now),
    ).toEqual({})
  })

  it('requires places picked from the list', () => {
    expect(
      validateSearch({ origin: null, destination: null, date: '2026-12-01', time: '' }, now),
    ).toEqual({
      origin: 'Choose a pickup area from the list.',
      destination: 'Choose a destination from the list.',
    })
  })

  it('rejects the same origin and destination', () => {
    expect(
      validateSearch({ origin: a, destination: a, date: '2026-12-01', time: '' }, now),
    ).toHaveProperty('destination', 'Choose a destination different from your pickup area.')
  })

  it('rejects past dates (BR4)', () => {
    expect(
      validateSearch({ origin: a, destination: b, date: '2026-11-30', time: '' }, now),
    ).toHaveProperty('date', 'Choose today or a future date.')
  })

  it('rejects a time already passed today, in SAST', () => {
    expect(
      validateSearch({ origin: a, destination: b, date: '2026-12-01', time: '08:00' }, now),
    ).toHaveProperty('time')
    // 08:00 tomorrow is fine
    expect(
      validateSearch({ origin: a, destination: b, date: '2026-12-02', time: '08:00' }, now),
    ).toEqual({})
  })

  it('allows an earlier time of day for a recurring commute starting today', () => {
    expect(
      validateSearch(
        { origin: a, destination: b, date: '2026-12-01', time: '07:00', frequency: 'recurring' },
        now,
      ),
    ).toEqual({})
  })

  it('allows any time when none is given', () => {
    expect(
      validateSearch({ origin: a, destination: b, date: '2026-12-01', time: '' }, now),
    ).toEqual({})
  })
})
