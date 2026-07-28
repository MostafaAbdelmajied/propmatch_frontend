# V1 scope — mapped to the PRO-01…19 backlog

V1 **is** the Sprint Plan. Anything not traceable to a PRO ticket is _Later_.
Status reflects the frontend only (the backend is the team's).

Legend: ✅ done · 🔶 exists but must be reworked to the ERD · ❌ not built

## Sprint 1 — Foundation, data collection, realtime

| Ticket                                                                         | Frontend scope                                                                                                            | Status                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRO-01** Infra (NestJS/Next/Postgres/Docker)                                 | Next.js app scaffolded, Tailwind RTL+Cairo, i18n `ar-EG`, TanStack Query, BFF auth shell, mock backend, Jest+MSW          | ✅ (single app, not monorepo — `conflicts.md` B1)                                                                                                                                                       |
| **PRO-02** Role-based auth (Tenant **or** Landlord), JWT, `@Roles()`, login UI | Role-scoped signup/login, httpOnly cookies via BFF, route guards, role landing                                            | 🔶 signup/login exist; separate-account model now correct; needs contract alignment                                                                                                                     |
| **PRO-03** Manual eKYC (National ID + Selfie → S3, status `PENDING`)           | Upload wizard (ID front/back → selfie), submit → PENDING, statuses, resubmit on reject                                    | 🔶 **rewrite to ERD** (currently license/proof-of-address + cooldown — `conflicts.md` B3)                                                                                                               |
| **PRO-04** Property listing form + CRUD, defaults `PENDING`                    | Multi-step form + multi-image upload, status chips                                                                        | 🔶 **rewrite fields to ERD** (governorate/city/district/manual_address/property_around_services/has_parking; 3 types; `PROPERTY_IMAGE`)                                                                 |
| **PRO-05** Tenant request form, defaults `PENDING`                             | Request form (budget range, locations, type, bedrooms, furnished, flexibility_score, lifestyle_requirements) + draft save | ✅ form + `/tenant/requests` list (close, offer count, reject reason). **Draft save not built** — requests go straight to PENDING                                                                       |
| **PRO-06** Live admin notifications (Socket.io toasts)                         | Socket.io client, live toasts for new eKYC/property/request                                                               | ✅ gateway on the mock (cookie-auth handshake, `user:<id>` + `admins` rooms); client pushes into the query cache; polls only while disconnected. **Backend must match the handshake — ASSUMPTIONS #28** |
| **PRO-07** Protected admin dashboard + pending tables                          | Protected routes, queues fetching PENDING entities                                                                        | ✅ all 4 queues, each capability-gated                                                                                                                                                                  |

## Sprint 2 — Moderation, vector DB, AI core

| Ticket                                                                                         | Frontend scope                                                                                           | Status                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRO-08** Admin approve/reject (eKYC, properties, reviews, requests)                          | 4 moderation flows, reject-with-reason, rejected users prompted to re-upload, 409 handling               | ✅ all 4 via shared `ModerationBar`; reject demands a reason; 409 handled                                                                                                                     |
| **PRO-09** Vector DB pipeline (embeddings on approval)                                         | _Backend-owned._ Frontend: don't present semantic results as exhaustive                                  | n/a (backend)                                                                                                                                                                                 |
| **PRO-10** AI Form Optimizer (before/after, quota)                                             | «تحسين الوصف» button, before/after, `optimizer_uses_left` counter, **streamed**                          | ✅ streams into the field via SSE + **undo** to restore the landlord's own text (their draft is otherwise overwritten in place)                                                               |
| **PRO-11** Hybrid search (SQL filters + semantic → match score)                                | _Backend-owned._ Frontend: filters UI + ranked results + score rings                                     | ✅ `SearchFilters` (city/type/rent/bedrooms/furnished) + free-text `q`; ranking left server-side                                                                                              |
| **PRO-12** Reverse-marketplace API (offer → tenant request)                                    | _Backend-owned._                                                                                         | n/a (backend)                                                                                                                                                                                 |
| **PRO-13** Matchmaker & Offers UI (tenant results, landlord request browsing, Send Offer form) | Landlord browses approved requests w/ match score; Send Offer (property + pitch + price); tenant results | ✅ `/landlord/requests` (scored, verification-gated), Send Offer sheet (3 Free Owner direct offers, then Premium Owner), `/landlord/offers`, tenant inbox `/tenant/offers` w/ accept → reveal |

## Sprint 3 — Monetization, B2B, chatbot, launch

| Ticket | Frontend scope | Status |
|---|---|---|
| **PRO-14** Paymob iframe + webhook-driven quota | Payment sheet, 4 `payment_type`s, post-success quota poll | 🔶 sheet + all 4 `payment_type`s + quota poll done. **No real Paymob**: `iframeUrl` is null and the card form is a mock — no money can move. Needs the real iframe + Paymob credentials |
| **PRO-15** Contract generator → PDF (merges eKYC data) | Form → HTML→PDF, auto-fill verified names/national IDs (with consent), download | 🔶 exists client-side; move to backend PDF + persist `LEASE_CONTRACT` |
| **PRO-16** B2B lead gen (Moving/Insurance opt-in after acceptance) | Opt-in UI post-acceptance → `PARTNER_LEAD` | ✅ opt-in sheet fires on accept; explicit, nothing pre-ticked |
| **PRO-17** Legal chatbot (RAG, off-topic decline) | Chat UI, **streamed**, graceful decline, `transfer_to_human_support` | ✅ streams token-by-token via SSE; decline flagged on the terminal chunk. Real RAG endpoint is backend-owned |
| **PRO-18** Freemium enforcer (quota decrement + paywall modal at 0) | Quota chips, paywall modals, **feature-flagged** for free launch | 🔶 exists; align to `USER_QUOTA` fields |
| **PRO-19** Deploy (Vercel) + responsive + E2E | Deploy, mobile-responsive, E2E | 🔶 CI runs typecheck/lint/tests/build on every PR (`.github/workflows/ci.yml`). Deploy needs Vercel credentials; **no E2E tooling exists** |

## Also required by the ERD/SRS but not its own ticket

| Item                                                            | Where                             | Status                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FAVORITE` (tenant bookmarks)                                   | ERD; prompt §8.7                  | ✅ optimistic toggle on cards/detail + `/tenant/favorites`                                                                                                                                                                          |
| `PROPERTY_REVIEW` submit (1–5★ + comment → PENDING)             | ERD; SRS 3.7; PRO-08 moderates it | ✅ submit sheet + public list w/ average & distribution                                                                                                                                                                             |
| `MATCH_CONNECTION` + **phone reveal**                           | ERD; SRS 3.4                      | ✅ accept → CONNECTED → reveal, via `ContactRevealCard`; gate covered by `src/mocks/__tests__/reverseMarketplace.test.ts`                                                                                                           |
| `NOTIFICATION` bell w/ ERD `type` enum                          | ERD; PRO-06                       | ✅ real entity, live over socket, server-owned read state. _Was crashing:_ it read `n.kind`/`n.at`, which the API never sends → undefined icon → "Element type is invalid" took down the whole nav for any user with a notification |
| Admin **Payment Records** + **Partner Lead Records** (Recharts) | prompt §8.13                      | 🔶 stats page exists; repoint to real entities                                                                                                                                                                                      |

## Build order (recommended)

1. ~~**Phase 2** — delete out-of-scope code; rewrite contracts to the ERD;
   rebuild the mock backend.~~ ✅ done.
2. ~~**Vertical slice: reverse marketplace** (PRO-05 → 13 → 16)~~ ✅ done —
   exercises quota + PII gate together.
3. ~~4 moderation queues (PRO-08 remainder)~~ ✅ done — all four clear.
4. ~~Favorites · reviews submit · PRO-11 filters~~ ✅ done.
5. ~~Socket.io (PRO-06)~~ ✅ done — Sprint 1 fully closed.
6. ~~Streamed AI (PRO-10/17)~~ ✅ done.

**The feature backlog is empty. These are not features, and they matter more:**

7. ~~CI~~ ✅ done — every PR now runs typecheck/lint/tests/build.
8. **The paywall flag doesn't exist** (`ASSUMPTIONS.md` #10) — paywalls are
   hard-on. A launch blocker if the free launch is real.
9. **Test the UI, not the mock.** 9 of 10 feature modules have zero tests, and
   most of the suite tests `src/mocks` — the code that gets *deleted* when the
   real backend lands. The notification-bell crash survived every green run
   until a test first rendered it.
10. **Get the invented contracts accepted or rejected** — the restored admin
    surfaces (#26), the socket handshake (#28), the SSE framing, and
    per-property match scores. Not a coding task; the highest risk in the repo.
11. **No real Paymob** (PRO-14) and **no real AI** — both are mocks.
12. Backend PDF + `LEASE_CONTRACT` (PRO-15), vector pipeline (PRO-09) — *backend.*
13. E2E + deploy (PRO-19) — no E2E tooling installed; deploy needs Vercel creds.

### Streaming contract the backend must serve (PRO-10/17)

| Route                                                       | Transport                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `POST /legal-chat/stream`                                   | SSE `data: {"type":"token","value":"…"}` frames, ending `{"type":"done","id","declined"}` |
| `POST /landlord/properties/:id/optimize-description/stream` | same framing                                                                              |

**Gates must be evaluated before the first token.** Once SSE opens, the status
is 200 and the client can no longer show a paywall — so a quota-exhausted
optimizer must return an ordinary JSON 403 (`QUOTA_EXHAUSTED`), exactly as the
buffered endpoint does. The buffered routes remain for non-streaming consumers.

## Out-of-backlog surfaces (restored — conflicts.md B2-R)

| Surface                                       | Status                        | Risk                                                          |
| --------------------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| Admin team/RBAC + 7 sub-roles (`/admin/team`) | ✅ built                      | **No ERD entity, no PRO ticket, no backend.** ASSUMPTIONS #26 |
| Audit log + login history (`/admin/activity`) | ✅ built, fed by real actions | same                                                          |
| Support ticketing (`/admin/support`)          | ✅ admin side only            | same; no customer half (ASSUMPTIONS #27)                      |

## Explicitly _Later_ (documented, not built)

In-platform messaging · viewings/appointments · deal-completion lifecycle
(Shortlisted→Viewing→Completed) · mutual tenant↔owner reputation · deal-evidence
/ move-in record · **BROKER** role + broker teams · advanced analytics ·
premium subscriptions · extra partner services · admin sub-roles & audit UI ·
customer-support ticketing. See `conflicts.md` A2/A3/A4/A7/A8 + B2.
