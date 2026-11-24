-- CommuteConnect: core tables (PRD §10.1–10.5).
-- Conventions: uuid PKs; timestamptz (UTC) timestamps; money in integer ZAR
-- cents; free text has length limits; status columns use enums guarded by
-- private.enforce_status_transition.

-- ================================================================ people

-- One application profile per auth user. Created by the auth trigger
-- (see the auth_profile_sync migration).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name varchar(80) not null check (length(btrim(full_name)) > 0),
  phone varchar(20) check (phone ~ '^\+?[0-9 ]{7,20}$'),             -- private (BR12)
  preferred_language varchar(10) not null default 'en-ZA',
  account_status public.account_status not null default 'active',
  -- Travel preferences used for match suggestions (S4, S12)
  usual_origin_location_id uuid,
  usual_destination_location_id uuid,
  usual_departure_time time,                                          -- SAST wall-clock
  travel_days smallint[] not null default '{}'
    check (travel_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),    -- ISO weekdays
  notify_by_email boolean not null default true,
  profile_complete boolean not null default false,
  terms_accepted_at timestamptz,                                      -- BR18
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Capabilities. 'operator' means the user may manage an operator profile;
-- operator features also need that profile to be verified (BR2, BR9).
-- 'admin' is never self-assigned (only granted by another admin / service role).
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id) on delete set null,
  primary key (user_id, role)
);

-- ================================================================ places

-- Public landmarks (owner_id null) and users' private points. Private points
-- must only be shown via display_latitude/longitude, which are rounded to
-- ~1 km (BR3, BR12).
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  label varchar(120) not null check (length(btrim(label)) > 0),
  area varchar(120),                                                  -- e.g. "Tembisa, Ekurhuleni"
  address_text varchar(200),                                          -- private
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  precision_level public.location_precision not null default 'exact',
  is_private boolean not null default false,
  display_latitude numeric(9, 6) generated always as
    (case when is_private then round(latitude, 2) else latitude end) stored,
  display_longitude numeric(9, 6) generated always as
    (case when is_private then round(longitude, 2) else longitude end) stored,
  created_at timestamptz not null default now(),
  constraint private_locations_have_owner check (not is_private or owner_id is not null)
);

alter table public.profiles
  add constraint profiles_usual_origin_fk
    foreign key (usual_origin_location_id) references public.locations (id) on delete set null,
  add constraint profiles_usual_destination_fk
    foreign key (usual_destination_location_id) references public.locations (id) on delete set null;

-- ================================================================ operators

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  business_name varchar(120) not null check (length(btrim(business_name)) > 0),
  registration_number varchar(40),                                    -- restricted
  description varchar(1000) not null default '',
  contact_email varchar(254) not null check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  public_contact_method varchar(120),
  service_area varchar(120) not null default '',
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- "Verified" only with a recorded decision (BR9)
  constraint verified_has_date check (verification_status <> 'verified' or verified_at is not null),
  constraint rejected_has_reason check (
    verification_status not in ('rejected', 'suspended') or rejection_reason is not null
  )
);

-- Private verification evidence. Rows hold storage paths in a private bucket,
-- never public URLs (PRD §10, §12.3).
create table public.operator_documents (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators (id) on delete cascade,
  document_type public.document_type not null,
  file_name varchar(200) not null,
  storage_path text not null unique check (storage_path !~ '^https?://'),
  status public.document_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles (id) on delete set null,
  rejection_reason varchar(500),
  constraint rejected_document_has_reason check (status <> 'rejected' or rejection_reason is not null)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators (id) on delete cascade,
  vehicle_type public.transport_type not null,
  make_model varchar(80),
  capacity integer not null check (capacity between 1 and 100),
  registration_number varchar(20),                                    -- restricted
  status public.vehicle_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.operator_routes (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators (id) on delete cascade,
  origin_location_id uuid not null references public.locations (id),
  destination_location_id uuid not null references public.locations (id),
  route_name varchar(120) not null check (length(btrim(route_name)) > 0),
  transport_type public.transport_type not null,
  fare_cents integer check (fare_cents >= 0),                         -- BR10
  currency char(3) not null default 'ZAR' check (currency ~ '^[A-Z]{3}$'),
  fare_type public.fare_type not null,
  schedule_description varchar(300) not null check (length(btrim(schedule_description)) > 0),
  status public.route_status not null default 'draft',
  last_confirmed_at timestamptz not null default now(),               -- BR11
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint route_endpoints_differ check (origin_location_id <> destination_location_id),
  -- A fare, or clearly "Contact for fare" (BR10)
  constraint fare_matches_type check ((fare_type = 'contact') = (fare_cents is null))
);

create table public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.operator_routes (id) on delete cascade,
  location_id uuid not null references public.locations (id),
  stop_order smallint not null check (stop_order >= 1),
  estimated_time time,                                                -- SAST wall-clock
  unique (route_id, stop_order)
);

