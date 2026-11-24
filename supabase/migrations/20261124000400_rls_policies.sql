-- Row level security policies (PRD §12.3, BR12, #23).
--
-- Model:
-- * The API server connects with a privileged database role and is the only
--   writer. It enforces business rules (seats, transitions, notifications).
-- * The browser's anon/authenticated keys (Supabase Data API) are READ-ONLY
--   and limited to: public listings, the user's own records, and everything
--   for admins. No insert/update/delete policies exist, so writes are denied.
-- * Private columns (exact coordinates, street addresses, registration
--   numbers) are not granted to anon/authenticated at all (BR3, BR12).
-- RLS was enabled on every table in the core_tables migration.

-- ---------------------------------------------------------------- helpers
-- security definer so policies can check roles/ownership without recursing
-- through RLS; search_path pinned; in `private`, which the Data API doesn't expose.

grant usage on schema private to anon, authenticated;

create function private.current_user_id() returns uuid
language sql stable set search_path = '' as $$
  select auth.uid()
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles
     where user_id = auth.uid() and role = 'admin'
  )
$$;

create function private.owns_operator(operator_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.operators o
     where o.id = operator_id and o.owner_id = auth.uid()
  )
$$;

create function private.owns_journey(journey_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.journeys j
     where j.id = journey_id and j.publisher_id = auth.uid()
  )
$$;

-- Operators shown publicly: verified, or still in review (labelled
-- "Verification pending"; never implied approved). Rejected/suspended hidden.
create function private.operator_is_listed(operator_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.operators o
     where o.id = operator_id
       and o.verification_status in ('pending', 'under_review', 'verified')
  )
$$;

create function private.route_is_listed(route_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.operator_routes r
     where r.id = route_id and r.status = 'active'
       and private.operator_is_listed(r.operator_id)
  )
$$;

create function private.journey_is_listed(journey_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.journeys j
     where j.id = journey_id and j.status in ('open', 'full')
  )
$$;

revoke all on function
  private.current_user_id(), private.is_admin(), private.owns_operator(uuid),
  private.owns_journey(uuid), private.operator_is_listed(uuid),
  private.route_is_listed(uuid), private.journey_is_listed(uuid)
  from public;
