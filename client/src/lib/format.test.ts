import { describe, expect, it } from 'vitest'
import { formatDate, formatFare, formatTime } from './format'

describe('formatFare', () => {
  it('formats cents as rands', () => {
    expect(formatFare(4500)).toBe('R 45.00')
    expect(formatFare(1250)).toBe('R 12.50')
    expect(formatFare(0)).toBe('R 0.00')
  })

  it('groups thousands with a space', () => {
    expect(formatFare(123450)).toBe('R 1 234.50')
  })

  it('says "Contact for fare" when no fare is published', () => {
    expect(formatFare(null)).toBe('Contact for fare')
  })
})

describe('SAST display', () => {
  it('converts UTC to Africa/Johannesburg (UTC+2)', () => {
    expect(formatTime('2026-11-24T04:30:00Z')).toBe('06:30')
    expect(formatDate('2026-11-23T23:30:00Z')).toBe('24 Nov 2026')
  })
})