-- ================================================================ journeys

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.profiles (id) on delete cascade,
  origin_location_id uuid not null references public.locations (id),
  destination_location_id uuid not null references public.locations (id),
  journey_type public.journey_type not null,
  departure_at timestamptz,                                           -- once-off only
  seats_available integer not null check (seats_available >= 0),
  vehicle_capacity integer not null check (vehicle_capacity between 1 and 20),
  cost_sharing_cents integer check (cost_sharing_cents >= 0),         -- BR16
  currency char(3) not null default 'ZAR' check (currency ~ '^[A-Z]{3}$'),
  notes varchar(500) not null default '',
  status public.journey_status not null default 'draft',
  eligibility_review_state public.eligibility_review_state not null default 'not_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journey_endpoints_differ check (origin_location_id <> destination_location_id),
  constraint departure_matches_type check ((journey_type = 'once_off') = (departure_at is not null)),
  -- BR6: seats cannot exceed capacity; listable journeys need a free seat; full means none
  constraint seats_within_capacity check (seats_available <= vehicle_capacity),
  constraint open_has_seats check (status not in ('draft', 'open') or seats_available > 0),
  constraint full_has_no_seats check (status <> 'full' or seats_available = 0)
);

-- BR4: once-off journeys must depart in the future when published or rescheduled.
create function private.journey_departure_in_future() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.departure_at is not null
     and (tg_op = 'INSERT' or new.departure_at is distinct from old.departure_at)
     and new.departure_at <= now() then
    raise exception 'Departure must be in the future' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create table public.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null unique references public.journeys (id) on delete cascade,
  days_of_week smallint[] not null check (
    cardinality(days_of_week) between 1 and 7
    and days_of_week <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]       -- BR5, ISO weekdays
  ),
  departure_time time not null,                                       -- SAST wall-clock
  valid_from date not null,
  valid_until date,
  timezone text not null default 'Africa/Johannesburg',
  constraint valid_range check (valid_until is null or valid_until >= valid_from)
);

create table public.journey_occurrences (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys (id) on delete cascade,
  departure_at timestamptz not null,
  status public.occurrence_status not null default 'scheduled',
  seats_available integer not null check (seats_available >= 0),
  cancel_reason varchar(300),
  unique (journey_id, departure_at),
  unique (id, journey_id)                       -- target of journey_requests' composite FK
);

-- ================================================================ requests & enquiries

create table public.journey_requests (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys (id) on delete cascade,
  occurrence_id uuid,
  commuter_id uuid not null references public.profiles (id) on delete cascade,
  message varchar(500) not null default '',
  status public.request_status not null default 'pending',
  cancel_reason varchar(300),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  -- An occurrence must belong to the same journey
  constraint occurrence_of_journey foreign key (occurrence_id, journey_id)
    references public.journey_occurrences (id, journey_id) on delete cascade,
  constraint decided_has_time check (status not in ('accepted', 'rejected') or responded_at is not null)
);

-- BR7: one active request per commuter per journey/occurrence.
create unique index journey_requests_one_active
  on public.journey_requests (
    commuter_id, journey_id,
    coalesce(occurrence_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status in ('pending', 'accepted');

-- BR7: a commuter cannot request to join their own listing.
create function private.journey_request_not_own() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.journeys j
    where j.id = new.journey_id and j.publisher_id = new.commuter_id
  ) then
    raise exception 'Cannot request to join your own journey' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  operator_route_id uuid not null references public.operator_routes (id) on delete cascade,
  commuter_id uuid not null references public.profiles (id) on delete cascade,
  message varchar(1000) not null check (length(btrim(message)) > 0),
  response varchar(1000),
  status public.enquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint responded_has_response check (
    status <> 'responded' or (response is not null and responded_at is not null)
  )
);

-- ================================================================ notifications

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title varchar(120) not null,
  body varchar(500) not null,
  link_target varchar(200) not null check (link_target ~ '^/'),      -- in-app paths only
  is_read boolean not null default false,
  read_at timestamptz,
  email_status public.email_status not null default 'not_required',
  email_attempts smallint not null default 0 check (email_attempts >= 0),
  created_at timestamptz not null default now()
);