grant execute on function
  private.current_user_id(), private.is_admin(), private.owns_operator(uuid),
  private.owns_journey(uuid), private.operator_is_listed(uuid),
  private.route_is_listed(uuid), private.journey_is_listed(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------- table privileges
-- Explicit, not inherited: start from nothing and grant exactly what browser
-- roles may read, so behaviour is the same whether or not the project
-- auto-grants new tables to the Data API. Writes only via the API server.

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- Guests: public listings only
grant select on public.operator_routes, public.route_stops, public.journeys,
                public.recurring_schedules, public.journey_occurrences
  to anon;

-- Signed-in users: listings plus their own records (rows limited by policies below).
-- Back-office tables are admin-only by policy.
grant select on public.operator_routes, public.route_stops, public.journeys,
                public.recurring_schedules, public.journey_occurrences,
                public.profiles, public.user_roles, public.operator_documents,
                public.journey_requests, public.enquiries, public.notifications,
                public.reports, public.moderation_actions, public.audit_logs,
                public.analytics_events
  to authenticated;

-- Column-level privacy: private columns are never granted (BR3, BR12):
-- locations.latitude/longitude/address_text, operators.registration_number,
-- operators.reviewed_by, vehicles.registration_number.
grant select (id, owner_id, label, area, precision_level, is_private,
              display_latitude, display_longitude, created_at)
  on public.locations to anon, authenticated;

grant select (id, owner_id, business_name, description, contact_email, public_contact_method,
              service_area, verification_status, verified_at, reviewed_at, rejection_reason,
              created_at, updated_at)
  on public.operators to anon, authenticated;

grant select (id, operator_id, vehicle_type, make_model, capacity, status, created_at)
  on public.vehicles to authenticated;

-- ---------------------------------------------------------------- policies
-- (select …) wrappers let Postgres evaluate auth helpers once per query.

-- profiles: yourself (incl. your phone), or admin. Others' names come via the API.
create policy "profiles: own or admin" on public.profiles for select to authenticated
  using (id = (select private.current_user_id()) or (select private.is_admin()));

create policy "user_roles: own or admin" on public.user_roles for select to authenticated
  using (user_id = (select private.current_user_id()) or (select private.is_admin()));

-- locations: public landmarks for everyone; private points only for their owner/admin
create policy "locations: public landmarks" on public.locations for select to anon, authenticated
  using (not is_private);
create policy "locations: own private points or admin" on public.locations for select to authenticated
  using (owner_id = (select private.current_user_id()) or (select private.is_admin()));

-- operators: listed ones publicly; your own in any state; admin
create policy "operators: listed" on public.operators for select to anon, authenticated
  using (verification_status in ('pending', 'under_review', 'verified'));
create policy "operators: own or admin" on public.operators for select to authenticated
  using (owner_id = (select private.current_user_id()) or (select private.is_admin()));

-- operator_documents: the owning operator and reviewers only (never public)
create policy "operator_documents: owner or admin" on public.operator_documents for select to authenticated
  using (private.owns_operator(operator_id) or (select private.is_admin()));

create policy "vehicles: owner or admin" on public.vehicles for select to authenticated
  using (private.owns_operator(operator_id) or (select private.is_admin()));

-- routes: active routes of listed operators publicly; own; admin
create policy "operator_routes: listed" on public.operator_routes for select to anon, authenticated
  using (status = 'active' and private.operator_is_listed(operator_id));
create policy "operator_routes: own or admin" on public.operator_routes for select to authenticated
  using (private.owns_operator(operator_id) or (select private.is_admin()));

create policy "route_stops: visible routes" on public.route_stops for select to anon, authenticated
  using (
    private.route_is_listed(route_id)
    or exists (select 1 from public.operator_routes r
                where r.id = route_id
                  and (private.owns_operator(r.operator_id) or (select private.is_admin())))
  );

-- journeys: open/full listings publicly; your own in any state; admin
create policy "journeys: listed" on public.journeys for select to anon, authenticated
  using (status in ('open', 'full'));
create policy "journeys: own or admin" on public.journeys for select to authenticated
  using (publisher_id = (select private.current_user_id()) or (select private.is_admin()));

create policy "recurring_schedules: visible journeys" on public.recurring_schedules for select to anon, authenticated
  using (private.journey_is_listed(journey_id) or private.owns_journey(journey_id)
         or (select private.is_admin()));

create policy "journey_occurrences: visible journeys" on public.journey_occurrences for select to anon, authenticated
  using (private.journey_is_listed(journey_id) or private.owns_journey(journey_id)
         or (select private.is_admin()));

-- requests: the requesting commuter, the journey's publisher, admin
create policy "journey_requests: participants or admin" on public.journey_requests for select to authenticated
  using (commuter_id = (select private.current_user_id())
         or private.owns_journey(journey_id)
         or (select private.is_admin()));

-- enquiries: the commuter, the route's operator, admin
create policy "enquiries: participants or admin" on public.enquiries for select to authenticated
  using (
    commuter_id = (select private.current_user_id())
    or exists (select 1 from public.operator_routes r
                where r.id = operator_route_id and private.owns_operator(r.operator_id))
    or (select private.is_admin())
  );

-- notifications: recipient only (not even admins browse other people's inboxes)
create policy "notifications: recipient" on public.notifications for select to authenticated
  using (recipient_id = (select private.current_user_id()));

-- reports: the reporter sees their own; admins see all. Targets never see who reported them.
create policy "reports: reporter or admin" on public.reports for select to authenticated
  using (reporter_id = (select private.current_user_id()) or (select private.is_admin()));

create policy "moderation_actions: admin" on public.moderation_actions for select to authenticated
  using ((select private.is_admin()));
create policy "audit_logs: admin" on public.audit_logs for select to authenticated
  using ((select private.is_admin()));
create policy "analytics_events: admin" on public.analytics_events for select to authenticated
  using ((select private.is_admin()));
