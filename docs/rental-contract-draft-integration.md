# Rental contract draft integration

The UI uses the existing contract route (`/contracts/new?matchConnectionId=…`)
and same-origin BFF routes: `POST /api/backend/matches/:matchConnectionId/contract/draft`,
`GET /api/backend/contracts/:id`, and `GET /api/backend/contracts/:id/pdf`.

Only the landlord may save through the existing protected UI; the backend remains
authoritative. Both connected parties can read/download a saved `drafting` row.
The browser submits only rent, date-only start/end dates, and custom clauses.
Names/address are server-derived and National IDs are not displayed by the
canonical preview.

Saving and downloading are separate actions. The BFF forwards PDF bytes and
`Content-Type`, `Content-Disposition`, and `Cache-Control`; the browser turns
the protected response into a short-lived Blob download and revokes its object
URL. No public URL, signature, approval, legal authentication, or AI behavior
is added. The PDF is explicitly a review draft only.

## Review UI

`/contracts` lists only the authenticated caller's contracts through the
same-origin `GET /api/backend/contracts` BFF route. The saved detail route uses
backend-supplied permissions as UI guidance: landlords may edit pending or
requested drafts, tenants can request changes or confirm only while pending,
and confirmed drafts hide all mutation actions. Both roles retain PDF download.

The request-changes dialog sends only a trimmed `message` to
`POST /api/backend/contracts/:id/review/request-changes`. The confirmation
dialog requires an unchecked acknowledgement checkbox and sends only
`expectedRevision` to `POST /api/backend/contracts/:id/review/confirm`.
Neither flow creates signatures, approvals, legal-authentication claims, or
public PDF URLs.

The frontend does not call the legacy match-addressed `/approve` endpoint;
tenant review confirmation is performed only through the ID-addressed review
endpoint and remains a draft-review acknowledgement.
