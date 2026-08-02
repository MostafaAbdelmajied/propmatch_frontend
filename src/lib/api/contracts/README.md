Typed DTOs + Zod schemas mirroring the **Final ERD** and the NestJS backend.

One file per bounded context. ERD entity → file:

| ERD entity | File |
|---|---|
| `USER` | `auth.ts` |
| `IDENTITY_VERIFICATION` | `verification.ts` |
| `PROPERTY`, `PROPERTY_IMAGE` | `property.ts` |
| `TENANT_REQUEST` | `tenantRequest.ts` |
| `OWNER_OFFER` | `offer.ts` |
| `MATCH_CONNECTION`, `FAVORITE` | `match.ts` |
| `PROPERTY_REVIEW` | `review.ts` |
| `PAYMENT_TRANSACTION`, `USER_QUOTA` | `payment.ts` |
| `LEASE_CONTRACT` | `contract.ts` |
| `PARTNER_LEAD` | `partnerLead.ts` |
| `NOTIFICATION` | `notification.ts` |
| — (admin moderation surface) | `admin.ts` |
| — (legal chatbot, PRO-17) | `support.ts` |
| shared errors/enums/capabilities | `common.ts` |

Rules:

- **The ERD is source of truth.** Mirror it exactly — no invented fields, and
  **never** add entities for out-of-scope/Later features (messaging, viewings,
  tickets, admin sub-roles, broker). See `docs/analysis/conflicts.md`.
- ERD fields are `snake_case`; these contracts are camelCase and assume the API
  boundary maps them (ASSUMPTIONS.md #2). Reconcile against the real NestJS
  OpenAPI spec when it lands.
- **Masked fields** (`manualAddress`, owner phone) are nullable here because
  the backend *omits* them until the viewer's connection unlocks contact. The
  client never hides PII it already holds — see `docs/analysis/rbac.md`.
- Every endpoint the app calls must have a matching handler in
  `src/mocks/router.ts` so frontend work and tests never block on the backend.
- `tenantRequest.ts` also defines the optional, non-persistent extraction DTOs
  used through `/api/backend/tenant/requests/extract`; only the normal tenant
  request create contract saves data.
