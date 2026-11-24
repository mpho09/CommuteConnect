import { describe, expect, it } from 'vitest'
import type { Journey, OperatorRoute } from '../../lib/api/types'
import { applyView } from './applyView'
import type { SearchQuery } from './searchQuery'

const route = (id: string, fareCents: number | null, verified = true) =>
  ({
    id,
    fareCents,
    operator: { verificationStatus: verified ? 'verified' : 'pending' },
  }) as OperatorRoute

const journey = (id: string, time: string, costSharingCents: number | null) =>
  ({
    id,
    schedule: { departureTime: time },
    departureAt: null,
    costSharingCents,
  }) as unknown as Journey

const results = {
  routes: [route('r-contact', null), route('r-30', 3000, false), route('r-20', 2000)],
  journeys: [journey('j-late', '08:00', 1000), journey('j-early', '06:00', 3000)],
}
const query = {} as SearchQuery
const ids = (xs: Array<{ id: string }>) => xs.map((x) => x.id)

describe('applyView', () => {
  it('keeps server order by default', () => {
    const out = applyView(results, query, { verifiedOnly: false, sort: 'recommended' })
    expect(ids(out.routes)).toEqual(['r-contact', 'r-30', 'r-20'])
  })

  it('sorts by fare with unpublished fares last', () => {
    const out = applyView(results, query, { verifiedOnly: false, sort: 'fare' })
    expect(ids(out.routes)).toEqual(['r-20', 'r-30', 'r-contact'])
    expect(ids(out.journeys)).toEqual(['j-late', 'j-early'])
  })

  it('sorts shared journeys by departure time', () => {
    const out = applyView(results, query, { verifiedOnly: false, sort: 'earliest' })
    expect(ids(out.journeys)).toEqual(['j-early', 'j-late'])
  })

  it('filters to verified operators, and hides journeys for "operators"', () => {
    const out = applyView(results, { type: 'operators' } as SearchQuery, {
      verifiedOnly: true,
      sort: 'recommended',
    })
    expect(ids(out.routes)).toEqual(['r-contact', 'r-20'])
    expect(out.journeys).toEqual([])
  })
})
