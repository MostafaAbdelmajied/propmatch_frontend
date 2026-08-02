# Feature relationships (ERD-driven)

How the V1 modules interact, which entities they share, and where to factor
shared abstractions instead of duplicating logic.

## Module → entity ownership

| Module              | Owns                                    | Reads                                                                                                           |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Auth & eKYC         | `USER`, `IDENTITY_VERIFICATION`         | —                                                                                                               |
| Properties/Listings | `PROPERTY`, `PROPERTY_IMAGE`            | `USER` (owner), `IDENTITY_VERIFICATION` (publish gate), `USER_QUOTA`                                            |
| Tenant Requests     | `TENANT_REQUEST`                        | `USER` (tenant), eKYC                                                                                           |
| Offers              | `OWNER_OFFER`                           | `TENANT_REQUEST`, `PROPERTY`, `USER_QUOTA` (`free_offers_left`)                                                 |
| Matchmaking         | `MATCH_CONNECTION` (+ transient scores) | `PROPERTY` (APPROVED only), `TENANT_REQUEST`                                                                    |
| Favorites           | `FAVORITE`                              | `PROPERTY`                                                                                                      |
| Reviews             | `PROPERTY_REVIEW`                       | `PROPERTY`, `USER` (tenant)                                                                                     |
| Payments            | `PAYMENT_TRANSACTION`                   | `USER`, `USER_QUOTA` (credited by webhook), `PROPERTY` (boost/listing target)                                   |
| Contracts           | `LEASE_CONTRACT`                        | `USER` ×2, `IDENTITY_VERIFICATION` (verified names/IDs), `PROPERTY`                                             |
| B2B Partner Leads   | `PARTNER_LEAD`                          | `USER` (tenant), triggered by offer acceptance                                                                  |
| Notifications       | `NOTIFICATION`                          | every module (event source)                                                                                     |
| Admin moderation    | — (mutates others' `status`)            | `IDENTITY_VERIFICATION`, `PROPERTY`, `TENANT_REQUEST`, `PROPERTY_REVIEW`, `PAYMENT_TRANSACTION`, `PARTNER_LEAD` |

## Shared entities (the cross-cutting ones)

- **`USER`** — read by everything. Role is a single enum (separate account per
  role, `conflicts.md` A1).
- **`IDENTITY_VERIFICATION`** — 1:1, **may be absent** (= `NOT_SUBMITTED`).
  Gates publishing a listing/request, accepting an offer, revealing contact.
  Every module that gates on it should use one shared hook, not re-derive.
- **`USER_QUOTA`** — landlord-only 1:1. Touched by Listings
  (`free_listings_left`), AI Optimizer (`optimizer_uses_left`), Offers
  (`free_offers_left`), and credited by Payments' webhook. **One `useQuota()`
  hook + one `<QuotaChip>`**, discriminated by field — not three
  implementations.
- **`PROPERTY.status`** — the single visibility gate. Only `APPROVED` is
  browsable/matchable/offerable. Also the trigger for the ChromaDB embedding
  pipeline (PRO-09).

## Cross-feature workflows

### 1. Reverse marketplace (the differentiator — end to end)

```
Tenant (eKYC APPROVED) creates TENANT_REQUEST      → status PENDING
Admin approves (anti-spam)                          → APPROVED  + NOTIFICATION(NEW_TENANT_REQUEST) to landlords
Landlord browses approved requests / is notified    → match score shown per own property
Landlord sends OWNER_OFFER (property + pitch + price)→ SENT      + decrement one of 3 Free Owner direct offers (Premium is unlimited)
Tenant opens offer                                  → VIEWED
Tenant accepts                                      → ACCEPTED   → MATCH_CONNECTION(CONNECTED) → PHONE REVEAL (both)
                                                    → TENANT_REQUEST → FULFILLED  [CONFIRM]
                                                    → B2B opt-in prompt → PARTNER_LEAD(PENDING)
```

Touches: Requests · Offers · Matchmaking · Quota · Payments · Notifications ·
Partner Leads · the PII gate. **This is the highest-risk integration in V1** —
build it as one vertical slice, not five disconnected screens.

### 2. Standard marketplace

```
Landlord (eKYC APPROVED) creates PROPERTY (+images) → PENDING (1 active Free / 5 active Premium)
Admin approves                                      → APPROVED + approved_by/at
                                                    → embedding pipeline (PRO-09) → browsable + matchable
Tenant browses/searches (SQL filters + semantic)     → ranked results w/ match score
Tenant favorites / shows interest                    → FAVORITE / MATCH_CONNECTION(INTERESTED)
```

### 3. Payment → quota

```
Landlord hits a plan/allowance wall → Paymob iframe → PAYMENT_TRANSACTION(PENDING)
webhook (HMAC + idempotent) → SUCCESS → subscription or product entitlement activated
```

Client "success" = captured, **not** credited → poll the quota (see
`requirements.md` §2).

### 4. Moderation (4 queues, one shape)

`IDENTITY_VERIFICATION` · `PROPERTY` · `TENANT_REQUEST` · `PROPERTY_REVIEW` all
follow **PENDING → APPROVED/REJECTED**, all pushed live via Socket.io, all
emit a `NOTIFICATION`, all need reject-with-reason and 409-on-double-review.

## Duplication → shared abstractions

| Repeated concern                      | Abstraction                                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 4 moderation queues (identical shape) | one `<ModerationQueue>` / `<AdminDataTable>` parameterised by columns + actions + decision mutation                         |
| 3 quota fields + paywall              | `useQuota(field)` + `<QuotaChip>` + `<PaywallSheet context>` (payment_type discriminant)                                    |
| eKYC gating in 5 places               | `useVerificationGate()` → `{ allowed, reason }` with distinct Arabic messages                                               |
| PII masking/reveal                    | `<MaskedField>` + `useConnectionState(propertyId)` — reveal is **backend omission**, the component only renders what it got |
| Status pills across 5 entities        | one `<StatusChip status>` over the ERD enums                                                                                |
| Match score display                   | one `<MatchScoreRing score>`                                                                                                |
| 4 approve/reject flows                | one `useModerationDecision(entity, id)` incl. 409 handling                                                                  |
| Arabic/EGP/date formatting            | `src/utils/format.ts` (`numberingSystem: "latn"`)                                                                           |
| Socket.io events → toasts/queues      | one `useRealtime(channel)` + `NOTIFICATION.type` switch                                                                     |

## Normalization notes

- `PROPERTY_IMAGE` is separate (order + cover) — never assume `photos[0]`.
- `MATCH_CONNECTION` carries the stored score and is the **PII gate anchor**;
  `PROPERTY.contact_revealed` is too coarse (see `requirements.md` §1.2).
- `LEASE_CONTRACT` snapshots names/IDs/rent/address at generation time — it is
  intentionally denormalised; don't re-derive from live `USER`/`PROPERTY`.
- No entity exists for messaging, viewings, tickets, or admin sub-roles — do
  **not** create them (`conflicts.md` A3/B2).
