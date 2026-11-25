# CommuteConnect

A responsive web platform for commuters and transport providers in South Africa: discover transport options, coordinate shared journeys, and contact operators.

- Product requirements: [docs/PRD.md](docs/PRD.md)
- Screen designs: [docs/designs/](docs/designs/) (design system: [civic_transit_grid](docs/designs/civic_transit_grid/DESIGN.md))
- Design source (Google Stitch): [CommuteConnect project](https://stitch.google.com/projects/12307431067623660499)

## Repository layout

| Folder    | What it is                                                            |
| --------- | --------------------------------------------------------------------- |
| `client/` | React + Vite + TypeScript web app (Tailwind, React Router, TanStack Query) |
| `server/` | Express + TypeScript REST API (Zod validation, helmet, rate limiting) |
| `supabase/` | Database migrations, SAMPLE seed data and schema docs ([README](supabase/README.md)) |
| `docs/`   | PRD, business notes, designs                                          |

The API's feature endpoints come next; see the "Backend API" milestone.

## Run the client

Requires Node.js 22+.

```bash
cd client
npm install
cp .env.example .env.local   # optional
npm run dev
```

The client runs on an in-memory mock API with SAMPLE data (`VITE_USE_MOCKS=true`). Use the **Demo data** button (bottom-left) to switch between guest, commuter, operator and admin personas and to simulate slow or failing requests.

| Script                 | Does                          |
| ---------------------- | ----------------------------- |
| `npm run dev`          | Start the dev server          |
| `npm run build`        | Typecheck and build for production |
| `npm run lint`         | Lint with oxlint              |
| `npm run typecheck`    | TypeScript check              |
| `npm test`             | Run tests (Vitest + Testing Library) |
| `npm run format`       | Format with Prettier          |

## Deploy the client (Vercel)

The client deploys to Vercel as a static Vite app:

- **Root directory:** `client` (Vercel auto-detects Vite; settings live in [client/vercel.json](client/vercel.json))
- **Node.js:** 22.x
- **Environment:** `VITE_USE_MOCKS=true` until the real API is connected (#34)

`client/vercel.json` rewrites every path to `index.html` so deep links like `/commuter/journeys` work on reload. With mocks on, the deployed app is a self-contained demo: SAMPLE data, the **Demo data** persona switcher, and data that resets on reload.

## Run the server

```bash
cd server
npm install
cp .env.example .env   # optional; defaults work locally
npm run dev            # http://localhost:4000/api/health
```

Environment variables are validated at startup; the server exits with a list of the invalid names if any are wrong. Without `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` only `/api/health` is served.

**Auth:** the browser signs up and signs in with Supabase Auth and sends its access token as `Authorization: Bearer <token>`. The API verifies the token against the project's signing keys and loads roles and status from the database on each request (token claims are never trusted for permissions). Route guards: `requireAuth` (signed in, not suspended, terms accepted), `requireVerifiedEmail`, `requireRole(...)`, `requireApprovedOperator`. Profile endpoints: `GET/PATCH/DELETE /api/me`, `POST /api/me/terms`.

**Discovery (public, no sign-in needed):**

- `GET /api/search?originId&destinationId[&date&time&windowMinutes&frequency&transportType&verifiedOnly&sort&page&pageSize]`: operator routes and shared journeys as separate paginated groups (3 km radius; past, full, cancelled and suspended content excluded; stale routes flagged `needsConfirmation`)
- `GET /api/places?q=`: place lookup through a `PlacesProvider` interface (currently public landmarks in the database; Google Maps or Mapbox can be plugged in later)
- `GET /api/operators/search[?q&transportType&page&pageSize]`: verified operators only Scripts mirror the client (`build`, `start`, `lint`, `typecheck`, `test`, `format`).

Errors always use one shape, with codes and messages from PRD §12.2:

```json
{ "error": { "code": "validation", "message": "Some details need fixing.", "fieldErrors": { "seats": "..." }, "requestId": "..." } }
```

## Workflow

Each GitHub issue is delivered as its own branch and pull request. CI (lint, typecheck, test, build) must pass before merging.
