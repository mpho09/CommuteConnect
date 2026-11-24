import type { Queryable } from '../lib/db.ts'
import { ApiError } from '../lib/errors.ts'
import type { Logger } from '../lib/logger.ts'
import {
  groupStops,
  journeyColumns,
  routeColumns,
  stopsSql,
  toJourney,
  toRoute,
  type Journey,
  type OperatorRoute,
} from './listings.ts'

/** Origin/destination proximity for search (km). */
export const SEARCH_RADIUS_KM = 3

export interface SearchParams {
  originId: string
  destinationId: string
  /** "YYYY-MM-DD" SAST */
  date?: string
  /** "HH:mm" SAST */
  time?: string
  windowMinutes: number
  frequency: 'once_off' | 'recurring' | 'any'
  transportType?: 'minibus_taxi' | 'shuttle' | 'bus' | 'coach' | 'shared'
  /** Only routes from admin-verified operators (S7 filter). */
  verifiedOnly: boolean
  sort: 'recommended' | 'fare' | 'recent'
  page: number
  pageSize: number
}

export interface Page {
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface SearchResults {
  routes: OperatorRoute[]
  journeys: Journey[]
  pagination: { routes: Page; journeys: Page }
}

const ROUTE_ORDER: Record<SearchParams['sort'], string> = {
  // Stale listings drop down (BR11); verified operators first; then cheapest
  recommended: `needs_confirmation, (op.verification_status = 'verified') desc, r.fare_cents nulls last, r.route_name`,
  fare: `r.fare_cents nulls last, needs_confirmation, r.route_name`,
  recent: `r.last_confirmed_at desc, r.route_name`,
}

const JOURNEY_ORDER: Record<SearchParams['sort'], string> = {
  recommended: `dep_time, j.created_at`,
  fare: `j.cost_sharing_cents nulls first, dep_time`,
  recent: `j.created_at desc`,
}

/**
 * Searches operator routes and shared journeys (US4, F2, F5). Results are
 * separate groups, each paginated. Excludes past, full, cancelled and
 * suspended content; flags stale routes (BR11).
 */
export async function search(
  db: Queryable,
  params: SearchParams,
  { userId, freshnessDays, logger }: { userId?: string; freshnessDays: number; logger: Logger },
): Promise<SearchResults> {
  await assertPlaces(db, params, userId)
  const offset = (params.page - 1) * params.pageSize
  const wantRoutes = params.transportType !== 'shared'
  const wantJourneys = !params.transportType || params.transportType === 'shared'

  const [routes, journeys] = await Promise.all([
    wantRoutes ? searchRoutes(db, params, offset, freshnessDays) : { items: [], total: 0 },
    wantJourneys ? searchJourneys(db, params, offset) : { items: [], total: 0 },
  ])

  const page = (total: number): Page => ({
    total,
    page: params.page,
    pageSize: params.pageSize,
    hasMore: offset + params.pageSize < total,
  })

  // F11 metrics. Counts and filters only: no places, times or dates (search
  // patterns are personal). A metrics failure never fails the search.
  await db
    .query(
      `insert into public.analytics_events (event_type, user_id, properties) values ('search', $1, $2)`,
      [
        userId ?? null,
        JSON.stringify({
          has_results: routes.total + journeys.total > 0,
          route_count: routes.total,
          journey_count: journeys.total,
          frequency: params.frequency,
          transport_type: params.transportType ?? 'any',
          page: params.page,
        }),
      ],
    )
    .catch((e: unknown) =>
      logger.warn('analytics insert failed', { name: e instanceof Error ? e.name : 'unknown' }),
    )

  return {
    routes: routes.items,
    journeys: journeys.items,
    pagination: { routes: page(routes.total), journeys: page(journeys.total) },
  }
}

/** Origin and destination must be selectable places: public, or the caller's own (BR3). */
async function assertPlaces(db: Queryable, params: SearchParams, userId?: string) {
  const { rows } = await db.query<{ id: string }>(
    `select id from public.locations
      where id = any($1::uuid[]) and (not is_private or owner_id = $2::uuid)`,
    [[params.originId, params.destinationId], userId ?? null],
  )
  const found = new Set(rows.map((r) => r.id))
  const fieldErrors: Record<string, string> = {}
  if (!found.has(params.originId)) fieldErrors.originId = 'Choose a place from the list.'
  if (!found.has(params.destinationId)) fieldErrors.destinationId = 'Choose a place from the list.'
  if (Object.keys(fieldErrors).length) throw new ApiError('validation', { fieldErrors })
}

async function searchRoutes(
  db: Queryable,
  params: SearchParams,
  offset: number,
  freshnessDays: number,
): Promise<{ items: OperatorRoute[]; total: number }> {
  // A route matches when some point near the origin comes before some point
  // near the destination along origin -> stops -> destination.
  const { rows } = await db.query(
    `with o as (select latitude as lat, longitude as lng from public.locations where id = $1),
          d as (select latitude as lat, longitude as lng from public.locations where id = $2),
          pts as (
            select r.id as route_id, 0 as ord, l.latitude, l.longitude
              from public.operator_routes r join public.locations l on l.id = r.origin_location_id
            union all
            select s.route_id, s.stop_order, l.latitude, l.longitude
              from public.route_stops s join public.locations l on l.id = s.location_id
            union all
            select r.id, 32767, l.latitude, l.longitude
              from public.operator_routes r join public.locations l on l.id = r.destination_location_id
          ),
          matched as (
            select distinct a.route_id
              from pts a
              join pts b on b.route_id = a.route_id and b.ord > a.ord
              cross join o cross join d
             where private.distance_km(a.latitude, a.longitude, o.lat, o.lng) <= $3
               and private.distance_km(b.latitude, b.longitude, d.lat, d.lng) <= $3
          )
     select ${routeColumns(freshnessDays)}, count(*) over () as total_count
       from public.operator_routes r
       join matched m on m.route_id = r.id
       join public.operators op on op.id = r.operator_id
       join public.locations ol on ol.id = r.origin_location_id
       join public.locations dl on dl.id = r.destination_location_id
      where r.status = 'active'
        and op.verification_status in ('pending', 'under_review', 'verified')
        and (not $4::boolean or op.verification_status = 'verified')
        and ($5::text is null or r.transport_type::text = $5::text)
      order by ${ROUTE_ORDER[params.sort]}
      limit $6 offset $7`,
    [
      params.originId,
      params.destinationId,
      SEARCH_RADIUS_KM,
      params.verifiedOnly,
      params.transportType ?? null,
      params.pageSize,
      offset,
    ],
  )
  if (rows.length === 0) {
    return { items: [], total: offset > 0 ? await countRoutesOnly(db, params, freshnessDays) : 0 }
  }
  const stops = groupStops((await db.query(stopsSql, [rows.map((r) => r.id as string)])).rows)
  return {
    items: rows.map((r) => toRoute(r, stops.get(r.id as string) ?? [])),
    total: Number(rows[0]!.total_count),
  }
}

/** Total when the requested page is past the end (window count is empty then). */
async function countRoutesOnly(db: Queryable, params: SearchParams, freshnessDays: number) {
  const firstPage = await searchRoutes(db, { ...params, page: 1, pageSize: 1 }, 0, freshnessDays)
  return firstPage.total
}

async function searchJourneys(
  db: Queryable,
  params: SearchParams,
  offset: number,
): Promise<{ items: Journey[]; total: number }> {
  const { rows } = await db.query(
    `with o as (select latitude as lat, longitude as lng from public.locations where id = $1),
          d as (select latitude as lat, longitude as lng from public.locations where id = $2),
          sast_today as (select (now() at time zone 'Africa/Johannesburg')::date as day)
     select ${journeyColumns},
            coalesce((j.departure_at at time zone 'Africa/Johannesburg')::time, rs.departure_time) as dep_time,
            count(*) over () as total_count
       from public.journeys j
       join public.profiles p on p.id = j.publisher_id
       join public.locations ol on ol.id = j.origin_location_id
       join public.locations dl on dl.id = j.destination_location_id
       left join public.recurring_schedules rs on rs.journey_id = j.id
       cross join o cross join d cross join sast_today t
      where j.status = 'open'
        and j.seats_available > 0
        and j.eligibility_review_state in ('not_required', 'approved')
        and p.account_status in ('active', 'restricted')
        -- BR4: no past journeys; recurring schedules must not have ended
        and (
          (j.journey_type = 'once_off' and j.departure_at > now())
          or (j.journey_type = 'recurring' and rs.journey_id is not null
              and (rs.valid_until is null or rs.valid_until >= t.day))
        )
        and ($3::text = 'any' or j.journey_type::text = $3::text)
        and private.distance_km(ol.latitude, ol.longitude, o.lat, o.lng) <= $4
        and private.distance_km(dl.latitude, dl.longitude, d.lat, d.lng) <= $4
        -- Runs on the requested date (recurring: right weekday, in range, day not cancelled or full)
        and (
          $5::date is null
          or (j.journey_type = 'once_off'
              and (j.departure_at at time zone 'Africa/Johannesburg')::date = $5::date)
          or (j.journey_type = 'recurring'
              and extract(isodow from $5::date)::int = any (rs.days_of_week::int[])
              and $5::date >= rs.valid_from
              and (rs.valid_until is null or $5::date <= rs.valid_until)
              and not exists (
                select 1 from public.journey_occurrences jo
                 where jo.journey_id = j.id
                   and (jo.departure_at at time zone 'Africa/Johannesburg')::date = $5::date
                   and (jo.status <> 'scheduled' or jo.seats_available = 0)))
        )
        -- Departure within ± window of the requested time
        and (
          $6::time is null
          or abs(extract(epoch from (
               coalesce((j.departure_at at time zone 'Africa/Johannesburg')::time, rs.departure_time)
               - $6::time))) / 60 <= $7
        )
      order by ${JOURNEY_ORDER[params.sort]}
      limit $8 offset $9`,
    [
      params.originId,
      params.destinationId,
      params.frequency,
      SEARCH_RADIUS_KM,
      params.date ?? null,
      params.time ?? null,
      params.windowMinutes,
      params.pageSize,
      offset,
    ],
  )
  if (rows.length === 0) {
    if (offset === 0) return { items: [], total: 0 }
    const first = await searchJourneys(db, { ...params, page: 1, pageSize: 1 }, 0)
    return { items: [], total: first.total }
  }
  return { items: rows.map(toJourney), total: Number(rows[0]!.total_count) }
}
