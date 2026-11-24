-- =====================================================================
-- CommuteConnect SAMPLE / DEMO seed data (PRD §8.4, §10.6)
--
-- FOR DEVELOPMENT AND TEST ENVIRONMENTS ONLY. All people, businesses,
-- routes and messages are fictional. No real ID documents, licence or
-- registration numbers, or personal phone numbers. Mirrors the client mock
-- (client/src/lib/api/mock/seed.ts). Every sample user's password is
-- "sample-pass".
--
-- Dates are relative to when the seed runs, so listings stay in the future.
-- =====================================================================

-- SAST helpers for this session only
create function pg_temp.sast_today() returns date language sql stable as
$$ select (now() at time zone 'Africa/Johannesburg')::date $$;

create function pg_temp.sast_at(days integer, t time) returns timestamptz language sql stable as
$$ select ((pg_temp.sast_today() + days) + t) at time zone 'Africa/Johannesburg' $$;

-- ---------------------------------------------------------------- users
-- Inserting into auth.users fires private.handle_new_user, which creates
-- profiles and commuter/operator roles from the metadata.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('sample-pass', extensions.gen_salt('bf')),
  case when u.verified then now() - interval '60 days' end,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name, 'roles', u.roles, 'accepted_terms', true),
  now() - u.age, now() - u.age,
  '', '', '', ''
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'thandi.sample@example.com', 'Thandi Ndlovu',  '["commuter"]'::jsonb,             true,  interval '60 days'),
  ('10000000-0000-4000-8000-000000000002',       'kabelo.sample@example.com', 'Kabelo Maseko',  '["commuter"]',                    true,  interval '60 days'),
  ('10000000-0000-4000-8000-000000000003',       'naledi.sample@example.com', 'Naledi Khumalo', '["commuter"]',                    false, interval '1 day'),
  ('10000000-0000-4000-8000-000000000004',       'lerato.demo@example.com',   'Lerato Mokoena', '["commuter", "operator"]',        true,  interval '60 days'),
  ('10000000-0000-4000-8000-000000000005',       'sipho.demo@example.com',    'Sipho Dlamini',  '["operator"]',                    true,  interval '60 days'),
  ('10000000-0000-4000-8000-000000000006',       'admin.test@example.com',    'Admin Demo',     '[]',                              true,  interval '60 days'),
  ('10000000-0000-4000-8000-000000000007',       'owner3.demo@example.com',   'Pieter van Wyk', '["operator"]',                    true,  interval '60 days'),
  ('10000000-0000-4000-8000-000000000008',       'owner4.demo@example.com',   'Ayanda Zulu',    '["operator"]',                    true,  interval '60 days')
) as u (id, email, full_name, roles, verified, age);

-- Email/password identities so the sample users can sign in locally
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', u.email_confirmed_at is not null),
       'email', now(), u.created_at, u.created_at
from auth.users u
where u.id::text like '10000000-%';

-- Test-only admin (PRD §8.4). Admin is never granted through sign-up metadata.
-- Enrol a TOTP factor for this account before using it outside local dev.
delete from public.user_roles where user_id = '10000000-0000-4000-8000-000000000006';
insert into public.user_roles (user_id, role) values
  ('10000000-0000-4000-8000-000000000006', 'admin');

-- ---------------------------------------------------------------- places
-- Public landmarks (approximate coordinates)

insert into public.locations (id, label, area, latitude, longitude, precision_level, is_private) values
  ('20000000-0000-4000-8000-000000000001', 'Tembisa Plaza',              'Tembisa, Ekurhuleni',        -25.9963, 28.2268, 'exact', false),
  ('20000000-0000-4000-8000-000000000002', 'Tembisa Taxi Rank',          'Tembisa, Ekurhuleni',        -25.9989, 28.2219, 'exact', false),
  ('20000000-0000-4000-8000-000000000003', 'Rabie Ridge',                'Midrand, Johannesburg',      -26.0185, 28.1875, 'exact', false),
  ('20000000-0000-4000-8000-000000000004', 'Ivory Park',                 'Midrand, Johannesburg',      -25.9906, 28.1972, 'exact', false),
  ('20000000-0000-4000-8000-000000000005', 'Clayville',                  'Olifantsfontein, Ekurhuleni', -25.9681, 28.2391, 'exact', false),
  ('20000000-0000-4000-8000-000000000006', 'Midrand Gautrain Station',   'Midrand, Johannesburg',      -25.9965, 28.1375, 'exact', false),
  ('20000000-0000-4000-8000-000000000007', 'Midrand CBD (Boulders)',     'Midrand, Johannesburg',      -25.9987, 28.1262, 'exact', false),
  ('20000000-0000-4000-8000-000000000008', 'Waterfall City',             'Midrand, Johannesburg',      -26.0170, 28.1065, 'exact', false),
  ('20000000-0000-4000-8000-000000000009', 'Kempton Park CBD',           'Kempton Park, Ekurhuleni',   -26.1035, 28.2330, 'exact', false),
  ('20000000-0000-4000-8000-000000000010', 'Sandton Gautrain Station',   'Sandton, Johannesburg',      -26.1076, 28.0567, 'exact', false),
  ('20000000-0000-4000-8000-000000000011', 'Rosebank Mall',              'Rosebank, Johannesburg',     -26.1460, 28.0436, 'exact', false),
  ('20000000-0000-4000-8000-000000000012', 'Park Station',               'Johannesburg CBD',           -26.1966, 28.0423, 'exact', false),
  ('20000000-0000-4000-8000-000000000013', 'Centurion Gautrain Station', 'Centurion, Tshwane',         -25.8517, 28.1898, 'exact', false),
  ('20000000-0000-4000-8000-000000000014', 'Pretoria Station',           'Pretoria, Tshwane',          -25.7590, 28.1898, 'exact', false);