-- ================================================================ safety & admin

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,   -- never public
  target_type public.report_target_type not null,
  target_id uuid not null,                       -- polymorphic; resolved by the API
  reason varchar(60) not null,
  description varchar(1000) not null default '',
  severity public.report_severity not null default 'medium',
  status public.report_status not null default 'open',
  assigned_admin_id uuid references public.profiles (id) on delete set null,
  resolution_note varchar(1000),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint resolved_has_note check (
    status not in ('actioned', 'dismissed', 'closed')
    or (resolution_note is not null and closed_at is not null)
  )
);

-- Admin decisions taken on users/listings (BR15). Reason and actor required.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports (id) on delete set null,
  admin_id uuid not null references public.profiles (id) on delete restrict,
  target_type public.report_target_type not null,
  target_id uuid not null,
  action public.moderation_action_type not null,
  reason varchar(1000) not null check (length(btrim(reason)) > 0),
  created_at timestamptz not null default now()
);

-- Append-only record of important admin and security actions (PRD §2.5).
-- metadata must not contain document contents or personal data.
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action varchar(80) not null,
  target_type varchar(40),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function private.audit_logs_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_logs is append-only' using errcode = 'insufficient_privilege';
end;
$$;

-- Product metrics (PRD §3, #32). No personal data in properties.
create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_type varchar(60) not null,
  user_id uuid references public.profiles (id) on delete set null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ================================================================ triggers

create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.operators
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.operator_routes
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.journeys
  for each row execute function private.set_updated_at();

create trigger status_transition before update of verification_status on public.operators
  for each row execute function private.enforce_status_transition('verification_status');
create trigger status_transition before update of status on public.operator_routes
  for each row execute function private.enforce_status_transition('status');
create trigger status_transition before update of status on public.journeys
  for each row execute function private.enforce_status_transition('status');
create trigger status_transition before update of status on public.journey_occurrences
  for each row execute function private.enforce_status_transition('status');
create trigger status_transition before update of status on public.journey_requests
  for each row execute function private.enforce_status_transition('status');
create trigger status_transition before update of status on public.enquiries
  for each row execute function private.enforce_status_transition('status');
create trigger status_transition before update of status on public.reports
  for each row execute function private.enforce_status_transition('status');

create trigger departure_in_future before insert or update of departure_at on public.journeys
  for each row execute function private.journey_departure_in_future();
create trigger not_own_journey before insert or update of commuter_id, journey_id
  on public.journey_requests
  for each row execute function private.journey_request_not_own();
create trigger append_only before update or delete on public.audit_logs
  for each row execute function private.audit_logs_append_only();

-- ================================================================ indexes (PRD §10.5)

create index on public.user_roles (role);
create index on public.locations (owner_id) where owner_id is not null;
create index on public.operators (owner_id);
create index on public.operators (verification_status);
create index on public.operator_documents (operator_id);
create index on public.vehicles (operator_id);
create index on public.operator_routes (operator_id);
create index on public.operator_routes (status, last_confirmed_at);
create index on public.operator_routes (origin_location_id, destination_location_id);
create index on public.route_stops (location_id);
create index on public.journeys (status, journey_type, departure_at);
create index on public.journeys (publisher_id, status);
create index on public.journeys (origin_location_id, destination_location_id);
create index on public.journey_occurrences (departure_at) where status = 'scheduled';
create index on public.journey_requests (journey_id, status);        -- publisher dashboard
create index on public.journey_requests (commuter_id, status);       -- "My requests"
create index on public.enquiries (operator_route_id, status);        -- operator dashboard
create index on public.enquiries (commuter_id, status);
create index on public.notifications (recipient_id, is_read, created_at desc);
create index on public.notifications (email_status) where email_status in ('pending', 'failed');
create index on public.reports (status, created_at);
create index on public.reports (target_type, target_id);
create index on public.moderation_actions (target_type, target_id);
create index on public.audit_logs (target_type, target_id);
create index on public.audit_logs (actor_id, created_at);
create index on public.analytics_events (event_type, created_at);

-- ================================================================ row level security
-- Deny by default: RLS on, no policies yet, so the Data API (anon/authenticated
-- keys) can read nothing. The server uses the service role. Policies: #23.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.locations enable row level security;
alter table public.operators enable row level security;
alter table public.operator_documents enable row level security;
alter table public.vehicles enable row level security;
alter table public.operator_routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.journeys enable row level security;
alter table public.recurring_schedules enable row level security;
alter table public.journey_occurrences enable row level security;
alter table public.journey_requests enable row level security;
alter table public.enquiries enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;
