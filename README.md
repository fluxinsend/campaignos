# CampaignOS

Email campaign management for outreach teams — Admin + Staff views, batch library, leads tracking, daily reports.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (email/password) |
| File storage | Supabase Storage |
| Hosting | Vercel |
| Styling | Tailwind CSS + custom CSS vars |
| Types | TypeScript |

---

## Project Structure

```
campaignos/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── login/page.tsx          # Login page
│   ├── dashboard/page.tsx      # Role-based redirect
│   ├── auth/callback/route.ts  # Supabase OAuth callback
│   ├── admin/
│   │   ├── layout.tsx          # Admin shell (sidebar + topnav)
│   │   ├── page.tsx            # Admin dashboard
│   │   ├── schedule/page.tsx   # Schedule campaigns
│   │   ├── batches/page.tsx    # ← Lists & Batches (add once, reuse)
│   │   ├── templates/page.tsx  # Email templates
│   │   ├── domains/page.tsx    # Domain management
│   │   ├── leads/page.tsx      # All leads (read-only admin view)
│   │   └── reports/page.tsx    # Activity log + past reports
│   └── staff/
│       ├── layout.tsx          # Staff shell
│       ├── page.tsx            # Staff dashboard (today's campaigns)
│       ├── domains/page.tsx    # Staff can add domains
│       └── leads/page.tsx      # Leads (date-grouped, CRM toggle)
├── components/
│   ├── admin/
│   │   ├── BatchLibrary.tsx
│   │   ├── ScheduleForm.tsx
│   │   └── ReportTable.tsx
│   ├── staff/
│   │   ├── CampaignCard.tsx
│   │   ├── TaskGrid.tsx
│   │   ├── BatchTable.tsx
│   │   ├── LeadsView.tsx
│   │   └── ReportForm.tsx
│   └── shared/
│       ├── TopNav.tsx
│       ├── DomainList.tsx
│       └── Badge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client + admin client
│   └── queries.ts              # All DB queries in one file
├── types/index.ts              # TypeScript types (mirrors DB schema)
├── middleware.ts               # Auth guard + role routing
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
└── package.json
```

---

## Setup

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Go to **SQL Editor** → paste the contents of `supabase/migrations/001_initial_schema.sql` → Run
3. Go to **Storage** → create two buckets:
   - `batch-csvs` — private
   - `avatars` — public
4. Go to **Settings → API** → copy your Project URL and anon key

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Create first admin user

1. Go to Supabase Dashboard → **Authentication → Users → Invite user**
2. After they sign up, go to **Table Editor → profiles** and set their `role` to `admin`
3. All subsequent users added by admin default to `staff` role

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add your environment variables in Vercel dashboard → Project → Settings → Environment Variables.

Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g. `https://campaignos.vercel.app`).

In Supabase → **Authentication → URL Configuration**:
- Site URL: `https://campaignos.vercel.app`
- Redirect URLs: `https://campaignos.vercel.app/auth/callback`

---

## Key Data Flow

```
Admin adds batches (once)
    → stored in `batches` table with group + CSV in Storage

Admin schedules campaign
    → creates `campaigns` row
    → creates `campaign_batches` rows (selected batches)
    → creates `campaign_tasks` rows (from task_definitions)
    → assigns to a staff member

Staff sees today's campaigns
    → fetches campaigns where assigned_to = me AND scheduled_for = today
    → checks off tasks → updates campaign_tasks
    → marks batches sent → updates campaign_batches
    → adds leads → inserts into leads
    → completes campaign → updates campaigns.status

Staff submits report
    → upserts into daily_reports
    → everything stored permanently

Admin sees everything
    → activity_log for full audit trail
    → daily_reports for historical data
    → can export JSON / CSV
```

---

## RLS Summary

| Table | Staff can | Admin can |
|---|---|---|
| batches | Read | Read + Write + Delete |
| campaigns | Read own | Read all + Write |
| campaign_tasks | Read + Update | Read + Write |
| campaign_batches | Read + Update | Read + Write |
| domains | Read + Insert + Update | + Delete |
| leads | Read + Insert + Update | + Delete |
| daily_reports | Insert + Update own | Read all |
| activity_log | Insert | Read all |
