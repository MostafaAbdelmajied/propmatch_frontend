# Optional services / Partner Leads integration

The authenticated saved-contract detail page displays an optional-services section for `tenant` and `landlord` accounts. Admins do not see consumer request actions.

The section offers moving (`MOVING`) and rental insurance (`INSURANCE`). Selecting a card opens a fresh confirmation dialog; its unchecked consent checkbox must be selected before submitting. The UI explains that the request is stored in PropMatch AI for Admin review and no data is automatically shared with an external company.

The browser calls the existing generic BFF with `POST /api/backend/partner-leads`, which forwards to `POST /api/partner-leads`. The exact request body is `{ "serviceType": "MOVING" | "INSURANCE", "consent": true }`. It intentionally contains no user, contract, property, contact, KYC, National ID, signature, status, or partner fields.

Each service has independent loading and current-page requested state. Success closes the dialog and marks only that card requested. A `409 PARTNER_LEAD_ALREADY_PENDING` is presented as an existing request and marks that card requested. The requested state is not persisted across refreshes because the backend has no safe user lead-list endpoint; backend duplicate protection remains authoritative.

There are no external partner calls, redirects, brokers, payments, subscriptions, ads, named partner promises, contract/property context, or contract-state mutations.
