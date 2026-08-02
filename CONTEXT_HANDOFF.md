# PropMatch AI — Context Handoff

Everything a new session/model needs to continue. **Current position: Phase 0,
1 and 2 are done and committed; Phase 3 (the reverse-marketplace UI + the rest
of the PRO backlog) is next.**

- Repo: `C:\Users\TUF\OneDrive\Desktop\PropMatch Ai\propmatch_frontend`
- Branch: `dev` · working tree clean · HEAD = `79cb18b`
- Health: **typecheck + lint + 21 tests + `next build` all green**

---

## 1. What this is

**PropMatch AI** — a broker-free, AI-powered, **dual-discovery** residential
rental marketplace for Egypt (launching in Mansoura). ITI graduation capstone,
3-week / 3-sprint MVP. Roles: **Tenant (مستأجر) · Landlord (مالك) · Admin (مشرف)**.

This repo is the **Next.js frontend only**. The NestJS + PostgreSQL backend is
the team's and does not exist yet — an in-process **mock backend** stands in for
it. Arabic-first, fully RTL, Cairo font, no emojis (Lucide only), Western
numerals, prices suffixed `ج.م`.

### The differentiator — dual discovery
1. **Standard marketplace**: tenants browse approved properties; hybrid search =
   hard SQL filters + semantic search (ChromaDB) over free-text.
2. **Reverse marketplace** (the star, *not yet built in the UI*): tenant posts a
   `TENANT_REQUEST` → admin approves (anti-spam) → verified landlords browse it
   with a match score → landlord sends an `OWNER_OFFER` (property + pitch +
   price) → tenant accepts → `MATCH_CONNECTION` CONNECTED → **phone reveal** →
   B2B partner opt-in (`PARTNER_LEAD`).

## 2. Source docs (ranked — higher wins; log conflicts)

All live in the **parent folder** `../`:
1. **`PropMatch AI - Final ERD.docx`** — authoritative for the data model.
2. **`PropMatch AI - SRS (Final - July 16).docx`** — functional/non-functional.
3. **`PropMatch AI - Sprint Plan (Final - July 16).docx`** — V1 scope, PRO-01…19.
4. **`PropMatch AI Full Features.docx`** — feature depth/Arabic UX, *except*
   where it conflicts with 1–3.
5. Figma `https://www.figma.com/design/biM1NAvpeLu37J5Mwfiky2` — tokens + the
   **tenant flow only**.
6. The build prompt the user pastes (fills gaps, sets standards).

> Extract a .docx with: `cd ".."; $env:PYTHONIOENCODING="utf-8"; python.exe extract_doc.py "<file>.docx"`

**Read these repo docs first — they hold all the reasoning:**
- `docs/analysis/conflicts.md` — every source conflict + resolution, the
  decisions taken, the code-vs-ERD divergence table, and **8 open `[CONFIRM]`
  items for the backend team**.
- `docs/analysis/requirements.md`, `feature-relationships.md`, `rbac.md`,
  `mvp.md` (PRO backlog mapping w/ status), `ASSUMPTIONS.md` (22 entries).

## 3. Locked decisions (do NOT re-litigate)

1. **Separate account per role.** `USER.role` is a single enum. Someone who is
   both owner and tenant makes two accounts, each with its own eKYC. **No
   unified account, no role switching.** (Full-Features §2.1 is overruled.)
2. **Broker is Later** — V1 roles are TENANT/LANDLORD/ADMIN. RBAC is
   capability-based so `BROKER` slots in later; never hardcode role names.
3. **Build only PRO-01…19.** Messaging, viewings, deal lifecycle, mutual
   reputation, broker teams, subscriptions, admin sub-roles, support ticketing
   = *Later* (documented, not built).
4. Decisions taken with the user this session (see `conflicts.md` B1–B3):
   - **Single Next.js app**, *not* the monorepo the prompt specifies.
   - **Deleted** the out-of-scope modules (support tickets/AI chat, admin
     team/RBAC UI, audit log, login history).
   - **eKYC rewritten to the ERD** (national ID + selfie), replacing an earlier
     document model (license/proof-of-address + 24h cooldown) built to a
     superseded prompt.

## 4. Stack & conventions

