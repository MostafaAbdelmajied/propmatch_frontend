# Frontend Customer Support Feature (`src/features/support`)

This feature implements the **User Support Widget**, **Admin Support Inbox**, and **Real-Time Ticket Management UI** for PropMatch.

---

## 📁 Directory Structure

``` txt
src/features/
├── admin/
│   ├── components/
│   │   ├── AdminTickets.tsx         # Admin support queue view (/admin/support)
│   │   └── AdminTicketDetail.tsx     # Admin ticket thread & internal notes view (/admin/support/[id])
│   └── hooks/
│       └── useTickets.ts            # TanStack Query hooks for tickets, replies, and status updates
└── support/
    └── README.md                    # This documentation file
```

---

## 🎨 Components & UI Workflow

### 1. Admin Ticket List (`AdminTickets.tsx`)

- Displays real-time ticketing inbox for admins at `/admin/support`.
- Categorized by status badges:
  - `new` (جديد) — Blue
  - `assigned` (معيّن) — Purple
  - `in_progress` (قيد المعالجة) — Yellow
  - `waiting` (بانتظار العميل) — Gray
  - `closed` (مغلق) — Green

### 2. Admin Ticket Detail & Reply Thread (`AdminTicketDetail.tsx`)

- Renders full message thread including customer, AI assistant, and admin messages.
- Supports **Internal Team Notes** (`internal: true`):
  - Highlighted with a yellow border and badge.
  - Visible only to admins, hidden from customer view.
- Admin Quick Actions:
  - **"تعيين لي" (Assign to me)**: Self-assign ticket to current admin.
  - **Status Dropdown**: Toggle ticket state (`in_progress`, `closed`, etc.).

---

## 🔌 API Contracts & Hooks (`useTickets.ts`)

Contracts defined in [src/lib/api/contracts/support.ts](file:///home/waleed/projects/propmatch/propmatch_frontend/src/lib/api/contracts/support.ts):

- `useTickets()`: Queries `GET /api/backend/admin/tickets` with 5s polling fallback.
- `useTicket(id)`: Queries `GET /api/backend/admin/tickets/:id`.
- `useTicketActions(id)`: Exposes mutations:
  - `reply.mutate({ content, internal })`: Posts a message or internal note.
  - `assign.mutate()`: Self-assigns the ticket.
  - `setStatus.mutate(status)`: Updates ticket status.

---

## 🚀 How to Use in App Router

1. **Admin Support Inbox Page** (`app/(admin)/admin/support/page.tsx`):

   ```tsx
   import { AdminTickets } from "@/src/features/admin/components/AdminTickets";

   export default function SupportPage() {
     return <AdminTickets />;
   }
   ```

2. **Admin Ticket Detail Page** (`app/(admin)/admin/support/[id]/page.tsx`):

   ```tsx
   import { AdminTicketDetail } from "@/src/features/admin/components/AdminTicketDetail";

   export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     return <AdminTicketDetail id={id} />;
   }
   ```
