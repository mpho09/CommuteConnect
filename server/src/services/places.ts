import type { Queryable } from '../lib/db.ts'
import { escapeLike } from '../lib/sql.ts'
import { placeColumns, toPlace, type Place } from './listings.ts'

/**
 * Place lookup behind an interface so the geocoder can be chosen later
 * (Google Maps Platform or Mapbox, PRD §11). The built-in provider searches
 * public landmarks in `locations`. An external provider would return its own
 * results and save the chosen one as a location row so searches can use it.
 */
export interface PlacesProvider {
  search(query: string, limit?: number): Promise<Place[]>
}

export function createDbPlacesProvider(db: Queryable): PlacesProvider {
  return {
    async search(query, limit = 8) {
      const q = query.trim()
      if (q.length < 2) return []
      const { rows } = await db.query(
        `select ${placeColumns('l', 'p')}
           from public.locations l
          where not l.is_private
            and (l.label ilike $1 or l.area ilike $1)
          order by (lower(l.label) like lower($2)) desc, l.label
          limit $3`,
        [`%${escapeLike(q)}%`, `${escapeLike(q)}%`, limit],
      )
      return rows.map((r) => toPlace(r, 'p'))
    },
  }
}
