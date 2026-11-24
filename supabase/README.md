# Database (Supabase PostgreSQL)

Schema for CommuteConnect, following PRD §10. Supabase Auth owns identities (`auth.users`); everything else lives in `public`, with helper functions and lookup data in a `private` schema that the Data API does not expose.

| Path | What it is |
| --- | --- |
| `migrations/` | Ordered SQL migrations. Never edit one that has been applied; add a new file. |
| `seed.sql` | SAMPLE/DEMO data for local and test environments only (PRD §8.4, §10.6). |
| `config.toml` | Supabase CLI settings for the local stack. |

## Running it

**Hosted project** (dev/staging), using the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                 # applies migrations/
# Seed only non-production projects:
psql "$DATABASE_URL" -f supabase/seed.sql
```

**Local stack** (needs Docker and a few GB of disk): `supabase start`, then `supabase db reset` to re-create the database from migrations and seed.

**Without Docker:** `cd server && npm test` applies every migration plus the seed to an in-memory Postgres ([PGlite](https://pglite.dev)) and checks the rules below. See `server/src/db/schema.test.ts`. This runs in CI.

Sample users all have the password `sample-pass`:

| Persona | Email | Roles |
| --- | --- | --- |
| Thandi Ndlovu | thandi.sample@example.com | commuter (has travel preferences) |
| Kabelo Maseko | kabelo.sample@example.com | commuter (publishes journeys) |
| Naledi Khumalo | naledi.sample@example.com | commuter, email **not** verified |
| Lerato Mokoena | lerato.demo@example.com | commuter + operator (Midrand Shuttle Demo, pending) |
| Sipho Dlamini | sipho.demo@example.com | operator (Gauteng Commuter Services Demo, verified) |
| Admin Demo | admin.test@example.com | admin (enrol TOTP before using outside local dev) |

## Conventions

- **Ids:** `uuid` primary keys (`gen_random_uuid()`), except the append-only `audit_logs` and `analytics_events` tables, which use identity columns.
- **Time:** every timestamp is `timestamptz`, stored in UTC (BR17). Schedule times (`time` columns) are SAST wall-clock times; `recurring_schedules.timezone` defaults to `Africa/Johannesburg`.
- **Money:** integer **cents** (`fare_cents`, `cost_sharing_cents`) with `currency` defaulting to `ZAR`. The PRD's `fare_amount` is stored as cents to avoid rounding errors.
- **Enums** match the client's API types (`client/src/lib/api/types.ts`).
- **Text** columns have length limits; required text cannot be blank.

## Tables

| Table | Purpose | Key rules |
| --- | --- | --- |
| `profiles` | One per auth user: name, phone (private), status, travel preferences, terms acceptance. | Created by `private.handle_new_user` on sign-up. |
| `user_roles` | `commuter` / `operator` / `admin` capabilities. | Sign-up can request commuter/operator only; **admin is never granted from sign-up metadata**. |
| `locations` | Public landmarks (`owner_id` null) and users' private points. | Private points need an owner; `display_latitude/longitude` are rounded to ~1 km for private points (BR3, BR12). |
| `operators` | Business profile owned by a user. | `verified` requires `verified_at` (BR9); `rejected`/`suspended` require a reason. `registration_number` is restricted. |
| `operator_documents` | Verification evidence. | Stores private storage paths, never URLs. Rejected documents need a reason. |
| `vehicles` | Optional vehicle metadata. | Capacity 1–100. `registration_number` is restricted. |
| `operator_routes` | Operator service between two places. | Different endpoints; fare ≥ 0, or `fare_type = 'contact'` with no fare (BR10); `last_confirmed_at` for staleness (BR11). |
| `route_stops` | Ordered intermediate stops. | Unique `(route_id, stop_order)`. |
| `journeys` | Shared-journey listing. | Once-off needs a **future** `departure_at` and recurring has none (BR4); `0 ≤ seats ≤ capacity`; draft/open need a seat; full means zero (BR6). |
| `recurring_schedules` | Repeat pattern for a recurring journey. | At least one ISO weekday (1 = Mon); `valid_until ≥ valid_from` (BR5). |
| `journey_occurrences` | Dated instances of recurring journeys. | Unique `(journey_id, departure_at)`; can be cancelled individually (BR5). |
| `journey_requests` | Requests to join a journey or one occurrence. | One active (pending/accepted) request per commuter per journey/occurrence; cannot request your own journey (BR7); the occurrence must belong to the journey. |
| `enquiries` | Commuter questions to an operator route. | `responded` requires a response. |
| `notifications` | In-app notifications plus email delivery state. | `link_target` must be an in-app path. |
| `reports` | Safety, fraud or accuracy reports. | Reporter is private. Closing requires a resolution note and `closed_at`. |
| `moderation_actions` | Admin actions on users/listings (BR15). | Reason and admin required. |
| `audit_logs` | Important admin and security actions. | **Append-only**: updates and deletes are rejected. |
| `analytics_events` | Product metrics (#32). | No personal data in `properties`. |

### Status changes (PRD §10.4)

Allowed transitions are listed in `private.status_transitions` and enforced by a trigger on each status column. Setting the same status again is always allowed. *Who* may make a change (owner, admin, system) is checked by the API and by RLS (#23).

| Column | Allowed changes |
| --- | --- |
| `operators.verification_status` | pending → under_review/verified/rejected/suspended; under_review → verified/rejected/suspended; verified → suspended; rejected → under_review; suspended → under_review/verified |
| `operator_routes.status` | any of draft/active/inactive/suspended → active/inactive/suspended (never back to draft) |
| `journeys.status` | draft → open/cancelled; open ↔ full; open/full → paused/cancelled/completed; paused → open/cancelled |
| `journey_occurrences.status` | scheduled → cancelled/completed |
| `journey_requests.status` | pending → accepted/rejected/cancelled; accepted → cancelled (BR14) |
| `enquiries.status` | new → responded/closed; responded → closed |
| `reports.status` | open → investigating/actioned/dismissed/closed; investigating → actioned/dismissed/closed; actioned/dismissed → closed; closed → investigating (reopen) |

## Security defaults

- **Row level security is on for every table, with no policies yet.** The browser's anon and authenticated keys can read nothing until #23 adds policies. The API server uses the service role.
- Helper functions use `set search_path = ''`, and `handle_new_user` is `security definer`, so sign-up can write profiles without opening the tables to users.
- Seed data contains no real documents, licence or registration numbers, or phone numbers.

## Not yet included

- RLS policies and data-boundary tests (#23).
- Atomic seat acceptance (BR8), added with join requests (#27).
- PostGIS geography columns for radius search. Coordinates are `numeric` for now; consider PostGIS when geographic search is built (PRD §10.5).
