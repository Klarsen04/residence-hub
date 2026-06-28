# Residence Hub — System Architecture

## Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Framework      | Next.js 15 (App Router)           |
| Language       | TypeScript                        |
| Styling        | Tailwind CSS + shadcn/ui          |
| Database       | PostgreSQL (Neon for prod)        |
| ORM            | Prisma                            |
| Auth           | NextAuth.js v4 + Microsoft Entra  |
| Storage        | AWS S3 (presigned uploads)        |
| AI             | OpenAI API (GPT-4o)              |
| Deployment     | Vercel                            |
| Local Dev DB   | Docker (PostgreSQL 16)            |

## Directory Structure

```
residence-hub/
├── prisma/
│   └── schema.prisma
├── public/
│   └── images/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx          (sidebar + auth guard)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── events/
│   │   │   │   ├── page.tsx        (list + calendar views)
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── inspiration/
│   │   │   │   ├── page.tsx        (grid + collections)
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── decorations/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── budgets/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── vendors/
│   │   │   │   └── page.tsx
│   │   │   ├── resources/
│   │   │   │   └── page.tsx
│   │   │   ├── ai-planner/page.tsx
│   │   │   ├── collaboration/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── events/route.ts
│   │   │   ├── events/[id]/route.ts
│   │   │   ├── inspiration/route.ts
│   │   │   ├── decorations/route.ts
│   │   │   ├── budgets/route.ts
│   │   │   ├── vendors/route.ts
│   │   │   ├── resources/route.ts
│   │   │   ├── ai-planner/route.ts
│   │   │   ├── comments/route.ts
│   │   │   └── upload/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx               (redirect to /dashboard or /login)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                    (shadcn components)
│   │   ├── Sidebar.tsx
│   │   ├── EventCard.tsx
│   │   ├── InspirationGrid.tsx
│   │   ├── BudgetChart.tsx
│   │   ├── CalendarView.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── s3.ts
│   │   ├── openai.ts
│   │   ├── utils.ts
│   │   └── validations.ts
│   └── types/
│       ├── index.ts
│       └── next-auth.d.ts
├── docker-compose.yml
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## Authentication Flow

1. User clicks "Sign in with Microsoft"
2. NextAuth redirects to Microsoft Entra ID
3. User authenticates with university credentials
4. Callback creates/updates User record with role assignment
5. JWT session issued, role included in token
6. Middleware enforces auth on /(app)/* routes
7. API routes check session + role for authorization

## Data Flow

```
Browser → Next.js API Routes → Prisma → PostgreSQL
                 ↓
         OpenAI API (AI Planner)
                 ↓
         AWS S3 (file uploads)
```

## Role-Based Access

| Action               | RA | RHA | PSG | PHE | Admin |
|----------------------|----|-----|-----|-----|-------|
| Create events        | ✓  | ✓   | ✓   | ✓   | ✓     |
| Create hall events   |    | ✓   |     |     | ✓     |
| Submit budgets       | ✓  | ✓   | ✓   | ✓   | ✓     |
| Approve budgets      |    |     |     |     | ✓     |
| Approve events       |    |     |     |     | ✓     |
| Manage users         |    |     |     |     | ✓     |
| View analytics       | ✓  | ✓   | ✓   | ✓   | ✓     |
| View all-hall reports|    |     |     |     | ✓     |
| Upload inspiration   | ✓  | ✓   | ✓   | ✓   | ✓     |
| Share resources      | ✓  | ✓   | ✓   | ✓   | ✓     |

## Key Design Decisions

1. **Monorepo** — Single Next.js app handles frontend + API (like student-leadership-dashboard)
2. **Server-side data fetching** — Use React Server Components where possible, client components for interactive features
3. **Optimistic UI** — Use SWR for client-side mutations with optimistic updates
4. **File uploads** — Presigned S3 URLs for direct browser-to-S3 uploads
5. **AI** — Server-side OpenAI calls, stream responses to client