Next.js 16 App Router · TS strict (`no-any`) · Tailwind v4 `@theme` tokens ·
TanStack Query · Zustand (UI only) · RHF + Zod · Recharts · next-intl (`ar`) ·
Jest + RTL + MSW. `middleware.ts` is renamed **`proxy.ts`** (Next 16; exported
fn is `proxy`).

**Two traps that will bite you:**
- `src/utils/cn.ts` uses `extendTailwindMerge` to register the custom text-size
  tokens (`text-body`…). Without it tailwind-merge treats them as text-*colors*
  and **strips `text-white` from every Button**. Keep it.
- `ar-EG` `Intl` defaults to Eastern Arabic-Indic digits → all formatters pin
  `numberingSystem: "latn"` in `src/utils/format.ts`. Never call Intl directly.

## 5. Architecture

```
app/
  (auth)/      login, signup, forgot-password
  (tenant)/    /tenant (browse), /tenant/legal, /tenant/properties/[id]
  (landlord)/  /landlord, properties/new, properties/[id], verify
  (admin)/     /admin (queues), /admin/reports, properties/[id], users/[id]
  (shared)/    /profile, /contracts/new
  api/auth/*             BFF: mints/clears httpOnly cookies
  api/backend/[...path]  generic BFF proxy → attaches token → backend
src/lib/api/
  client.ts / browserClient.ts / cookies.ts / serverSession.ts
  contracts/*    Zod DTOs — ONE FILE PER ERD ENTITY (see contracts/README.md)
src/mocks/
  db.ts          in-memory, table-per-ERD-entity + seed
  router.ts      THE WHOLE MOCK API (dispatch fn) — single source of truth
  standalone.ts  real HTTP server on NESTJS_API_URL port (via instrumentation.ts)
  handlers.ts    one MSW passthrough → router.ts (Jest only)
src/features/    admin, auth, contracts, ekyc, landlord, legal, listings,
                 payments, profile
src/components/  ui/ primitives + nav/ + PropertyCard
```

**Why a standalone mock HTTP server, not MSW interception:** MSW inside Next 16
was unreliable for nested RSC → route-handler → backend calls (intermittent
ECONNREFUSED). The mock is a real server; the same `router.ts` also backs Jest.

## 6. Non-negotiables baked in

- **PII reveal is enforced by OMISSION.** The backend must not serialise
  `ownerPhoneNumber` / `manualAddress` until *this* viewer has an **ACCEPTED
  offer** or **CONNECTED match**. Never client-side hiding. It is a
  **per-connection** gate, not a role capability — `PROPERTY.contact_revealed`
  (a per-property boolean) is too coarse. (`rbac.md`, `requirements.md` §1.2.)
- **eKYC verifies identity, NOT ownership** — always pair a verified badge with
  `<OwnershipDisclaimer />`.
- **Never** send ID images to any AI/LLM or store them in the vector DB. Mask
  `national_id` to last 4 everywhere except the admin review screen + the PDF.
- **Progressive verification**: unverified users browse/draft; verification is
  required to publish a listing/request, accept an offer, reveal contact.
- Server is the entitlement authority; `proxy.ts` is UX only; NestJS `@Roles()`
  is final.

## 7. State vs. the PRO backlog (see `docs/analysis/mvp.md` for detail)

**Every buildable PRO ticket is now done.** PRO-02 auth · PRO-03 eKYC · PRO-04
listing · PRO-05 tenant request · PRO-06 Socket.io realtime · PRO-07/08 all four
moderation queues (capability-gated) · PRO-10 optimizer · PRO-11 hybrid search
w/ filters · PRO-12/13 the reverse marketplace end to end · PRO-14 Paymob sheet ·
PRO-15 contract → print-PDF · PRO-16 B2B opt-in · PRO-17 legal chat UI · PRO-18
quotas/paywalls. Plus the ERD extras: `FAVORITE`, `PROPERTY_REVIEW` submit,
`MATCH_CONNECTION` + phone reveal, and the `NOTIFICATION` bell.

PRO-10 and PRO-17 now **stream** over SSE (`/legal-chat/stream`,
`.../optimize-description/stream`). Gates run before the first token, so a
quota-exhausted optimizer still returns a JSON 403 and opens the paywall.

