import type { Queryable } from '../lib/db.ts'
import { escapeLike } from '../lib/sql.ts'
import { iso, type OperatorSummary } from './listings.ts'

export interface OperatorListing extends OperatorSummary {
  description: string
  serviceArea: string
  transportTypes: string[]
  activeRouteCount: number
}

export interface OperatorSearchParams {
  q?: string
  transportType?: 'minibus_taxi' | 'shuttle' | 'bus' | 'coach'
  page: number
  pageSize: number
}

/**
 * GET /api/operators/search: the directory of approved operators (PRD §11.2,
 * F5). Only admin-verified operators appear here (BR9); contact details and
 * restricted identifiers are not included.
 */
export async function searchOperators(db: Queryable, params: OperatorSearchParams) {
  const { rows } = await db.query(
    `select op.id, op.business_name, op.verification_status::text as verification_status,
            op.verified_at, op.description, op.service_area,
            coalesce(array_agg(distinct r.transport_type::text) filter (where r.id is not null), '{}') as transport_types,
            count(r.id)::int as active_route_count,
            count(*) over () as total_count
       from public.operators op
       left join public.operator_routes r on r.operator_id = op.id and r.status = 'active'
       join public.profiles p on p.id = op.owner_id
      where op.verification_status = 'verified'
        and p.account_status in ('active', 'restricted')
        and ($1::text is null or op.business_name ilike $1 or op.service_area ilike $1)
      group by op.id
     having $2::text is null or $2::text = any (array_agg(r.transport_type::text))
      order by op.business_name
      limit $3 offset $4`,
    [
      params.q ? `%${escapeLike(params.q.trim())}%` : null,
      params.transportType ?? null,
      params.pageSize,
      (params.page - 1) * params.pageSize,
    ],
  )
  const total = rows.length ? Number(rows[0]!.total_count) : 0
  const items: OperatorListing[] = rows.map((r) => ({
    id: r.id as string,
    businessName: r.business_name as string,
    verificationStatus: r.verification_status as OperatorSummary['verificationStatus'],
    verifiedAt: r.verified_at ? iso(r.verified_at as Date) : null,
    description: r.description as string,
    serviceArea: r.service_area as string,
    transportTypes: r.transport_types as string[],
    activeRouteCount: r.active_route_count as number,
  }))
  return {
    operators: items,
    pagination: {
      total,
      page: params.page,
      pageSize: params.pageSize,
      hasMore: params.page * params.pageSize < total,
    },
  }
}
