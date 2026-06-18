<div align="center">

# CareerTrack

**The open-source job application tracker that actually gets used.**

Stop losing track of what you applied to, when you followed up, and which resume you sent.
CareerTrack replaces the spreadsheet you abandon after two weeks with a purpose-built tool
that does exactly what a solo job-seeker needs — and nothing more.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[Getting Started](#getting-started) · [Features](#features) · [Tech Stack](#tech-stack) · [Architecture](#architecture) · [Roadmap](#roadmap)

</div>

---

## The Problem

Job applicants apply to dozens of roles across **LinkedIn**, **Naukri**, **Indeed**, and company career pages, then lose track of what they applied to, when they followed up, and which resume version they sent. Generic spreadsheets get abandoned. Paid SaaS trackers are overkill for one person.

**CareerTrack** solves this with a focused, free, self-hostable tracker built for a single user — no team features, no bloat, just what you need to stay organized during a job search.

---

## Features

### v1 — Core Tracker

| Feature | Description |
|---|---|
| **Manual entry** | Paste a job description as raw text, fill in company / role / status by hand |
| **LLM-assisted extraction** | Paste a JD → auto-extract company name, role title, location, and key requirements via Groq (Llama 3.1 8B). Review and edit before saving |
| **Full CRUD** | Edit and delete any application directly from the list or detail view |
| **Status tracking** | Six statuses: `applied` · `interview` · `offer` · `rejected` · `ghosted` · `withdrawn` — with full change history |
| **Status filter + search** | Filter by status and search by company name / role title — both available from day one |
| **Follow-up reminders** | Set "remind me in N days" per application. Daily cron job checks due reminders and sends email nudges via Resend |
| **Resume versions** | Upload resume PDFs to Supabase Storage, label each version, and tag one per application |
| **CSV export** | Export your application data for backup or analysis |
| **Auth** | Email-based authentication via Supabase Auth — one user per account |

### v2 — Power Features

| Feature | Description |
|---|---|
| **Interview prep tracker** | Per-application interview rounds (Phone Screen → Technical → On-site → HR) with scheduled dates, questions asked, prep notes, post-interview notes, and 1–5 rating |
| **Offer comparison** | Side-by-side comparison table for all applications at "offer" status — salary, equity, benefits, location |
| **Tags / labels** | Custom color-coded labels (e.g. `remote`, `startup`, `FAANG`, `backend`) filterable on the dashboard alongside status |
| **Dashboard charts** | Funnel breakdown and timeline chart powered by Recharts |
| **Follow-up email templates** | Pre-written templates with `{{company}}` / `{{role}}` variables — Gentle Reminder, Post-Interview Thank You, Status Check |
| **Salary / compensation tracking** | Salary range, equity, and benefits fields on every application |
| **Cover letter tracking** | LLM-assisted cover letter generation and version storage (same pattern as resume versions), tagged per application |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend + API** | [Next.js 16](https://nextjs.org/) (App Router) | Full-stack React framework with server actions |
| **Database** | [Supabase Postgres](https://supabase.com/) | Managed Postgres with generous free tier |
| **Auth** | [Supabase Auth](https://supabase.com/auth) | Email-based authentication, bundled with DB |
| **File Storage** | [Supabase Storage](https://supabase.com/storage) | Resume PDF and cover letter storage |
| **LLM Extraction** | [Groq API](https://groq.com/) (Llama 3.1 8B) | Fast, free-tier structured extraction from job descriptions |
| **Email** | [Resend](https://resend.com/) | Transactional emails for follow-up reminders (3K/month free) |
| **Cron** | [Vercel Cron](https://vercel.com/docs/cron-jobs) | Daily reminder check trigger |
| **Hosting** | [Vercel](https://vercel.com/) | Zero-config Next.js deployment |
| **Charts** | [Recharts](https://recharts.org/) | Lightweight React charting library |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) | Accessible, customizable component primitives |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first CSS framework |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent icon set |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         VERCEL                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Next.js 16 (App Router)                   │  │
│  │                                                        │  │
│  │   ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │  │
│  │   │  Auth     │  │ Dashboard │  │  API Routes       │   │  │
│  │   │  Pages    │  │  + CRUD   │  │  /api/extract     │   │  │
│  │   │          │  │  Pages    │  │  /api/cron        │   │  │
│  │   └──────────┘  └──────────┘  └───────────────────┘   │  │
│  │                                                        │  │
│  │   proxy.ts (auth guard — replaces middleware in v16)   │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                               │
│         Vercel Cron ─────────┘ (daily @ 1am UTC)             │
└──────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
   │   Supabase    │    │    Groq      │    │   Resend     │
   │   Postgres    │    │    API       │    │   Email      │
   │   + Auth      │    │  (LLM)      │    │   Service    │
   │   + Storage   │    │              │    │              │
   └──────────────┘    └──────────────┘    └──────────────┘
```

### Key Architecture Decisions

- **Next.js 16**: Uses `proxy.ts` instead of `middleware.ts`, fully async `params`/`cookies()`/`headers()`, opt-in caching via `"use cache"` directive, Turbopack as default bundler
- **Row-Level Security (RLS)**: Every table except `extraction_cache` enforces `user_id = auth.uid()` at the database level — data isolation is not optional
- **Cascade Deletes**: Deleting an application automatically cleans up `follow_ups`, `status_history`, `interview_rounds`, and `application_tags` via `ON DELETE CASCADE`. Resumes and cover letters are preserved for reuse
- **Extraction Cache**: JD text is SHA-256 hashed and cached to avoid redundant LLM calls

---

## Data Model

CareerTrack uses **8 tables** in Supabase Postgres:

| Table | Purpose |
|---|---|
| `applications` | Core table — one row per job application |
| `status_history` | Append-only log of every status change |
| `follow_ups` | Follow-up reminders per application |
| `resume_versions` | Uploaded resume PDFs with labels |
| `cover_letter_versions` | (v2) Cover letter text and PDFs |
| `interview_rounds` | (v2) Per-application interview round tracking |
| `tags` | (v2) Custom color-coded labels |
| `application_tags` | (v2) Junction table linking tags to applications |
| `extraction_cache` | SHA-256 hashed JD → cached LLM extraction |

### Status Values

| Status | Meaning |
|---|---|
| `applied` | Application submitted |
| `interview` | In interview process |
| `offer` | Received an offer |
| `rejected` | Application rejected |
| `ghosted` | No response after follow-up |
| `withdrawn` | You withdrew the application |

### Application Sources

`LinkedIn` · `Naukri` · `Indeed` · `Company site` · `Referral` · `Other`

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18.17 or later
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- A [Supabase](https://supabase.com/) project (free tier works)
- A [Groq](https://console.groq.com/) API key (free tier)
- A [Resend](https://resend.com/) API key (free tier — 3,000 emails/month)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/careertrack.git
cd careertrack
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

| Variable | Where to Get It |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (keep secret!) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com/) → API Keys |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `CRON_SECRET` | Generate any strong random string; set it in Vercel Environment Variables |

### 4. Set Up the Database

Run the SQL schema in your Supabase SQL Editor:

1. Go to your Supabase project → **SQL Editor**
2. Paste and execute the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. For v2 features, also run [`supabase/migration-v2.sql`](supabase/migration-v2.sql)

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
careertrack/
├── app/
│   ├── (auth)/                     # Auth route group (login, signup)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx                # Main list view — status filter + search
│   │   ├── _components/            # Route-specific components
│   │   │   ├── application-card.tsx
│   │   │   ├── application-form.tsx
│   │   │   ├── follow-up-form.tsx
│   │   │   ├── resume-upload-form.tsx
│   │   │   ├── search-bar.tsx
│   │   │   └── status-filter.tsx
│   │   ├── applications/
│   │   │   ├── new/page.tsx        # Create new application
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Application detail view
│   │   │       └── edit/page.tsx   # Edit application
│   │   ├── offers/page.tsx         # v2: Offer comparison table
│   │   └── resumes/page.tsx        # Resume version management
│   ├── api/
│   │   ├── extract/route.ts        # Groq LLM extraction endpoint
│   │   ├── generate-cover-letter/  # v2: LLM cover letter generation
│   │   └── cron/reminders/route.ts # Daily follow-up reminder cron
│   ├── layout.tsx                  # Root layout
│   ├── proxy.ts                    # Next.js 16 auth guard (replaces middleware)
│   └── globals.css
├── components/
│   ├── ui/                         # shadcn/ui primitives
│   └── shared/                     # Navbar, footer, layout chrome
├── hooks/
│   └── use-applications.ts         # Application data hook
├── lib/
│   ├── supabase/                   # Supabase client utilities
│   ├── groq.ts                     # Groq API client
│   ├── csv.ts                      # CSV export utility
│   ├── follow-up-templates.ts      # v2: Email template constants
│   └── utils.ts                    # Shared utilities
├── types/
│   ├── application.ts              # Application types
│   ├── status.ts                   # Status type definitions
│   └── interview.ts                # v2: Interview round types
├── supabase/
│   ├── schema.sql                  # v1 database schema + RLS policies
│   └── migration-v2.sql            # v2 schema additions
└── public/                         # Static assets
```

### Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Files & folders | `kebab-case` | `application-card.tsx` |
| Components & types | `PascalCase` | `ApplicationCard`, `ApplicationStatus` |
| Variables & functions | `camelCase` | `applicationList`, `getFollowUpsDue()` |
| Constants & env vars | `SCREAMING_SNAKE_CASE` | `CRON_SECRET`, `MAX_RESUME_SIZE_MB` |
| Database tables/columns | `snake_case` | `company_name`, `applied_date` |
| Booleans | Yes/no question | `isLoading`, `hasFollowUp`, `completed` |

---

## Roadmap

### v1 — Core Tracker

- [x] Supabase schema + RLS policies + email auth
- [x] Manual application CRUD (create, edit, delete)
- [x] Groq LLM-assisted extraction from pasted job descriptions
- [x] Resume upload + version management
- [x] Status history tracking (append-only log)
- [x] Follow-up reminders + Vercel Cron + Resend emails
- [x] Dashboard with status filter + search bar
- [x] CSV export

### v2 — Power Features

- [ ] Salary / compensation tracking + offer comparison page
- [ ] Tags / labels with color coding + dashboard filter
- [ ] Interview prep / question tracker (per-application rounds)
- [ ] Dashboard charts (funnel + timeline via Recharts)
- [ ] Follow-up email templates with variable substitution
- [ ] Cover letter tracking + LLM generation

### Out of Scope

- Browser extension
- Mobile app
- Multi-user / team accounts
- Kanban drag-and-drop UI
- Automatic job scraping from URLs

---

## Security

- **Row-Level Security (RLS)** on every user-facing table ensures data isolation at the database level
- **Auth guard** via `proxy.ts` protects all `/dashboard` routes — unauthenticated requests are redirected to login
- **Cron route protection** — the `/api/cron/reminders` endpoint validates `Authorization: Bearer <CRON_SECRET>` and rejects unauthorized calls with 401
- **File uploads** are scoped to authenticated users via Supabase Storage policies

---

## Deployment

### Deploy to Vercel

1. Push your repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.example` in the Vercel dashboard
4. Set up the cron job in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 1 * * *"
    }
  ]
}
```

> **Note:** The Vercel Hobby (free) tier allows one cron job per project, running once daily.

### Important Vercel Notes

- Cron timing is approximate — a job scheduled for `0 1 * * *` may fire anywhere in the 1:00–1:59 UTC window
- Vercel does **not** retry failed cron invocations — check function logs if reminders stop sending
- Every push to `main` triggers a production deploy; every PR branch gets a preview URL

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Read `AGENTS.md` first** — it's the source of truth for the data model, naming conventions, and scope
2. **Don't add features not in `AGENTS.md`** — if you want to propose a new feature, update `AGENTS.md` first
3. **Branch naming**: `feature/<short-description>` or `fix/<short-description>`
4. **Commit messages**: short imperative summary
5. **One feature per PR** — don't bundle unrelated changes

### Git Workflow

```
main (always deployable)
 ├── feature/groq-extraction
 ├── feature/resume-upload
 ├── feature/status-filter-search
 └── fix/follow-up-date-bug
```

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

Built with coffee and frustration from losing track of 47 job applications in a Google Sheet.

[Back to Top](#careertrack)

</div>
