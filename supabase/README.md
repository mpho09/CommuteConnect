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

## Access rules (row level security)

Two ways in, with different trust:

- **API server** (`server/`): connects with `DATABASE_URL` / the service role, bypasses RLS, and is the **only writer**. It enforces the business rules.
- **Browser** (Supabase Data API with the publishable/anon key and the user's session): **read-only**, limited by RLS. No insert/update/delete privileges or policies exist for `anon`/`authenticated`.

Privileges are granted explicitly (`20261124000400_rls_policies.sql`), so behaviour is the same whether or not a project auto-exposes new tables.

| Table | Guest | Signed-in user | Admin |
| --- | --- | --- | --- |
| `journeys` (+ schedules, occurrences) | open/full listings | listings + all their own | all |
| `operator_routes` (+ stops) | active routes of verified/pending operators | same + their own | all |
| `operators` | verified/pending | same + their own | all |
| `locations` | public landmarks | + their own private points | all |
| `profiles`, `user_roles` | none | own | all |
| `journey_requests` | none | sent by them or on their journeys | all |
| `enquiries` | none | sent by them or on their routes | all |
| `notifications` | none | own | own only |
| `reports` | none | filed by them (targets never see reporters) | all |
| `operator_documents`, `vehicles` | none | their operator's | all |
| `audit_logs`, `moderation_actions`, `analytics_events` | none | none | all |

**Columns never readable from the browser (BR3, BR12):** `locations.latitude/longitude/address_text` (use `display_latitude/longitude`, rounded to ~1 km for private points), `operators.registration_number`, `operators.reviewed_by`, `vehicles.registration_number`.

Policy helpers (`private.is_admin()`, `private.owns_operator()` …) are `security definer` with `search_path = ''`, in the unexposed `private` schema.

The service role key and `DATABASE_URL` are server-only; a test fails if the client app references them. Seed data contains no real documents, licence or registration numbers, or phone numbers.

Tests: `server/src/db/rls.test.ts` checks these boundaries as a guest, commuter A (Thandi), commuter B (Kabelo), operators (Sipho, Lerato) and the admin.

## Not yet included

- Storage bucket policies for verification documents (with uploads, #28).
- Atomic seat acceptance (BR8), added with join requests (#27).
- PostGIS geography columns for radius search. Coordinates are `numeric` for now; consider PostGIS when geographic search is built (PRD §10.5).
