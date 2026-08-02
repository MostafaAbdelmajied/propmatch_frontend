# Source-document conflicts & resolutions

Every conflict between the ranked sources, plus its V1 resolution. Ranking:
**1) Final ERD · 2) SRS (Final) · 3) Sprint Plan (Final) · 4) Full Features ·
5) Figma · 6) build prompt.** Higher wins. Confirm anything marked
**[CONFIRM]** with the team/backend.

## A. Conflicts resolved by the build prompt (locked — do not re-litigate)

| # | Conflict | Sources | V1 resolution |
|---|---|---|---|
| A1 | **Account model.** Full-Features §2.1 describes a unified multi-role account with in-account role switching. ERD models `USER.role` as a single enum. | ERD vs Full-Features | **ERD wins: separate account per role.** A person who is both owner and tenant creates two accounts, each with its own eKYC. No role switching in V1. |
| A2 | **Broker role.** Full-Features describes a broker (وسيط عقاري). ERD enum = `TENANT, LANDLORD, ADMIN`. | ERD vs Full-Features | **V1 = 3 roles.** Broker is *Later*, but RBAC is capability-based so `BROKER` can be added without rework (no role-name hardcoding). |
| A3 | **Scope.** Full-Features describes far more than the 3-week backlog. | Sprint Plan vs Full-Features | **Build to PRO-01…19 only.** Messaging, viewings/appointments, deal lifecycle, mutual reputation, deal evidence, broker teams, advanced analytics, subscriptions, extra partner services = *Later*. |
| A4 | **Reviews.** ERD models one-way `PROPERTY_REVIEW` (tenant → property). Full-Features describes mutual tenant↔owner reputation. | ERD vs Full-Features | **ERD wins: one-way, admin-moderated review.** Mutual reputation = *Later*. |
| A5 | **eKYC statuses.** ERD = `PENDING, APPROVED, REJECTED`. Full-Features adds `NOT_SUBMITTED`, `RESUBMISSION_REQUIRED`. | ERD vs Full-Features | Use all five as **UI/domain** states; only three are assumed persisted. `NOT_SUBMITTED` = no row; `RESUBMISSION_REQUIRED` = derived from `REJECTED` + `rejection_reason`. **[CONFIRM with backend]** whether it persists five. |
| A6 | **Property types.** ERD enum = `APARTMENT, VILLA, STUDIO`. The older Figma brief listed 7 (شقة/دوبلكس/فيلا/ستوديو/غرفة/محل/مكتب). | ERD vs old Figma brief | **ERD wins: 3 types.** |
| A7 | **Offer/match/request statuses.** Full-Features narrates a richer deal lifecycle (Shortlisted → Contact Accepted → Viewing → Completed). | ERD vs Full-Features | **ERD verbatim:** `OWNER_OFFER = SENT/VIEWED/ACCEPTED/REJECTED`; `MATCH_CONNECTION = INTERESTED/CONNECTED/REJECTED`; `TENANT_REQUEST = PENDING/APPROVED/REJECTED/FULFILLED/CLOSED`. Richer lifecycle = *Later*. |
| A8 | **Messaging & viewings.** Full-Features describes in-platform chat + appointments. Neither is in the ERD nor the backlog. | ERD/Sprint vs Full-Features | **Not in V1.** Contact = phone reveal after offer acceptance. |

## B. Decisions taken this session (with the team)

| # | Decision | Rationale |
|---|---|---|
| B1 | **Repo stays a single Next.js app** (contracts at `src/lib/api/contracts`), *not* the monorepo (`apps/web` + `packages/contracts`) the prompt specifies. | No second package exists yet (the NestJS backend is a separate repo). Migration cost buys nothing today; extraction is mechanical later. **Deviation from build prompt §3/§13 — logged deliberately.** |
| B2 | ~~**Deleted the modules that exist in neither the ERD nor PRO-01…19**: customer-support tickets + AI support chat, admin team/RBAC management UI, audit log, login history.~~ **REVERSED — see B2-R.** | They were built against a previous, superseded prompt. They have no ERD entity and no backend counterpart. Recoverable from git history (see commit `90c1501`). |
| **B2-R** | **Restored** the admin team/RBAC UI, audit log + login history, and support ticketing (from `90c1501`), on the product owner's explicit instruction. Scoped admin sub-roles come back with them, **reversing ASSUMPTIONS #19** (flat ADMIN). | The owner wants these surfaces in the product. **The B2 rationale still stands and is now a live risk, not a hypothetical:** none of this exists in the Final ERD or PRO-01…19, so the NestJS team is not building it. Everything here talks to mock endpoints this repo invented (`ASSUMPTIONS.md` #26) and will 404 against the real backend until the backend team agrees to the contracts in `contracts/admin.ts` + `contracts/support.ts`. **This needs to reach the backend team as a scope change, not a bug report.** |
| B3 | **eKYC rewritten to the ERD.** | The previous session built a document model (`license`/`government_id`/`proof_of_address` + a 24h resubmit cooldown + listing-intent gate) per an earlier prompt. The ERD's `IDENTITY_VERIFICATION` (national_id, front/back, selfie; `PENDING/APPROVED/REJECTED`; `rejection_reason`; `reviewed_by`) is source-of-truth #1 and overrules it. |

### B2-R details — what came back, and what deliberately did not

