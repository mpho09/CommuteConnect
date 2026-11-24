# CommuteConnect

A responsive web platform for commuters and transport providers in South Africa: discover transport options, coordinate shared journeys, and contact operators.

- Product requirements: [docs/PRD.md](docs/PRD.md)
- Screen designs: [docs/designs/](docs/designs/) (design system: [civic_transit_grid](docs/designs/civic_transit_grid/DESIGN.md))

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

## Run the server

```bash
cd server
npm install
cp .env.example .env   # optional; defaults work locally
npm run dev            # http://localhost:4000/api/health
```

Environment variables are validated at startup; the server exits with a list of the invalid names if any are wrong. Scripts mirror the client (`build`, `start`, `lint`, `typecheck`, `test`, `format`).

Errors always use one shape, with codes and messages from PRD §12.2:

```json
{ "error": { "code": "validation", "message": "Some details need fixing.", "fieldErrors": { "seats": "..." }, "requestId": "..." } }
```

## Workflow

Each GitHub issue is delivered as its own branch and pull request. CI (lint, typecheck, test, build) must pass before merging.
