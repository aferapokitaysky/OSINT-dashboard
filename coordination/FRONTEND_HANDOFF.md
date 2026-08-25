# Frontend handoff — PR #4

## What is delivered

- Responsive analyst workbench shell with protected routes, mobile navigation, error and not-found states.
- Login, registration, conditional TOTP challenge, logout and transparent access-token refresh.
- Overview, investigations list/create, case workbench, intelligence search, entity registry/dossier, audit view and source settings.
- Live enrichment status over authenticated Socket.IO (`/ws`, `/events`); reconnect state and backend correlation IDs are visible to the operator.
- Saved investigation graph with lazy-loaded Cytoscape (case initial bundle remains 123 kB).
- File evidence upload UI ready for the P1 backend analysis endpoint.
- Production standalone Next image: built, container smoke-tested, `GET /login` returned 200.

## Verification

- `pnpm --filter @osint/web lint`
- `pnpm --filter @osint/web exec tsc --noEmit`
- `pnpm --filter @osint/web build`
- `docker build -f apps/web/Dockerfile -t osint-web:frontend-check .`
- `docker run -d --name osint-web-smoke -p 3005:3000 osint-web:frontend-check`
- `curl -fsSI http://localhost:3005/login` → 200

## Merge order

1. Merge PR #5 (CI baseline).
2. Merge PR #3 (backend P0).
3. Merge PR #4 (this frontend).

## P1 backend activation dependencies

The UI is intentionally prepared but cannot make these features real until the backend delivers endpoints from `api-contract.md`:

- `GET /providers`
- case-entity attach/list endpoints with the `InvestigationEntity` migration
- evidence upload, metadata/file analysis and evidence list endpoints
- activity/audit feed endpoint
- paginated/cursor collection responses
- graph traversal response instead of only persisted graph state

The current API adapter in `apps/web/src/lib/api.ts` keeps the P0 workflows (auth, investigations, entities, enrichment, stored graph) usable during that transition.
