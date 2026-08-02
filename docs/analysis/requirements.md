# Requirements analysis (V1 — dual-discovery marketplace)

Against the Final ERD + SRS (Final) + Sprint Plan (PRO-01…19). Conflicts and
their resolutions live in `conflicts.md`; assumptions in `../../ASSUMPTIONS.md`.

---

## 1. Missing / ambiguous requirements

### 1.1 Match score — computation & authorization (blocks PRO-11/13)
The ERD stores `MATCH_CONNECTION.match_score` ("Stored AI calculated score");
SRS 3.2.2 says the system "calculates a Match Score between the request and the
landlord's properties". Unspecified:
- **Formula/scale** — 0–100? 0–1? The Full-Features UI shows «٨٥٪».
- **Direction** — the same score is shown to tenants (ranked results) *and*
  landlords (match notifications). Is it symmetric?
- **Stability** — is a score reproducible for a (request, property) pair, or
  does it drift as embeddings change? Determines cacheability.
- **Authorization** — can a landlord see the score for a request they haven't
  offered on? (It leaks how well their property fits.) Assumed yes.
- **When persisted** — a `MATCH_CONNECTION` row only exists once a tenant shows
  interest, but scores are shown *before* that. **Assumption:** ranked search
  returns transient scores; only `INTERESTED`+ persists a row.
**Frontend stance:** treat scores as server-authoritative and volatile — never
recompute client-side, never cache beyond the query session.

### 1.2 PII reveal gating (safety-critical)
SRS 3.4: phone + exact address (`PROPERTY.manual_address`) stay masked "until
an Offer is accepted **or** a Match Connection is established" — two different
triggers. `PROPERTY.contact_revealed` is a **per-property boolean**, which
cannot express "revealed to tenant X but not tenant Y".
- **Conflict:** a per-property flag is wrong for a multi-tenant reveal; the
  real gate should be per-`MATCH_CONNECTION` (status `CONNECTED`).
- **Assumption:** the frontend never receives masked fields at all — the
  backend omits `phone_number`/`manual_address` until the requesting tenant has
  an accepted offer or a `CONNECTED` match. The UI shows a general area
  (governorate/city/district) pre-reveal. **[CONFIRM]** with backend.
- **Never** rely on client-side masking; never place PII in URLs, query
  strings, logs, or analytics.

### 1.3 Quota resets & the feature-flagged free launch
`USER_QUOTA.last_reset_date` implies periodic reset but no window is defined.
Prompt §5 also mandates a "Full-Free-Launch": quotas + paywalls implemented but
**behind feature flags** so core flows run free at launch.
- **Assumption:** quotas are lifetime until a Paymob top-up; `last_reset_date`
  is reserved for a future periodic reset. **[CONFIRM]**
- **Assumption:** one flag (e.g. `NEXT_PUBLIC_PAYWALLS_ENABLED`) gates paywall
  modals; the quota **chip stays visible** regardless (transparency), and the
  server remains the entitlement authority in both modes.

### 1.4 Progressive verification — exact gates
SRS 3.1/3.4 + prompt §8.1: unverified users may browse/draft; verification is
required before **publishing a listing**, **publishing a request**, **accepting
an offer**, or **revealing contact**. Not stated: whether an unverified landlord
may *send* an offer (assumed **no** — offers lead to contact reveal), or whether
an unverified tenant may favorite/review (assumed favorite **yes**, review
**no**, since reviews are public content).

### 1.5 `TENANT_REQUEST` lifecycle
`FULFILLED` and `CLOSED` exist in the enum but nothing sets them. **Assumption:**
`FULFILLED` = tenant accepted an offer on it; `CLOSED` = tenant manually closed.
**[CONFIRM]**

### 1.6 `OWNER_OFFER.property_id` nullable ("quick-add")
The ERD comment says nullable "if quick-add", but no doc describes a quick-add
flow. **Assumption:** V1 always requires selecting an existing approved
property; nullable is reserved. **[CONFIRM]**

### 1.7 `OWNER_OFFER.status = VIEWED`
No doc says who/when. **Assumption:** set server-side when the tenant opens the
offer detail (not on list render), so it means "tenant actually saw it".

---

## 2. Edge cases

- **Offer on a property that later gets `ARCHIVED`/`REJECTED`** — must the offer
  auto-withdraw? **Assumption:** offers referencing a non-`APPROVED` property
  are hidden from the tenant and non-acceptable; backend should enforce.
- **Tenant accepts two offers on the same request** — does the first acceptance
  close the request (`FULFILLED`) and reject the rest? **Assumption:** accepting
  one → request `FULFILLED`, sibling offers remain `SENT` but non-acceptable.
  **[CONFIRM]** — real money/quota implications for landlords.
- **Concurrent admin moderation** — two admins approving the same property/eKYC/
  request/review. Backend must compare-and-swap on `PENDING`; frontend handles
  **409** by refetching the queue + toast, never silent retry.