-- A private pickup point: only display_latitude/longitude (rounded) may be shown
insert into public.locations (id, owner_id, label, area, address_text, latitude, longitude, precision_level, is_private) values
  ('20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000002',
   'Tembisa Plaza area', 'Tembisa, Ekurhuleni', 'SAMPLE · 1 Example Street, Tembisa',
   -25.997412, 28.227905, 'approximate', true);

-- ---------------------------------------------------------------- profiles

update public.profiles set
  profile_complete = true,
  created_at = now() - interval '60 days'
where id::text like '10000000-%';

update public.profiles set
  usual_origin_location_id = '20000000-0000-4000-8000-000000000001',
  usual_destination_location_id = '20000000-0000-4000-8000-000000000006',
  usual_departure_time = '07:00',
  travel_days = '{1,2,3,4,5}'
where id = '10000000-0000-4000-8000-000000000001';

update public.profiles set profile_complete = false, created_at = now() - interval '1 day'
where id = '10000000-0000-4000-8000-000000000003';

-- ---------------------------------------------------------------- operators
-- One per verification state (PRD §10.6). "Verified" here is test-only.

insert into public.operators (
  id, owner_id, business_name, description, contact_email, service_area,
  verification_status, verified_at, reviewed_by, reviewed_at, rejection_reason, created_at
) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004',
   'Midrand Shuttle Demo', 'DEMO · Small shuttle service between Tembisa and Midrand Gautrain.',
   'bookings.demo@example.com', 'Tembisa, Midrand',
   'pending', null, null, null, null, now() - interval '4 days'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005',
   'Gauteng Commuter Services Demo', 'DEMO · Minibus taxi and bus routes across Ekurhuleni and Johannesburg North.',
   'gcs.demo@example.com', 'Tembisa, Kempton Park, Midrand, Sandton',
   'verified', now() - interval '40 days', '10000000-0000-4000-8000-000000000006', now() - interval '40 days', null, now() - interval '55 days'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000007',
   'Northside Lifts Demo', 'DEMO · Rejected application example.',
   'northside.demo@example.com', 'Centurion',
   'rejected', null, '10000000-0000-4000-8000-000000000006', now() - interval '18 days',
   'Operating licence document was unreadable. Please upload a clear copy.', now() - interval '20 days'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000008',
   'Metro Coaches Demo', 'DEMO · Suspended operator example.',
   'metro.demo@example.com', 'Pretoria, Johannesburg',
   'suspended', now() - interval '90 days', '10000000-0000-4000-8000-000000000006', now() - interval '5 days',
   'Suspended while a safety report is investigated.', now() - interval '120 days');

-- Document rows only; no files are uploaded by the seed
insert into public.operator_documents (id, operator_id, document_type, file_name, storage_path, status, submitted_at) values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'operating_licence',
   'SAMPLE-operating-licence.pdf', 'operator-documents/30000000-0000-4000-8000-000000000001/SAMPLE-operating-licence.pdf',
   'submitted', now() - interval '3 days'),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'business_registration',
   'SAMPLE-business-registration.pdf', 'operator-documents/30000000-0000-4000-8000-000000000001/SAMPLE-business-registration.pdf',
   'submitted', now() - interval '3 days');

insert into public.vehicles (operator_id, vehicle_type, make_model, capacity, status) values
  ('30000000-0000-4000-8000-000000000001', 'shuttle', 'SAMPLE 14-seater shuttle', 14, 'active'),
  ('30000000-0000-4000-8000-000000000002', 'minibus_taxi', 'SAMPLE 15-seater minibus', 15, 'active'),
  ('30000000-0000-4000-8000-000000000002', 'bus', 'SAMPLE 60-seater bus', 60, 'active');