| Restored | Adapted on the way back in |
|---|---|
| Admin team/RBAC UI (`/admin/team`) + 7 sub-roles | Old capability names remapped to the current ERD-aligned set (`listing:approve` → `property:approve`, `review:delete` → `review:moderate`). Every admin endpoint is now capability-gated, not merely `role === "admin"`. An admin cannot edit their own privileges (lock-out guard). |
| Audit log + login history (`/admin/activity`) | Now fed by real actions: every moderation decision and team change appends via `audit()`, and admin logins (including **failed** ones) append to login history. Append-only — there is deliberately no write/delete route. Mock IP is synthetic; the real backend must record the true client IP. |
| Support ticketing (`/admin/support`) | Admin side only — there is no customer-facing thread UI, so `SupportThread`/`SupportSendRequest` were **not** restored. No notification on reply either: `NOTIFICATION.type` is a verbatim ERD enum with no ticket member, and inventing one would diverge from source-of-truth #1. |

**Deliberately NOT restored: the `pii:reveal` capability.** The pre-deletion
`customer-support` role carried it. Contact reveal is a *per-connection*
relationship gate (ACCEPTED offer / CONNECTED match) enforced by the backend
omitting the fields — `ASSUMPTIONS.md` #8, `rbac.md`. Re-adding it as a
capability would let a support admin unmask any owner's phone by role alone,
which is precisely what the gate exists to prevent, and would break the
guarantee `src/mocks/__tests__/reverseMarketplace.test.ts` pins. If support
staff genuinely need contact data for their job, that needs its own decision
and its own audit trail — not a silent capability grant.

### B3 details — what changed vs. what was built

| Previous build (superseded) | ERD (authoritative) |
|---|---|
| Documents: `license`, `government_id`, `proof_of_address` | `national_id` + `national_id_front_url` + `national_id_back_url` + `selfie_url` |
| Statuses: `unverified / pending_review / verified / rejected` | `PENDING / APPROVED / REJECTED` (+2 derived UI states, A5) |
| 24h resubmit cooldown after rejection | **Not in the ERD.** Dropped unless the backend implements it. **[CONFIRM]** |
| Verification required ≥1 listing draft (`LISTING_INTENT_REQUIRED`) | **Not in the ERD.** Replaced by *progressive verification* (SRS 3.1/3.4): unverified users may browse/draft; verification is required before publishing a listing/request, accepting an offer, or revealing contact. |
| Listing gate = `verificationStatus` on the user | Gate = eKYC `APPROVED` **+** `PROPERTY.status` moderation lifecycle |

## C. Code-vs-ERD divergence to be corrected (Phase 2)

The existing frontend was built against a superseded prompt. Infrastructure
(design system, BFF, mock server, i18n, testing) is reusable; the **domain
layer is not**.

| Area | Current code | ERD requires |
|---|---|---|
| `PROPERTY` | `neighborhood`, `deposit`, `leaseDurationMonths`, `floor`, `finish`, `orientation`, `amenities[]`, `conditions{}`, `photos[]` | `governorate`, `city`, `district`, `manual_address` (masked), `property_around_services`, `rent_amount`, `area_m2`, `bedrooms`, `bathrooms`, `is_furnished`, `has_elevator`, `has_parking`, `contact_revealed`, `is_boosted`, `approved_by/at`, status **+ `ARCHIVED`**; images in `PROPERTY_IMAGE` |
| Contact reveal | Ad-hoc "inquiry" request→accept | `OWNER_OFFER` ACCEPTED → `MATCH_CONNECTION` CONNECTED → reveal |
| Quotas | `matchUsed/matchLimit/optimizerUsed/optimizerLimit/freeListingUsed` | `USER_QUOTA`: `free_listings_left` (1), `optimizer_uses_left` (2), `free_offers_left` (3), `last_reset_date` |
| Payment types | `listing / boost / matchmaker-refill` | `NEW_LISTING / BOOST_LISTING / REFILL_MATCHES / OFFER_PACK` |
| Matching intake | Bespoke "hybrid intake" form | `TENANT_REQUEST` (min/max budget, preferred_locations, property_type, required_bedrooms, needs_furnished, flexibility_score, lifestyle_requirements) |
| Missing entirely | — | `TENANT_REQUEST`, `OWNER_OFFER`, `FAVORITE`, `MATCH_CONNECTION`, `PROPERTY_REVIEW`, `PARTNER_LEAD`, `LEASE_CONTRACT` (persisted), `PAYMENT_TRANSACTION`, `NOTIFICATION` |
| Realtime | Polling | **Socket.io** (PRO-06) |
| AI | Non-streamed mock | **Streamed** (SRS §4 UX; PRO-10/17) |
| Contract | Client print-to-PDF | Backend HTML→PDF, persisted `LEASE_CONTRACT.pdf_url` (PRO-15) |

## D. Open items for the team **[CONFIRM]**

1. **NestJS OpenAPI spec** — not provided. Contracts are mirrored from the ERD
   by hand; field names assume `snake_case` → camelCase mapping at the API
   boundary. Confirm the real DTO casing/shape.
2. **eKYC persisted statuses** — three or five? (A5)
3. **Resubmit cooldown** — does the backend enforce one after `REJECTED`? (B3)
4. **Match score authority** — computed backend-side and stored on
   `MATCH_CONNECTION.match_score`; is it also returned ad-hoc for ranked search
   results that never become a connection? Is it stable for a given pair?
5. **Quota reset** — `USER_QUOTA.last_reset_date` implies periodic reset. What
   window? (Prompt §5 also mandates feature-flagged free launch.)
6. **`OWNER_OFFER.property_id` nullable "quick-add"** — what is the quick-add
   flow? Not described in the SRS/Sprint.
7. **`TENANT_REQUEST` FULFILLED/CLOSED** — who sets them, and when?
8. **Figma coverage** — the Figma has the *tenant* flow; the reverse
   marketplace (request form, offer inbox, landlord request browsing) and the
   admin dashboard need design or explicit permission to extend the system.