- **eKYC rejected → resubmit** — ERD has no cooldown and no attempt counter.
  Unbounded resubmission is a spam vector. **[CONFIRM]** (see conflicts B3/D3.)
- **Landlord deletes a property with live offers/connections** — ERD has
  `ARCHIVED` rather than delete; assume soft-archive only, never hard delete.
- **Quota exhausted mid-flow** (e.g. offer form open, `free_offers_left` hits 0
  in another tab) — server rejects with 403; UI must surface the paywall rather
  than a generic error.
- **Review on a property the tenant never connected with** — should reviews
  require a `MATCH_CONNECTION`? ERD doesn't enforce it. **Assumption:** V1
  allows any tenant to review; admin moderation is the spam control.
  **[CONFIRM]** — this is a credibility risk.
- **Paymob success but webhook delayed** — the client "success" state means
  *payment captured*, not *quota credited*. Poll the quota after success; fall
  back to "we'll update shortly".

---

## 3. Security

- **ID documents.** `national_id_front_url`/`back`/`selfie` are the most
  sensitive data in the system. Frontend obligations: never send images to any
  AI/LLM (prompt §6); never place signed URLs in logs/analytics; render only for
  admins with `kyc:review`; mask `national_id` to last 4 everywhere except the
  admin review screen and the generated contract. **Backend must log every
  access to an ID document** (who/when/why) — request an audit endpoint.
- **Prompt injection / PII redaction** (SRS §4) are backend duties, but the
  frontend must not echo unsanitised model output as HTML (render as text) and
  must not send PII into the chatbot context.
- **Tokens** in httpOnly cookies only; the BFF proxies and attaches them.
  `proxy.ts` (route gate) is UX, **not** the security boundary — NestJS
  `@Roles()` is final.
- **Paymob webhook** — HMAC validation + **idempotency** are backend-side
  (duplicate webhook deliveries must not double-credit quota). Frontend must
  never treat a client-reported payment result as authoritative.
- **Data masking** — see 1.2; enforce server-side omission, not CSS/UI hiding.
- **Reverse-marketplace PII** — approved `TENANT_REQUEST`s are published to
  *all* verified landlords. Tenant identity must be hidden (no name/phone) until
  the tenant accepts an offer. The request's free-text
  `lifestyle_requirements` may leak PII the tenant typed — consider a backend
  redaction pass. **[CONFIRM]**

---

## 4. Scalability & performance

- **ChromaDB ↔ Postgres consistency (PRO-09).** Embeddings are written on admin
  property approval. Failure modes: approval commits but embedding fails →
  property is `APPROVED` yet invisible to semantic search; property later
  `ARCHIVED`/edited → stale vector. Needs an outbox/retry + delete-on-archive.
  Postgres stays source of truth; Chroma is an assist layer. Frontend impact:
  a just-approved property may briefly miss from AI results — don't present
  semantic results as exhaustive.
- **Admin queue backpressure (PRO-06).** Socket.io pushes every new eKYC/
  property/request/review. At volume this floods the dashboard. Mitigations:
  server-side pagination, virtualized tables, coalesce bursts (batch/debounce
  incoming events), cap in-memory queue length and refetch instead of appending
  unboundedly, and reconnect with backoff + polling fallback.
- **Hybrid search (PRO-11).** SQL hard-filters first, then semantic over the
  subset (cost control). Frontend: server-side pagination, skeletons, and no
  client-side re-ranking.
- **Rendering.** RSC where sensible, code-split, TanStack Query cache + dedup,
  `next/image`, virtualized admin tables.

---

## 5. RTL / formatting

- Prices/areas/dates use **Western numerals (0–9)** — `ar-EG` `Intl` defaults to
  Eastern Arabic-Indic, so every formatter must pin
  `numberingSystem: "latn"` (centralised in `src/utils/format.ts`).
- Prices suffixed `ج.م`. `area_m2` → «م²». Directional icons mirrored for RTL.
- **Known trap:** custom `text-*` size tokens must be registered with
  tailwind-merge or they strip `text-white` (see `src/utils/cn.ts`).

---

## 6. Data-model implications for the frontend

- Mirror the ERD **exactly** in `src/lib/api/contracts` (Zod + TS). No invented
  fields, no tables for out-of-scope features.
- `PROPERTY_IMAGE` is a separate entity with `display_order` + `is_cover` — the
  UI must sort by `display_order` and pick the cover, not assume `photos[0]`.
- `USER_QUOTA` is **landlord-only** (1:1) — tenants have no quota row; the UI
  must tolerate its absence.
- `IDENTITY_VERIFICATION` is 1:1 and **may not exist** → that absence *is*
  `NOT_SUBMITTED`.
- `NOTIFICATION.type` is a fixed enum — the bell must switch on it, not on
  free-text.
