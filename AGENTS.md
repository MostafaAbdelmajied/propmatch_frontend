# PropMatch AI — frontend

Broker-free long-term rental marketplace launching in Mansoura, Egypt.
Next.js (App Router) + TypeScript, consuming a NestJS backend that does not
exist in this workspace yet (see `.env.example` / `src/mocks` — MSW mocks
stand in for it).

## Sources of truth, ranked

1. ERD + form field specs — not yet provided as a dedicated file; form fields
   ARE fully specified (verbatim Arabic labels) in
   `../PropMatch AI - UI Generation Prompt.md` Section 3A. No ERD yet —
   entities are inferred from the SRS and logged in `ASSUMPTIONS.md`.
2. NestJS backend API contracts — none exist yet. `src/lib/api/contracts` is
   this project's best guess, reconciled against the real backend as it's
   built.
3. `../PropMatch AI - UI Generation Prompt.md` — authoritative for screens,
   flows, states, and all on-screen Arabic copy (Section 12 glossary is
   verbatim truth). Note: `reference/figma-tenant-prototype/src/imports/`
   contains an _earlier_ draft of this same spec with slightly different
   wording — the UI Generation Prompt supersedes it; see
   `docs/analysis/requirements.md` for the diff.
4. Figma file (`https://www.figma.com/design/biM1NAvpeLu37J5Mwfiky2`) — design
   tokens + full Tenant flow already built in RTL Egyptian Arabic.
5. `../project_docs/PropMatch_AI_Revised_Pricing_and_Financial_Scenarios_Report.docx`
   — authoritative for pricing and paid entitlements. Owner Plus,
   Professional Landlord, Express Verification, and broker products are
   excluded from the current implementation scope.
6. `../PropMatch AI - SRS.docx` — functional/non-functional requirements,
   intended backend architecture (NestJS + Prisma/PostgreSQL + ChromaDB RAG +
   Paymob + WebSockets).

## Non-negotiables

- 100% Arabic UI, fully RTL (`<html lang="ar" dir="rtl">` in `app/layout.tsx`).
  Western Arabic numerals, `ج.م` price suffix, Cairo font, no emojis
  (Lucide icons only).
- eKYC verifies identity only, never ownership — always pair a verified badge
  with the ownership disclaimer.
- Owner phone / full PII stays hidden until both parties accept a match.
- Entitlements are enforced server-side; client state only mirrors them.
  Free Owner has one active unit and three direct offers on tenant requests.
  Premium Owner is EGP 999/month with five active units and unlimited direct
  offers while active.
- Paymob direct EGP only — no wallets/points/escrow/BNPL.
- No maps/GPS, no in-app scheduling, no conversational contract drafting
  (form-to-PDF only). See the UI Generation Prompt Section 9 for the full
  out-of-scope list.

## Repo layout

- `app/` — Next.js App Router routes (route groups `(auth)`, `(tenant)`,
  `(landlord)`, `(admin)`, `(shared)`) + BFF Route Handlers (`app/api/**`):
  `auth/*` mint/clear cookies, `backend/[...path]` is a generic proxy that
  attaches the httpOnly token and forwards to the backend.
- `src/lib/api/` — `client.ts` (server-only backend fetch wrapper),
  `browserClient.ts` (client → own Route Handlers), `cookies.ts` (httpOnly
  auth cookies), `serverSession.ts` (RSC session via `/api/auth/me`),
  `contracts/` (Zod DTOs mirroring the backend, one file per module).
- `src/mocks/` — the standalone mock backend: `router.ts` (framework-agnostic
  dispatcher, single source of truth for mock behaviour), `standalone.ts`
  (real HTTP server on the `NESTJS_API_URL` port, started by
  `instrumentation.ts` when `API_MOCKING=enabled`), `db.ts` (in-memory seed),
  and `handlers.ts` (one MSW passthrough → `router.ts`, for Jest only).
- `src/features/` — one folder per module (`auth`, `listings`, `matching`,
  `landlord`, `ekyc`, `payments`, `contracts`, `legal`, `admin`, `profile`),
  each with components/hooks/services/validation/types/tests. See
  `src/features/README.md`.
- `src/components/` (design-system primitives + nav), `src/utils/`
  (formatting, cn), `src/types/`.
- `src/lib/store/` — Zustand stores for client-only UI state (never
  entitlements — those are server-authoritative).
- `proxy.ts` (Next.js 16's renamed `middleware.ts`) — coarse auth-gate redirect only; real authorization is
  enforced server-side (401/403 from the backend).
- `reference/figma-tenant-prototype/` — a Figma Make export of an earlier
  Vite/React prototype (Tenant flow). Kept as visual/structural reference for
  porting screens into `app/`, not part of the build.
- `docs/analysis/` — Phase 1 analysis docs (requirements, feature
  relationships, MVP prioritization, RBAC matrix, data model).
- `ASSUMPTIONS.md` — every assumption made in the absence of the ERD/OpenAPI
  spec, with rationale and how to confirm it.

## Working agreement

Build feature-by-feature (components/hooks/services/validation/types/tests
per feature). Never invent business rules silently — if a rule is
unspecified, either ask or implement a minimal default and log it in
`ASSUMPTIONS.md`. Definition of done per feature: typed (`no-any`), lints
clean, RTL-correct against the design tokens, all four UI states present
(happy/loading/empty/error), permission-checked, audited where critical,
tested, documented.