**Not built, and none are purely frontend work:**
- **PRO-15 backend PDF** + persisted `LEASE_CONTRACT` — *backend-owned.*
- **PRO-19 deploy + E2E** — needs a Vercel project and credentials.

**Out-of-backlog surfaces** (restored per `conflicts.md` B2-R): admin team/RBAC,
audit log + login history, support ticketing. **These have no ERD entity and no
backend** — see the risk note in §2.

## 8. Run it

```bash
cd propmatch_frontend
npm install
cp .env.example .env.local     # API_MOCKING=enabled → mock backend auto-starts
npm run dev                    # http://localhost:3000
```
Seeded logins (any password ≥ 8 chars, e.g. `password123`):

| Email | Role | State |
|---|---|---|
| `tenant@example.com` | tenant | **no** eKYC row → NOT_SUBMITTED |
| `tenant2@example.com` | tenant | eKYC APPROVED, owns approved request `req_1` |
| `landlord@example.com` | landlord | eKYC APPROVED, owns `prop_1/2/5` |
| `landlord2@example.com` | landlord | eKYC **PENDING** (sits in admin queue) |
| `admin@example.com` | admin | **super-admin** — all 13 capabilities |
| `kyc@example.com` | admin | **kyc-reviewer** — eKYC queue only |
| `support@example.com` | admin | **customer-support** — tickets only |
| `readonly@example.com` | admin | **read-only** — no capabilities (use to test the gate) |

> Admin sub-roles are restored per `conflicts.md` **B2-R** and have no ERD
> entity or backend — see `ASSUMPTIONS.md` #26 before building on them.

Seeded moderation queue: `prop_5` (PENDING), `landlord2` eKYC (PENDING),
`req_2` (PENDING), `rev_2` (PENDING).

Verify with **`npm run verify`** (typecheck → lint → tests → build). The same
four run in CI (`.github/workflows/ci.yml`) on every PR, as parallel jobs so one
failure doesn't mask the others.

Note `npm run lint` is `eslint --max-warnings=0`: an unused import is what hid
the `p: any` in `SendOfferSheet`, so warnings fail the build. CI pins Node 22 —
deliberately *below* the 24 used locally, so accidental use of newer-Node APIs
fails in CI rather than in production.

**The user asked NOT to use the Claude Browser pane for testing right now** —
verify via tsc/eslint/jest/build and Node/API-level checks instead.

## 9. Recommended next step

**The frontend is complete.** Every buildable PRO ticket is done. What's left is
not more building:

1. **Unblock the backend contracts — highest priority, not a coding task.**
   Three things this repo invented need the backend team to accept or reject:
   - The **restored admin surfaces** (`ASSUMPTIONS.md` #26) — no ERD entity, no
     PRO ticket, no backend. They will 404 in production.
   - The **socket handshake** (`ASSUMPTIONS.md` #28) — the gateway must
     authenticate by httpOnly cookie, because this app never exposes the JWT to
     client JS. Realtime won't connect otherwise.
   - The **SSE framing + gate-before-token rule** for PRO-10/17 (`mvp.md`).
2. **Deploy + E2E (PRO-19)** — needs a Vercel project and credentials.
3. **PRO-15 backend PDF** — backend-owned.

Work lives on the **`ali-dev`** branch (not `main`, not `dev`). Note `origin/dev`
has moved ahead and the team built *inline* request/review moderation that
collides with this branch's dedicated moderation pages — `AdminDashboard.tsx`
and `useAdmin.ts` conflict and need a human decision, not an auto-merge.

## 10. Working agreement

- **Never invent business logic.** If a rule is unspecified, ask, or implement a
  clearly-flagged minimal default and log it in `ASSUMPTIONS.md`.
- Definition of done per feature: typed & `no-any`, lints clean, RTL-correct +
  Figma-faithful, all four UI states (happy/loading/empty/error),
  permission-checked, tested, documented.
- Small commits. Keep `ASSUMPTIONS.md` + `conflicts.md` current.
- Recent commits also come from the team's own Codex sessions (merged PRs) —
  always `git log`/`git status` before assuming tree state.
