import { describe, expect, it } from 'vitest'
import {
  addDays,
  describeDays,
  isoToSastDate,
  isoToSastTime,
  sastToday,
  sastToIso,
  weekdayOf,
} from './time'

describe('SAST conversions (UTC+2, BR17)', () => {
  it('converts SAST to UTC and back', () => {
    expect(sastToIso('2026-11-24', '07:00')).toBe('2026-11-24T05:00:00.000Z')
    expect(isoToSastTime('2026-11-24T05:00:00.000Z')).toBe('07:00')
  })

  it('handles the date change around midnight', () => {
    expect(sastToday(new Date('2026-11-23T22:30:00Z'))).toBe('2026-11-24')
    expect(isoToSastDate('2026-11-23T22:30:00Z')).toBe('2026-11-24')
    expect(sastToIso('2026-11-24', '01:00')).toBe('2026-11-23T23:00:00.000Z')
  })

  it('computes ISO weekdays and adds days across months', () => {
    expect(weekdayOf('2026-11-24')).toBe(2) // Tuesday
    expect(weekdayOf('2026-11-29')).toBe(7) // Sunday
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
  })
})

describe('describeDays', () => {
  it.each([
    [[1, 2, 3, 4, 5], 'Mon–Fri'],
    [[1, 3, 5], 'Mon, Wed, Fri'],
    [[6, 7], 'Sat, Sun'],
    [[1, 2, 3, 4, 5, 6, 7], 'Daily'],
  ])('%j -> %s', (days, label) => {
    expect(describeDays(days)).toBe(label)
  })
})