-- ---------------------------------------------------------------- routes

insert into public.operator_routes (
  id, operator_id, origin_location_id, destination_location_id, route_name, transport_type,
  fare_cents, fare_type, schedule_description, status, last_confirmed_at, created_at
) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006',
   'Tembisa – Midrand Gautrain shuttle (DEMO)', 'shuttle', 2500, 'fixed',
   'Weekdays · 06:00, 06:45, 07:30', 'active', now() - interval '2 days', now() - interval '30 days'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000007',
   'Tembisa Rank – Midrand CBD (DEMO)', 'minibus_taxi', 1800, 'fixed',
   'Daily · every 20 min, 05:00–19:00', 'active', now() - interval '5 days', now() - interval '30 days'),
  -- Stale: not reconfirmed for 75 days -> "Needs confirmation" (BR11)
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000010',
   'Kempton Park – Sandton Gautrain (DEMO)', 'minibus_taxi', null, 'contact',
   'Weekdays · peak hours 06:00–09:00', 'active', now() - interval '75 days', now() - interval '90 days'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000011',
   'Tembisa – Rosebank express bus (DEMO)', 'bus', 3500, 'from',
   'Weekdays · 06:15, 07:15', 'active', now() - interval '10 days', now() - interval '30 days'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000012',
   'Pretoria – Park Station coach (DEMO)', 'coach', 6000, 'fixed',
   'Daily · 06:00, 12:00, 17:00', 'suspended', now() - interval '15 days', now() - interval '100 days');

insert into public.route_stops (route_id, location_id, stop_order, estimated_time) values
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 1, null),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000006', 2, null),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000010', 1, '07:05');

-- ---------------------------------------------------------------- journeys
-- Once-off and recurring examples, a full listing and a cancelled one (§10.6)

insert into public.journeys (
  id, publisher_id, origin_location_id, destination_location_id, journey_type, departure_at,
  seats_available, vehicle_capacity, cost_sharing_cents, notes, status, created_at
) values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000006',
   'recurring', null, 2, 3, 2000,
   'SAMPLE · Leaving from the Tembisa Plaza area. Happy to share fuel costs.', 'open', now() - interval '7 days'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000008',
   'once_off', pg_temp.sast_at(3, '07:00'), 0, 2, null,
   'SAMPLE · Full listing example.', 'full', now() - interval '7 days'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000008',
   'once_off', pg_temp.sast_at(2, '08:00'), 3, 3, null,
   'SAMPLE · Cancelled listing example.', 'cancelled', now() - interval '7 days'),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000007',
   'recurring', null, 1, 3, null,
   'SAMPLE · Mon/Wed/Fri lift club.', 'open', now() - interval '7 days'),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001',
   'once_off', pg_temp.sast_at(5, '17:30'), 3, 3, null,
   'SAMPLE · Heading home after work.', 'open', now() - interval '7 days');

insert into public.recurring_schedules (journey_id, days_of_week, departure_time, valid_from, valid_until) values
  ('50000000-0000-4000-8000-000000000001', '{1,2,3,4,5}', '06:45', pg_temp.sast_today() - 14, null),
  ('50000000-0000-4000-8000-000000000004', '{1,3,5}',     '07:15', pg_temp.sast_today() - 30, pg_temp.sast_today() + 60);

-- Next 10 occurrences of each recurring journey; Kabelo's 2nd one is cancelled
insert into public.journey_occurrences (journey_id, departure_at, status, seats_available, cancel_reason)
select journey_id,
       (day + departure_time) at time zone 'Africa/Johannesburg',
       case when journey_id = '50000000-0000-4000-8000-000000000001' and n = 2
            then 'cancelled' else 'scheduled' end::public.occurrence_status,
       seats_available,
       case when journey_id = '50000000-0000-4000-8000-000000000001' and n = 2
            then 'SAMPLE · Publisher on leave this day' end
from (
  select s.journey_id, s.departure_time, j.seats_available, d::date as day,
         row_number() over (partition by s.journey_id order by d) as n
  from public.recurring_schedules s
  join public.journeys j on j.id = s.journey_id
  cross join generate_series(pg_temp.sast_today() + 1, pg_temp.sast_today() + 28, interval '1 day') as d
  where extract(isodow from d)::smallint = any (s.days_of_week)
) upcoming
where n <= 10;

-- ---------------------------------------------------------------- requests (one per status)

