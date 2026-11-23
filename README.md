# CommuteConnect

A responsive web platform for commuters and transport providers in South Africa: discover transport options, coordinate shared journeys, and contact operators.

- Product requirements: [docs/PRD.md](docs/PRD.md)
- Screen designs: [docs/designs/](docs/designs/) (design system: [civic_transit_grid](docs/designs/civic_transit_grid/DESIGN.md))

## Repository layout

| Folder    | What it is                                                            |
| --------- | --------------------------------------------------------------------- |
| `client/` | React + Vite + TypeScript web app (Tailwind, React Router, TanStack Query) |
| `docs/`   | PRD, business notes, designs                                          |

The API (`server/`) and database (`supabase/`) come later; see the "Backend API" milestone.

## Run the client

Requires Node.js 22+.

```bash
cd client
npm install
cp .env.example .env.local   # optional
npm run dev
```

Until real auth exists you can browse protected areas by setting `VITE_DEV_ROLE` in `client/.env.local` to `commuter`, `operator` or `admin`.

| Script                 | Does                          |
| ---------------------- | ----------------------------- |
| `npm run dev`          | Start the dev server          |
| `npm run build`        | Typecheck and build for production |
| `npm run lint`         | Lint with oxlint              |
| `npm run typecheck`    | TypeScript check              |
| `npm test`             | Run tests (Vitest + Testing Library) |
| `npm run format`       | Format with Prettier          |

## Workflow

Each GitHub issue is delivered as its own branch and pull request. CI (lint, typecheck, test, build) must pass before merging.
