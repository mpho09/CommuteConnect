-- CommuteConnect: enums and shared helpers (PRD §10).
-- Timestamps are timestamptz (stored UTC, BR17). Money is integer ZAR cents.

-- Helpers live in a schema that the Supabase Data API does not expose.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------- enums
-- Values match the client's API types (client/src/lib/api/types.ts).

create type public.app_role as enum ('commuter', 'operator', 'admin');
create type public.account_status as enum ('active', 'restricted', 'suspended', 'deleted');

create type public.verification_status as enum (
  'pending', 'under_review', 'verified', 'rejected', 'suspended'
);
create type public.document_type as enum (
  'operating_licence', 'business_registration', 'proof_of_address', 'vehicle_roadworthy'
);
create type public.document_status as enum ('submitted', 'accepted', 'rejected');

-- exact: public landmark; approximate: private point shown only as a zone (BR3, BR12)
create type public.location_precision as enum ('exact', 'approximate');

create type public.transport_type as enum ('minibus_taxi', 'shuttle', 'bus', 'coach');
create type public.vehicle_status as enum ('active', 'inactive');
create type public.fare_type as enum ('fixed', 'from', 'contact');
create type public.route_status as enum ('draft', 'active', 'inactive', 'suspended');

create type public.journey_type as enum ('once_off', 'recurring');
create type public.journey_status as enum (
  'draft', 'open', 'full', 'paused', 'cancelled', 'completed'
);
create type public.eligibility_review_state as enum (
  'not_required', 'pending', 'approved', 'rejected'
);
create type public.occurrence_status as enum ('scheduled', 'cancelled', 'completed');
create type public.request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
create type public.enquiry_status as enum ('new', 'responded', 'closed');

create type public.notification_type as enum (
  'request_received', 'request_accepted', 'request_rejected', 'request_cancelled',
  'enquiry_received', 'enquiry_responded',
  'verification_submitted', 'verification_decision',
  'journey_changed', 'report_received'
);
create type public.email_status as enum ('not_required', 'pending', 'sent', 'failed');

create type public.report_target_type as enum ('journey', 'route', 'user', 'operator');
create type public.report_status as enum (
  'open', 'investigating', 'actioned', 'dismissed', 'closed'
);
create type public.report_severity as enum ('low', 'medium', 'high');
create type public.moderation_action_type as enum ('warn', 'suspend', 'reinstate', 'remove');

-- ---------------------------------------------------------------- updated_at

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- status transitions
-- Allowed status changes (PRD §10.4). Who may make a change (admin, owner,
-- system) is enforced by the API and RLS; this table guards *which* changes
-- are possible at all, so no code path can skip a step or revive a closed record.

create table private.status_transitions (
  table_name text not null,
  from_status text not null,
  to_status text not null,
  primary key (table_name, from_status, to_status)
);

insert into private.status_transitions (table_name, from_status, to_status) values
  -- operators.verification_status (admin review only)
  ('operators', 'pending', 'under_review'),
  ('operators', 'pending', 'verified'),
  ('operators', 'pending', 'rejected'),
  ('operators', 'pending', 'suspended'),
  ('operators', 'under_review', 'verified'),
  ('operators', 'under_review', 'rejected'),
  ('operators', 'under_review', 'suspended'),
  ('operators', 'verified', 'suspended'),
  ('operators', 'rejected', 'under_review'),   -- resubmitted documents
  ('operators', 'suspended', 'under_review'),
  ('operators', 'suspended', 'verified'),      -- reinstated after investigation
  -- operator_routes.status
  ('operator_routes', 'draft', 'active'),
  ('operator_routes', 'draft', 'inactive'),
  ('operator_routes', 'draft', 'suspended'),
  ('operator_routes', 'active', 'inactive'),
  ('operator_routes', 'active', 'suspended'),
  ('operator_routes', 'inactive', 'active'),
  ('operator_routes', 'inactive', 'suspended'),
  ('operator_routes', 'suspended', 'active'),
  ('operator_routes', 'suspended', 'inactive'),
  -- journeys.status
  ('journeys', 'draft', 'open'),
  ('journeys', 'draft', 'cancelled'),
  ('journeys', 'open', 'full'),
  ('journeys', 'open', 'paused'),
  ('journeys', 'open', 'cancelled'),
  ('journeys', 'open', 'completed'),
  ('journeys', 'full', 'open'),                -- a seat was freed
  ('journeys', 'full', 'paused'),
  ('journeys', 'full', 'cancelled'),
  ('journeys', 'full', 'completed'),
  ('journeys', 'paused', 'open'),
  ('journeys', 'paused', 'cancelled'),
  -- journey_occurrences.status
  ('journey_occurrences', 'scheduled', 'cancelled'),
  ('journey_occurrences', 'scheduled', 'completed'),
  -- journey_requests.status (BR14)
  ('journey_requests', 'pending', 'accepted'),
  ('journey_requests', 'pending', 'rejected'),
  ('journey_requests', 'pending', 'cancelled'),
  ('journey_requests', 'accepted', 'cancelled'),
  -- enquiries.status
  ('enquiries', 'new', 'responded'),
  ('enquiries', 'new', 'closed'),
  ('enquiries', 'responded', 'closed'),
  -- reports.status (admin moderation)
  ('reports', 'open', 'investigating'),
  ('reports', 'open', 'actioned'),
  ('reports', 'open', 'dismissed'),
  ('reports', 'open', 'closed'),
  ('reports', 'investigating', 'actioned'),
  ('reports', 'investigating', 'dismissed'),
  ('reports', 'investigating', 'closed'),
  ('reports', 'actioned', 'closed'),
  ('reports', 'dismissed', 'closed'),
  ('reports', 'closed', 'investigating');      -- reopened

-- Trigger: tg_argv[0] is the status column name.
create function private.enforce_status_transition() returns trigger
language plpgsql set search_path = '' as $$
declare
  old_status text;
  new_status text;
begin
  execute format('select ($1).%1$I::text, ($2).%1$I::text', tg_argv[0])
    into old_status, new_status
    using old, new;
  if old_status is distinct from new_status and not exists (
    select 1 from private.status_transitions t
    where t.table_name = tg_table_name
      and t.from_status = old_status
      and t.to_status = new_status
  ) then
    raise exception 'Invalid % change on %: % -> %',
      tg_argv[0], tg_table_name, old_status, new_status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
