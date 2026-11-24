import { Router } from 'express'
import type { Db } from '../lib/db.ts'
import type { Logger } from '../lib/logger.ts'
import { validate } from '../middleware/validate.ts'
import { searchOperators, type OperatorSearchParams } from '../services/operatorSearch.ts'
import type { PlacesProvider } from '../services/places.ts'
import { search, type SearchParams } from '../services/searchService.ts'
import {
  operatorSearchQuerySchema,
  placesQuerySchema,
  searchQuerySchema,
} from '../validators/search.ts'

/** Public discovery endpoints (guests allowed): /search, /places, /operators/search. */
export function searchRouter(deps: {
  db: Db
  places: PlacesProvider
  logger: Logger
  freshnessDays: number
}): Router {
  const router = Router()

  router.get('/search', validate({ query: searchQuerySchema }), async (req, res) => {
    const results = await search(deps.db, req.query as unknown as SearchParams, {
      userId: req.auth?.id,
      freshnessDays: deps.freshnessDays,
      logger: deps.logger,
    })
    res.set('Cache-Control', 'no-store')
    res.json(results)
  })

  router.get('/places', validate({ query: placesQuerySchema }), async (req, res) => {
    res.json(await deps.places.search((req.query as unknown as { q: string }).q))
  })

  router.get(
    '/operators/search',
    validate({ query: operatorSearchQuerySchema }),
    async (req, res) => {
      res.json(await searchOperators(deps.db, req.query as unknown as OperatorSearchParams))
    },
  )

  return router
}
