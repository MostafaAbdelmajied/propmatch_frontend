# RBAC — capability-based (V1: TENANT · LANDLORD · ADMIN)

**Roles say who you are; capabilities say what you may do; eKYC + moderation
state say whether you may do it _yet_.** Never hardcode a role name in UI or
logic — check a capability. This is what lets `BROKER` be added later without
rework (build-prompt §1.2/§10).

The NestJS backend's `@Roles()` guards are the **final authority**. Everything
here is defence-in-depth + UX.

## Roles

| Role       | Source            | Notes                                                                                                                                  |
| ---------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `TENANT`   | `USER.role` (ERD) | Free. Browses, posts requests, favorites, reviews, accepts offers.                                                                     |
| `LANDLORD` | `USER.role` (ERD) | Revenue source. Listings, offers, boosts, packs. Has `USER_QUOTA`.                                                                     |
| `ADMIN`    | `USER.role` (ERD) | Moderates eKYC / properties / requests / reviews; views payment + partner-lead records.                                                |
| `BROKER`   | **Later**         | Reserved. Would receive a capability subset (likely `listing:create`, `offer:send` on behalf of owners). Do not add to the enum in V1. |

## Capabilities

```
listing:create      listing:archive     listing:boost
request:create      request:close
offer:send          offer:accept        offer:reject
review:create
favorite:manage
contract:generate
pii:reveal          # see the gate below — not an admin power in V1
property:approve    property:reject
kyc:review
request:approve     request:reject
review:moderate
payment:view
partner_lead:view
```

## Matrix

| Capability                                                                        | TENANT                                 | LANDLORD                                              | ADMIN                 |
| --------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- | --------------------- |
| `listing:create` / `listing:archive` / `listing:boost`                            | —                                      | ✅ (eKYC `APPROVED`)                                  | —                     |
| `request:create` / `request:close`                                                | ✅ (eKYC `APPROVED` to publish)        | —                                                     | —                     |
| `offer:send`                                                                      | —                                      | ✅ (eKYC `APPROVED` + `free_offers_left` > 0 or paid) | —                     |
| `offer:accept` / `offer:reject`                                                   | ✅ (eKYC `APPROVED` to accept)         | —                                                     | —                     |
| `review:create`                                                                   | ✅ (eKYC `APPROVED`)                   | —                                                     | —                     |
| `favorite:manage`                                                                 | ✅                                     | —                                                     | —                     |
| `contract:generate`                                                               | ✅                                     | ✅                                                    | —                     |
| `pii:reveal`                                                                      | ⛔ _not a role capability_ — see below | ⛔                                                    | ⛔                    |
| `property:approve` / `property:reject`                                            | —                                      | —                                                     | ✅                    |
| `kyc:review`                                                                      | —                                      | —                                                     | ✅                    |
| `request:approve` / `request:reject`                                              | —                                      | —                                                     | ✅                    |
| `review:moderate`                                                                 | —                                      | —                                                     | ✅                    |
| `payment:view` / `partner_lead:view`                                              | —                                      | —                                                     | ✅                    |
| `report:export` · `ticket:reply` · `audit:view` · `admin:create` · `admin:manage` | —                                      | —                                                     | ✅ (super-admin only) |

**ADMIN is no longer flat.** The 7 sub-roles (super-admin / listings-manager /
kyc-reviewer / finance-admin / reviews-manager / customer-support / read-only)
were restored on the owner's instruction — `conflicts.md` B2-R. `ADMIN` is now
a _bundle selector_: `ROLE_CAPABILITIES` in `contracts/admin.ts` is the single
source of truth mapping each sub-role to its capabilities, and every admin
endpoint checks a **capability**, never `role === "admin"`.

Caveat: the ERD still has no admin-role table, so `USER.admin_role` and the
whole team/audit/ticket surface are frontend-invented (`ASSUMPTIONS.md` #26).

Two rules this must keep:

- **An admin cannot edit their own privileges** — otherwise a super-admin can
  demote themselves and strand the team with no one holding `admin:manage`.
- **`pii:reveal` is not a capability and must never become one.** See below.

## The PII-reveal gate (safety-critical — not a role check)

Phone + `manual_address` are **never** unlocked by a role. They unlock on a
**relationship state**:

> `OWNER_OFFER.status = ACCEPTED` (or `MATCH_CONNECTION.status = CONNECTED`)
> between _this_ tenant and _this_ property.

Rules:

- The gate is **per connection**, not per property or per role. (`PROPERTY.
contact_revealed` is a per-property boolean and cannot express this — see
  `requirements.md` §1.2.)
- Enforced by **omission**: the backend must not send the fields at all until
  the gate passes. The client never "hides" PII it already holds.
- **No role gets `pii:reveal` — the capability does not exist.** The
  pre-deletion `customer-support` sub-role carried one; it was deliberately
  left out of the B2-R restore. A support admin who can unmask any owner's
  phone by role alone defeats the entire gate. Admins reach contact only via
  `contactUnlocked`'s explicit admin branch, which is narrow and auditable.
  If support staff genuinely need it, it must require a reason + an audit
  entry per reveal — a decision to take deliberately, not a capability to
  quietly re-add.
- Pinned by `src/mocks/__tests__/reverseMarketplace.test.ts`, which fails if
  the gate is loosened.

## Enforcement layers

1. **`proxy.ts`** — coarse route-prefix gate (`/tenant`, `/landlord`, `/admin`)
   on token presence/expiry. Edge runtime can't verify the signature → **UX
   only, not security**.
2. **Server (Route Handlers / RSC)** — session from `/api/auth/me`; role +
   capability + eKYC state checked before rendering role-scoped surfaces; the
   backend's 401/403 is authoritative and must degrade safely.
3. **UI** — hide/disable what the user can't do (and explain _why_: «وثّق
   هويتك أولًا» vs «انتهت عروضك المجانية»), so no one is shown an affordance
   that will 403.

## Gate composition (the practical rule)

A landlord may publish a listing only if **all** hold:
`role === LANDLORD` **and** `capability listing:create` **and**
`eKYC === APPROVED` **and** the number of active units is below the
server-authoritative plan limit (1 for Free Owner, 5 for Premium Owner).
Model these as distinct checks with distinct messages.
