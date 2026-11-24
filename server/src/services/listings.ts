/**
 * Public listing shapes (match client/src/lib/api/types.ts) and the SQL +
 * mappers that build them. Only display-safe data leaves here: private
 * pickup points become an area label and coordinates rounded to ~1 km
 * (BR3, BR12); publishers show as "First L." (PRD §10).
 */

export interface Place {
  id: string
  label: string
  area: string
  lat: number
  lng: number
}

export interface OperatorSummary {
  id: string
  businessName: string
  verificationStatus: 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended'
  verifiedAt: string | null
}

export interface OperatorRoute {
  id: string
  operator: OperatorSummary
  routeName: string
  transportType: 'minibus_taxi' | 'shuttle' | 'bus' | 'coach'
  origin: Place
  destination: Place
  stops: Array<{ place: Place; estimatedTime: string | null }>
  fareCents: number | null
  fareType: 'fixed' | 'from' | 'contact'
  scheduleDescription: string
  status: 'draft' | 'active' | 'inactive' | 'suspended'
  lastConfirmedAt: string
  /** Not reconfirmed within the freshness window (BR11). */
  needsConfirmation: boolean
}

export interface Journey {
  id: string
  publisher: { id: string; displayName: string }
  originZone: string
  destinationZone: string
  originApprox: { lat: number; lng: number }
  destinationApprox: { lat: number; lng: number }
  journeyType: 'once_off' | 'recurring'
  departureAt: string | null
  schedule: {
    daysOfWeek: number[]
    departureTime: string
    validFrom: string
    validUntil: string | null
  } | null
  seatsAvailable: number
  vehicleCapacity: number
  costSharingCents: number | null
  notes: string
  status: 'draft' | 'open' | 'full' | 'paused' | 'cancelled' | 'completed'
  createdAt: string
}

export const iso = (d: Date | string) => new Date(d).toISOString()
const num = (v: string | number) => Number(v)
const round2 = (v: string | number) => Math.round(Number(v) * 100) / 100

/** "Thandi Ndlovu" -> "Thandi N." (BR12: no full names on public listings) */
export function displayName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/)
  const last = rest.at(-1)
  return last ? `${first} ${last[0]!.toUpperCase()}.` : (first ?? 'Member')
}

/** Columns for a location aliased `alias`, prefixed `p` in the result row. */
export const placeColumns = (alias: string, p: string) => `
  ${alias}.id as ${p}_id, ${alias}.label as ${p}_label, coalesce(${alias}.area, '') as ${p}_area,
  ${alias}.is_private as ${p}_private,
  ${alias}.display_latitude as ${p}_lat, ${alias}.display_longitude as ${p}_lng`

type Row = Record<string, unknown>

export function toPlace(row: Row, p: string): Place {
  return {
    id: row[`${p}_id`] as string,
    label: row[`${p}_label`] as string,
    area: row[`${p}_area`] as string,
    lat: num(row[`${p}_lat`] as string),
    lng: num(row[`${p}_lng`] as string),
  }
}

// ---------------------------------------------------------------- routes

/** Route + operator + endpoints. Expects aliases r (route), op, ol (origin), dl (destination). */
export const routeColumns = (freshnessDays: number) => `
  r.id, r.route_name, r.transport_type::text as transport_type, r.fare_cents,
  r.fare_type::text as fare_type, r.schedule_description, r.status::text as status,
  r.last_confirmed_at,
  r.last_confirmed_at < now() - make_interval(days => ${Math.trunc(freshnessDays)}) as needs_confirmation,
  op.id as op_id, op.business_name as op_name, op.verification_status::text as op_status,
  op.verified_at as op_verified_at,
  ${placeColumns('ol', 'o')}, ${placeColumns('dl', 'd')}`

export function toRoute(row: Row, stops: OperatorRoute['stops']): OperatorRoute {
  return {
    id: row.id as string,
    operator: {
      id: row.op_id as string,
      businessName: row.op_name as string,
      verificationStatus: row.op_status as OperatorSummary['verificationStatus'],
      verifiedAt: row.op_verified_at ? iso(row.op_verified_at as Date) : null,
    },
    routeName: row.route_name as string,
    transportType: row.transport_type as OperatorRoute['transportType'],
    origin: toPlace(row, 'o'),
    destination: toPlace(row, 'd'),
    stops,
    fareCents: row.fare_cents === null ? null : num(row.fare_cents as number),
    fareType: row.fare_type as OperatorRoute['fareType'],
    scheduleDescription: row.schedule_description as string,
    status: row.status as OperatorRoute['status'],
    lastConfirmedAt: iso(row.last_confirmed_at as Date),
    needsConfirmation: row.needs_confirmation as boolean,
  }
}

/** Ordered stops for the given routes, keyed by route id. */
export const stopsSql = `
  select s.route_id, s.estimated_time::text as estimated_time, ${placeColumns('l', 's')}
    from public.route_stops s join public.locations l on l.id = s.location_id
   where s.route_id = any($1::uuid[])
   order by s.route_id, s.stop_order`

export function groupStops(rows: Row[]): Map<string, OperatorRoute['stops']> {
  const map = new Map<string, OperatorRoute['stops']>()
  for (const row of rows) {
    const list = map.get(row.route_id as string) ?? []
    list.push({
      place: toPlace(row, 's'),
      estimatedTime: (row.estimated_time as string | null)?.slice(0, 5) ?? null,
    })
    map.set(row.route_id as string, list)
  }
  return map
}

// ---------------------------------------------------------------- journeys

/** Journey + publisher + endpoints + schedule. Aliases j, p (profile), ol, dl, rs. */
export const journeyColumns = `
  j.id, j.journey_type::text as journey_type, j.departure_at, j.seats_available,
  j.vehicle_capacity, j.cost_sharing_cents, j.notes, j.status::text as status, j.created_at,
  p.id as publisher_id, p.full_name as publisher_name,
  ${placeColumns('ol', 'o')}, ${placeColumns('dl', 'd')},
  rs.days_of_week::int[] as days_of_week, to_char(rs.departure_time, 'HH24:MI') as schedule_time,
  rs.valid_from::text as valid_from, rs.valid_until::text as valid_until`

function zone(row: Row, p: string): string {
  const label = row[`${p}_label`] as string
  return row[`${p}_private`] || /\barea$/i.test(label) ? label : `${label} area`
}

export function toJourney(row: Row): Journey {
  return {
    id: row.id as string,
    publisher: {
      id: row.publisher_id as string,
      displayName: displayName(row.publisher_name as string),
    },
    originZone: zone(row, 'o'),
    destinationZone: zone(row, 'd'),
    // Always coarse for shared journeys, even from public landmarks
    originApprox: { lat: round2(row.o_lat as string), lng: round2(row.o_lng as string) },
    destinationApprox: { lat: round2(row.d_lat as string), lng: round2(row.d_lng as string) },
    journeyType: row.journey_type as Journey['journeyType'],
    departureAt: row.departure_at ? iso(row.departure_at as Date) : null,
    schedule: row.days_of_week
      ? {
          daysOfWeek: row.days_of_week as number[],
          departureTime: row.schedule_time as string,
          validFrom: row.valid_from as string,
          validUntil: (row.valid_until as string | null) ?? null,
        }
      : null,
    seatsAvailable: num(row.seats_available as number),
    vehicleCapacity: num(row.vehicle_capacity as number),
    costSharingCents:
      row.cost_sharing_cents === null ? null : num(row.cost_sharing_cents as number),
    notes: row.notes as string,
    status: row.status as Journey['status'],
    createdAt: iso(row.created_at as Date),
  }
}
