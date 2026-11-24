import { describe, expect, it } from 'vitest'
import { validateRoute, type RouteValues } from './routeSchema'

const base: RouteValues = {
  routeName: '  Tembisa – Midrand  ',
  transportType: 'minibus_taxi',
  origin: { id: 'tembisa-rank', label: 'Tembisa Taxi Rank' },
  destination: { id: 'midrand-cbd', label: 'Midrand CBD' },
  stops: [{ id: 'rabie-ridge', label: 'Rabie Ridge' }],
  scheduleDescription: 'Weekdays every 20 min',
  fareType: 'fixed',
  fare: '26,50',
}
const errorsFor = (v: Partial<RouteValues>) => validateRoute({ ...base, ...v }).errors

describe('validateRoute', () => {
  it('builds the API input with fares in cents', () => {
    expect(validateRoute(base).input).toEqual({
      routeName: 'Tembisa – Midrand',
      transportType: 'minibus_taxi',
      originId: 'tembisa-rank',
      destinationId: 'midrand-cbd',
      stopIds: ['rabie-ridge'],
      fareType: 'fixed',
      fareCents: 2650,
      scheduleDescription: 'Weekdays every 20 min',
    })
  })

  it('uses no price for "Contact for fare" (BR10)', () => {
    const { input } = validateRoute({ ...base, fareType: 'contact', fare: 'ignored' })
    expect(input?.fareCents).toBeNull()
  })

  it('rejects negative, malformed or missing fares', () => {
    expect(errorsFor({ fare: '-5' })).toHaveProperty('fare')
    expect(errorsFor({ fare: 'R26' })).toHaveProperty('fare')
    expect(errorsFor({ fare: '', fareType: 'from' })).toHaveProperty('fare')
  })

  it('checks names, places, stops and schedule', () => {
    expect(errorsFor({ routeName: 'ab' })).toHaveProperty('routeName')
    expect(errorsFor({ origin: null })).toHaveProperty('origin')
    expect(errorsFor({ destination: base.origin })).toHaveProperty('destination')
    expect(errorsFor({ stops: [null] })).toHaveProperty('stops')
    expect(errorsFor({ stops: [base.origin] })).toHaveProperty(
      'stops',
      'Each place can appear only once on the route.',
    )
    expect(errorsFor({ scheduleDescription: '  ' })).toHaveProperty('scheduleDescription')
  })
})
