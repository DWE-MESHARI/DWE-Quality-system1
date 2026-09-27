# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- `clayful-quality`'s state (employees/evaluations/activities/config) is persisted via `usePersistentState` in `src/lib/backend.ts` (localStorage, keyed to mirror legacy Firestore collections `emp`/`ev`/`log`/`cfg`). This is the single seam to swap for real Firebase later — see the TODOs at the top of that file and in `src/lib/export.ts`.
- PDF (`exportElementToPdf`) and Excel (`exportToExcel` / `importEvaluationsFromExcel`) in `src/lib/export.ts` use `html2canvas`/`jsPDF`/`XLSX` loaded via CDN `<script>` tags in `index.html` (same versions as `legacy-source/index.html`), not npm packages — avoids adding deps until network/pnpm install is available in this environment.
- `currentUser` in `backend.ts` is a hardcoded stand-in for Firebase Auth (`uid`, `name`, `role`). Activity log entries already carry `uid`/`at` (ISO) so they map 1:1 onto legacy's `log` collection shape (`u`, `t`) once real auth lands.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
