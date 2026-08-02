# `matching` — the reverse marketplace (PRO-05 / 12 / 13 / 16)

The differentiator: instead of only browsing listings, a tenant posts what they
want and verified landlords come to them.

```
tenant posts TENANT_REQUEST   → PENDING
admin approves (anti-spam)    → APPROVED, published to verified landlords
landlord browses w/ score     → sends OWNER_OFFER (property + pitch + price)
tenant accepts                → MATCH_CONNECTION CONNECTED + phone reveal
                              → B2B PARTNER_LEAD opt-in
```

## Surfaces

| Route | Component | Ticket |
|---|---|---|
| `/tenant/requests` | `TenantRequestList` | PRO-05 |
| `/tenant/requests/new` | `TenantRequestForm` | PRO-05 |
| `/tenant/offers` | `TenantOfferInbox` → `ContactRevealCard`, `PartnerOptInSheet` | PRO-13 / 16 |
| `/landlord/requests` | `LandlordRequestBrowse` → `SendOfferSheet` | PRO-13 |
| `/landlord/offers` | `LandlordSentOffers` | PRO-12 |

## The three rules this module must not break

1. **PII reveal is by omission, never by hiding.** `ContactRevealCard` renders
   only what the server actually sent. A landlord browsing requests never
   receives the tenant's identity; a tenant never receives the owner's phone
   until their own offer is ACCEPTED. The gate is **per-connection** — see
   `src/mocks/__tests__/reverseMarketplace.test.ts`, which fails if the mock
   backend's `contactUnlocked` is loosened.
2. **A verified badge always ships with `<OwnershipDisclaimer />`** — eKYC
   verifies identity, never ownership.
3. **The server owns entitlements.** The client never pre-checks quota or
   verification; it reacts to `VERIFICATION_REQUIRED` (→ `/verify`) and
   `QUOTA_EXHAUSTED` (→ `PaymentSheet` for the returned `paymentType`) via
   `src/lib/api/actionError.ts`. Quota chips mirror, they don't decide.

## Known gaps

- No draft-save on the request form — the ERD has no `DRAFT` status
  (`ASSUMPTIONS.md` #23).
- Offer/request lists poll rather than stream; PRO-06 (Socket.io) replaces this.
- Requests and reviews have no admin moderation UI yet, so an approved request
  only appears if seeded or approved through the mock API directly (PRO-08).
