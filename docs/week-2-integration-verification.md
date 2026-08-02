# Week 2 frontend integration setup

Copy `.env.example` to `.env.local` with only browser-safe values. `NESTJS_API_URL` points the existing generic BFF to the backend; `NEXT_PUBLIC_SOCKET_URL` is optional and contains no secret. Do not add database, JWT-signing, AI, embedding, Chroma, or partner credentials to the frontend.

Use `npm run dev` for the frontend. The semantic-search and tenant-request assistant calls go through `/api/backend`; extraction provides suggestions only and the user’s edited form remains authoritative. Saved contracts are read-only for tenants, PDFs are protected downloads, and review confirmation is not a signature or legal authentication.

Optional moving and rental-insurance cards appear only for tenant and landlord users. Each request uses explicit consent and `POST /api/backend/partner-leads`; it does not include contract/property context or identity/contact data. The current-page requested state resets after refresh, and the backend duplicate rule remains authoritative. No request is automatically shared with an external provider.