insert into public.journey_requests (id, journey_id, commuter_id, message, status, cancel_reason, created_at, responded_at) values
  ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'Hi Kabelo, I work near the Gautrain and travel weekdays. Could I join?', 'pending', null,
   now() - interval '1 day', null),
  ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
   'Mon/Wed/Fri works for me.', 'accepted', null,
   now() - interval '6 days', now() - interval '5 days'),
  ('60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004',
   'Is there space on Tuesdays?', 'rejected', null,
   now() - interval '8 days', now() - interval '7 days'),
  ('60000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
   'Could I join for this one?', 'cancelled', 'Journey cancelled by publisher',
   now() - interval '3 days', now() - interval '2 days'),
  ('60000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002',
   'I finish at 17:00 in Sandton, would love a lift.', 'pending', null,
   now() - interval '2 hours', null);

-- ---------------------------------------------------------------- enquiries

insert into public.enquiries (id, operator_route_id, commuter_id, message, response, status, created_at, responded_at) values
  ('70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'Do you have space for a weekly booking from Monday?', null, 'new',
   now() - interval '1 day', null),
  ('70000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   'Does the 06:20 taxi stop at Midrand Gautrain?', 'Yes, all morning taxis stop at Midrand Gautrain on request.', 'responded',
   now() - interval '9 days', now() - interval '8 days');

-- ---------------------------------------------------------------- notifications

insert into public.notifications (recipient_id, type, title, body, link_target, is_read, created_at) values
  ('10000000-0000-4000-8000-000000000001', 'request_accepted', 'Request accepted',
   'Your request was accepted. Review the journey details and coordinate with the publisher.', '/requests', false, now() - interval '5 days'),
  ('10000000-0000-4000-8000-000000000001', 'enquiry_responded', 'Operator replied',
   'The operator has responded to your enquiry.', '/requests', true, now() - interval '8 days'),
  ('10000000-0000-4000-8000-000000000001', 'journey_changed', 'Journey cancelled',
   'A journey you requested has changed or been cancelled.', '/requests', true, now() - interval '2 days'),
  ('10000000-0000-4000-8000-000000000001', 'request_received', 'New request to join',
   'You have a new request to join your journey.', '/commuter/journeys', false, now() - interval '2 hours'),
  ('10000000-0000-4000-8000-000000000002', 'request_received', 'New request to join',
   'You have a new request to join your journey.', '/commuter/journeys', false, now() - interval '1 day'),
  ('10000000-0000-4000-8000-000000000004', 'enquiry_received', 'New enquiry',
   'A commuter has enquired about your route.', '/operator', false, now() - interval '1 day'),
  ('10000000-0000-4000-8000-000000000006', 'verification_submitted', 'Operator ready for review',
   'An operator application is ready for review.', '/admin', false, now() - interval '3 days'),
  ('10000000-0000-4000-8000-000000000006', 'report_received', 'New report',
   'A new report requires review.', '/admin/reports', false, now() - interval '1 day');

-- ---------------------------------------------------------------- reports & moderation

insert into public.reports (id, reporter_id, target_type, target_id, reason, description, severity, status, assigned_admin_id, created_at) values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'route', '40000000-0000-4000-8000-000000000003',
   'inaccurate', 'SAMPLE · The 06:00 departure no longer runs.', 'low', 'open', null, now() - interval '1 day'),
  ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'operator', '30000000-0000-4000-8000-000000000004',
   'safety', 'SAMPLE · Driver was speeding on the N1.', 'high', 'investigating', '10000000-0000-4000-8000-000000000006', now() - interval '6 days');

insert into public.moderation_actions (report_id, admin_id, target_type, target_id, action, reason, created_at) values
  ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', 'operator',
   '30000000-0000-4000-8000-000000000004', 'suspend', 'SAMPLE · Suspended pending safety investigation (BR15).', now() - interval '5 days');

insert into public.audit_logs (actor_id, action, target_type, target_id, metadata, created_at) values
  ('10000000-0000-4000-8000-000000000006', 'operator.verification.verified', 'operator',
   '30000000-0000-4000-8000-000000000002', '{"from": "under_review", "to": "verified"}', now() - interval '40 days'),
  ('10000000-0000-4000-8000-000000000006', 'operator.verification.rejected', 'operator',
   '30000000-0000-4000-8000-000000000003', '{"from": "under_review", "to": "rejected"}', now() - interval '18 days'),
  ('10000000-0000-4000-8000-000000000006', 'operator.suspended', 'operator',
   '30000000-0000-4000-8000-000000000004', '{"report_id": "90000000-0000-4000-8000-000000000002"}', now() - interval '5 days');

-- ---------------------------------------------------------------- analytics
-- 128 sample searches, 97 with results (matches the client mock's counters)

insert into public.analytics_events (event_type, properties, created_at)
select 'search', jsonb_build_object('has_results', n <= 97), now() - (n || ' hours')::interval
from generate_series(1, 128) as n;
