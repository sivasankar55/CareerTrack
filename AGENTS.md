# CareerTrack — Project Spec

This file is the source of truth for the CareerTrack project. Refer back to it before generating
any schema, API route, or component, so the data model and naming stay consistent
across sessions. Do not invent new tables, columns, or status values that aren't
listed here without updating this file first.

**Standing rule for every future feature, with no exceptions:** before writing any
code for something not already described in this file, update this file first —
add it to section 2's scope list, add any new tables/columns to section 5, follow
the naming/folder/UI/copy conventions in section 4, and log the decision in section
11. A feature that isn't in this file yet doesn't get built yet. If a coding tool
proposes a new feature mid-session (a new status value, a new table, a new page),
treat that as a prompt to pause and edit this file before continuing, not something
to implement first and document later — documenting after the fact is how this file
goes stale and stops being trustworthy.

## 1. Problem

Job applicants apply to dozens of roles across LinkedIn, Naukri, Indeed, and company
career pages, then lose track of what they applied to, when they followed up, and
which resume version they sent. Generic spreadsheets get abandoned. Paid SaaS trackers
are overkill for one person.

## 2. Scope for v1

- Manual entry of applications (paste job description as raw text, fill in company/role/status by hand)
- LLM-assisted extraction: paste a job description, get company name, role title, location, and key requirements auto-filled (user can edit before saving)
- Full edit and delete on any saved application — these are not optional later additions, every application card/row needs them from the first working version of the list view
- Status filter (applied / interview / offer / rejected / ghosted / withdrawn) and a search bar on the list view, both required from the first working version, not deferred to polish
- Status tracking with full history (not just current status — a log of every change)
- Follow-up reminders with email nudges
- Resume version tracking with actual PDF file storage, tagged per application
- CSV export
- Single user per account (no team/sharing features)

Out of scope for v1: scraping job URLs directly, browser extension, mobile app,
multi-user/team accounts, Kanban drag-and-drop UI (a filterable list/table is enough).

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | Next.js 16 (App Router) | matches existing skill set |
| Database | Supabase Postgres | free tier, generous limits |
| Auth | Supabase Auth (email) | bundled with the DB, no separate service |
| File storage | Supabase Storage | for resume PDFs, bundled with same project |
| LLM extraction | Groq API (Llama 3.1 8B or similar) | fast, free tier, good enough for structured extraction |
| Email reminders | Resend | 3,000 emails/month free |
| Cron | Vercel Cron | free, triggers daily reminder check |
| Hosting | Vercel | free tier for Next.js |

No other services. If a coding tool suggests adding a new dependency (e.g. a separate
queue, a separate auth provider, Prisma vs raw SQL), check it against this table first
and flag the deviation instead of silently adding it.

### Next.js 16 notes

This project targets Next.js 16, not 15. A few breaking changes from 15 are directly
relevant here — flag it if a coding tool generates code assuming the old behavior:

- `params`, `cookies()`, and `headers()` are fully async with no synchronous fallback.
  Every dynamic route (e.g. `applications/[id]`) and every server action reading
  cookies for the Supabase session must `await` these.
- `middleware.ts` is replaced by `proxy.ts` (exported function renamed `proxy`, runs
  on the Node.js runtime only, no edge runtime). Use this for the route guard that
  checks a valid Supabase session before allowing access to `/dashboard` and other
  authenticated pages.
- Caching is now opt-in via the `"use cache"` directive instead of implicit. Don't add
  `"use cache"` to anything that reads `applications`, `follow_ups`, or
  `resume_versions` — this data is per-user and changes on every status update, so it
  should stay dynamic by default rather than being explicitly cached.
- Turbopack is the default bundler; no config needed to opt in.

### Vercel Cron notes

The free (Hobby) tier limits cron jobs to once per day per project — this is exactly
what the daily reminder check needs, so no upgrade is required. Two things to bake
into the `/api/cron/reminders` route from the start:

- **Timing is not exact.** A job scheduled for `0 1 * * *` may fire anywhere in the
  1:00–1:59am window, not precisely at 1:00. Don't build logic that assumes exact
  invocation time — query by date (`due_date <= today`), not by hour.
- **Secure the route.** Anyone who finds the route URL can call it directly and
  trigger emails unless it's protected. Set a `CRON_SECRET` environment variable in
  Vercel — it's automatically sent as an `Authorization: Bearer <value>` header on
  every cron invocation. The route handler must check that header against
  `process.env.CRON_SECRET` and reject (401) anything that doesn't match.
- Vercel does not retry failed cron invocations — if the route errors, that day's
  reminder check is just missed. Worth logging failures somewhere visible (even just
  Vercel's own function logs) rather than failing silently.

## 4. Conventions: naming, folder structure, UI, copy

These match what most companies actually do in a Next.js App Router codebase — not
invented for this project. Apply them from the first file created, not retrofitted
later; renaming files after the fact is exactly the kind of churn this section exists
to avoid.

### Naming

- **Files and folders**: `kebab-case` — `job-application-card.tsx`, `resume-upload-form.tsx`,
  not `JobApplicationCard.tsx` or `job_application_card.tsx`.
- **Components and types/interfaces**: `PascalCase` inside the file —
  `export function JobApplicationCard() { ... }`, `type ApplicationStatus = ...`.
- **Variables and functions**: `camelCase` — `applicationList`, `getFollowUpsDue()`.
- **Constants and env vars**: `SCREAMING_SNAKE_CASE` — `CRON_SECRET`, `MAX_RESUME_SIZE_MB`.
- **Database**: `snake_case` for tables and columns (already used throughout section 5)
  — Postgres convention, and avoids needing quoted identifiers.
- **Booleans** read as a yes/no question: `isLoading`, `hasFollowUp`, `completed` (not
  `loading`, `followUpFlag`, `status_done`).
- **Route segments** in `app/` are also `kebab-case`: `app/applications/[id]/edit/page.tsx`,
  not `app/Applications/`.

### Folder structure

Standard App Router layout: route-specific code lives inside its route folder in
`app/` (colocation), shared code lives at the project root. Don't put reusable
components inside a specific route's folder "for now" and mean to move them later —
decide at creation time whether something is route-specific or shared.

```
careertrack/
├── app/
│   ├── (auth)/                  # route group — no URL segment added
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx             # list view: status filter + search (section 7)
│   │   ├── _components/         # underscore = excluded from routing
│   │   │   ├── application-card.tsx
│   │   │   ├── status-filter.tsx
│   │   │   └── search-bar.tsx
│   │   └── applications/
│   │       ├── new/page.tsx     # create form
│   │       └── [id]/
│   │           ├── page.tsx     # detail view
│   │           └── edit/page.tsx
│   ├── api/
│   │   ├── extract/route.ts     # Groq extraction endpoint (section 8)
│   │   └── cron/
│   │       └── reminders/route.ts
│   ├── layout.tsx                # root layout
│   └── proxy.ts                  # Next.js 16 — replaces middleware.ts, auth guard
├── components/                   # shared across multiple routes
│   ├── ui/                       # primitives: button, input, dialog, badge
│   └── shared/                   # navbar, footer, layout chrome
├── lib/
│   ├── supabase/                 # client setup, queries
│   ├── groq.ts                   # extraction call + JSON parsing (section 8)
│   └── utils.ts                  # small helpers only — split if this grows past ~200 lines
├── hooks/                        # shared custom hooks, e.g. use-applications.ts
├── types/                        # shared TS types, e.g. application.ts, status.ts
└── public/                       # static assets only
```

A few rules worth following deliberately rather than by accident:

- **Colocate first, globalize on second use.** A component only used inside the
  dashboard list view lives in `app/dashboard/_components/`. The moment something is
  needed by a second route, move it to `components/`.
- **Underscore-prefixed folders** (`_components`, `_lib`) inside `app/` are excluded
  from routing — use these for route-specific helpers so Next.js doesn't try to treat
  them as pages.
- **Route groups** (parentheses, e.g. `(auth)`) organize routes without adding a URL
  segment — `(auth)/login/page.tsx` is still just `/login`, not `/auth/login`.
- **Extract business logic out of Server Actions into `lib/`** rather than writing it
  inline inside the action. Server Actions are tied to Next.js internals (cookies,
  headers, revalidation) which makes them awkward to unit test directly; a plain
  function in `lib/` can be tested in isolation and reused from the cron route too.
- Don't nest more than 3-4 levels deep inside `app/` for route-specific component
  folders — if it's getting that deep, the component probably belongs in the shared
  `components/` folder instead.

### UI

This doesn't need a custom design system — that's overkill for a personal tool — but
pick a small, consistent set of primitives up front rather than improvising styles
page by page, which is what makes hand-built tools look unfinished even when the
features work.

- Use **shadcn/ui** components (button, card, dialog, badge, input, select) as the
  primitive layer — they're unstyled-enough to customize but consistent out of the
  box, and match what's already listed as available in `components/ui/`.
- Pick one spacing scale (Tailwind's default 4px-based scale is fine: `p-2`, `p-4`,
  `p-6`, `gap-4`) and stick to it — don't mix `p-3` and `p-5` and `p-[18px]` across
  different cards.
- One accent color for primary actions (e.g. "Save," "Add Follow-up"), a neutral gray
  scale for everything else, and status-specific colors only on the status
  badge/filter itself (e.g. green for `offer`, red for `rejected`, gray for `ghosted`,
  blue for `interview`) — don't let every button compete for attention.
- Empty states matter more here than in a typical app — a job tracker with zero
  applications should say something encouraging and point at the "Add application"
  button, not just show a bare empty table.

### Copy (button labels, errors, empty states)

Small, but this is the cheapest way to make a side project look like a real product
rather than a tutorial, and it's the part most personal projects skip entirely.

- Buttons: verb + object, no punctuation — "Add application," "Save changes," "Delete
  application," not "Submit" or "OK" (too generic) or "Add application!" (no
  exclamation marks on functional UI).
- Confirmations for destructive actions are specific, not generic: "Delete this
  application to Razorpay?" not "Are you sure?" — the user shouldn't have to recall
  what they clicked to know what they're confirming.
- Error messages say what happened and what to do, not the raw error: "Couldn't parse
  that job description — try pasting just the text, not the whole page" rather than
  exposing a raw Groq API error to the user.
- Empty states: one sentence + a clear action. "No applications yet — paste a job
  description to get started" plus the add-application button, not just blank space.

## 5. Data model

All tables live in Supabase Postgres. Every table except `extraction_cache` has
row-level security scoped to `user_id = auth.uid()` — this is not optional, skipping
it means any authenticated user can read any other user's data.

### `applications`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | default `gen_random_uuid()` |
| `user_id` | uuid, fk → `auth.users` | required |
| `company_name` | text | required |
| `role_title` | text | required |
| `job_description_raw` | text | the pasted JD, kept for reference |
| `job_url` | text | nullable — link to the original posting (LinkedIn/Naukri/Indeed/company site). Render as a clickable link in the UI; don't assume it stays valid, postings get taken down |
| `location` | text | nullable |
| `key_requirements` | jsonb | array of strings, e.g. `["React", "3+ yrs", "GraphQL"]` |
| `source` | text | one of: `LinkedIn`, `Naukri`, `Indeed`, `Company site`, `Referral`, `Other` |
| `status` | text | one of: `applied`, `interview`, `offer`, `rejected`, `ghosted`, `withdrawn` — see status rules below |
| `applied_date` | date | required |
| `last_status_change` | timestamptz | updated whenever `status` changes |
| `resume_version_id` | uuid, fk → `resume_versions` | nullable, `ON DELETE SET NULL` — deleting an application must not delete the resume version it used |
| `notes` | text | nullable, freeform |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()`, update on every write |

### `resume_versions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | default `gen_random_uuid()` |
| `user_id` | uuid, fk → `auth.users` | required |
| `label` | text | e.g. `v3-backend-focus` |
| `file_url` | text | path in Supabase Storage bucket |
| `file_size_kb` | int | for display only |
| `created_at` | timestamptz | default `now()` |

### `follow_ups`

One application can have multiple follow-ups over time (don't collapse this into a
single column on `applications`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | default `gen_random_uuid()` |
| `application_id` | uuid, fk → `applications`, `ON DELETE CASCADE` | required |
| `due_date` | date | required |
| `completed` | boolean | default `false` |
| `completed_at` | timestamptz | nullable |
| `note` | text | nullable — what was actually said in the follow-up |

### `status_history`

Append-only. Write a new row every time `applications.status` changes — never update
or delete rows here. This is what lets the dashboard compute things like average
days-to-response later.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | default `gen_random_uuid()` |
| `application_id` | uuid, fk → `applications`, `ON DELETE CASCADE` | required |
| `status` | text | same allowed values as `applications.status` |
| `changed_at` | timestamptz | default `now()` |

### `extraction_cache`

Optional but cheap to add. Keyed by a hash of the pasted JD text so re-pasting the
same JD doesn't burn another Groq call. No `user_id` / RLS needed since it holds no
personal data, just JD text hashes and extracted JSON.

| Column | Type | Notes |
|---|---|---|
| `jd_hash` | text, pk | sha256 of the trimmed/lowercased JD text |
| `extracted_json` | jsonb | the LLM's structured output |
| `created_at` | timestamptz | default `now()` |

### Status values (used in both `applications.status` and `status_history.status`)

`applied`, `interview`, `offer`, `rejected`, `ghosted`, `withdrawn`

Do not add new status values without updating this table. If a coding tool proposes
e.g. `phone_screen` or `final_round` as separate statuses, push back — use `interview`
plus a note, or expand this list deliberately and update this file.

## 6. Per-application actions (list/detail view)

Every saved application — whether shown as a card or a table row — needs three
actions available directly on it, not buried in a separate menu or a future release:

1. **Edit** — opens the same form used to create the application, pre-filled with
   its current values (including `job_url`, `notes`, `status`, `resume_version_id`,
   everything). On save, update the row's `updated_at`. If `status` changed as part
   of the edit, this must also insert a new row into `status_history` and update
   `last_status_change` — editing is not exempt from the history-logging rule in
   section 5, it's just another way the status can change.
2. **Open job link** — a button/icon that opens `job_url` in a new tab
   (`target="_blank" rel="noopener noreferrer"`). If `job_url` is empty for that
   application (it's nullable), disable the button or hide it rather than opening a
   blank/broken link — don't show an active button that does nothing.
3. **Delete** — removes the application permanently. Always confirm before deleting
   (a modal or browser `confirm()` is enough for v1, doesn't need to be fancy) since
   this is destructive and there's no undo. Deleting an application should also
   delete its associated `follow_ups` and `status_history` rows (cascade delete at
   the DB level via `ON DELETE CASCADE` on the foreign keys is simpler than handling
   it in application code). Deleting an application must NOT delete the linked
   `resume_versions` row — a resume version can be reused across multiple
   applications, so it should only be removed independently from a resume-management
   screen, not as a side effect of deleting one application that happened to use it.

## 7. List view: status filter and search

These are required on the list/dashboard view from the first working version, not
deferred to a "polish" pass — a tracker without a way to find a specific application
again defeats the point of building one.

**Status filter** — a set of filter controls (tabs, a dropdown, or buttons; any of
these is fine) for the six values in section 5's status list (`applied`, `interview`,
`offer`, `rejected`, `ghosted`, `withdrawn`), plus an "All" option that's the default
view. Selecting a status shows only applications currently in that status. This reads
from `applications.status`, not from `status_history` — history is for the audit
trail and dashboard stats in build order step 6, not for what the list view filters by.

**Search bar** — a single text input that searches across `company_name` and
`role_title` (and `key_requirements` if convenient, but those two fields are the
priority — they're what someone actually remembers and types when looking for "that
Razorpay backend role"). For v1, a case-insensitive substring match is enough:

```sql
WHERE company_name ILIKE '%' || :query || '%'
   OR role_title ILIKE '%' || :query || '%'
```

Don't reach for Postgres full-text search (`tsvector`/`to_tsvector`) or a separate
search service for this — at the scale of one person's job applications (dozens to a
few hundred rows), `ILIKE` against an indexed column is fast enough and has zero extra
setup. Add a plain B-tree index on `company_name` and `role_title` if the list ever
feels slow, but don't pre-optimize for this.

Search and the status filter should combine (e.g. searching "razorpay" while the
"interview" filter is active should only show interview-status Razorpay applications),
not act as two separate, mutually exclusive views.

## 8. LLM extraction contract

When the user pastes a job description, the app sends it to Groq with a prompt that
returns **only** JSON, no preamble, matching this exact shape:

```json
{
  "company_name": "string",
  "role_title": "string",
  "location": "string or null",
  "key_requirements": ["string", "string", "..."]
}
```

`job_url` is intentionally not part of this contract — it's not derivable from the JD
text, it's a separate optional field the user pastes in alongside the JD (the link to
the original posting on LinkedIn/Naukri/Indeed/etc). Keep its input field next to the
JD textarea in the form, not bundled into the extraction step.

Rules:
- Always parse defensively (strip markdown code fences before `JSON.parse`)
- Never auto-save the extracted result directly to the database — populate the form
  fields and let the user review/edit before submitting. JDs are messy; the model
  will occasionally mis-parse a field.
- Hash the input JD text and check `extraction_cache` before calling Groq; write to
  the cache after a successful call.

## 9. Build order

Each step should end in something clickable, not just scaffolding.

1. **Schema + auth** — create all tables above in Supabase, enable email auth, write
   and test RLS policies before building any UI on top of them.
2. **Manual CRUD on `applications`** — plain form (paste JD into a textarea, fill
   company/role/status/source/applied_date/job_url by hand), list view with status
   filter. No LLM yet.
3. **Groq extraction** — wire the textarea to a server action calling Groq with the
   contract in section 8, pre-fill the form, let the user edit before saving.
4. **Resume upload + tagging** — Supabase Storage bucket, upload component,
   `resume_versions` CRUD, dropdown on the application form to attach a version.
5. **Status history + follow-ups** — write a `status_history` row on every status
   change, build follow-up creation UI ("remind me in N days"), Vercel Cron route
   that runs daily, queries `follow_ups` where `due_date <= today AND completed = false`,
   sends via Resend.
6. **Polish** — CSV export, dashboard stats (response rate, ghosted %, average
   days-to-response computed from `status_history`).

Don't jump ahead to step 4 or 5 before steps 2-3 produce a working app — each step
should be deployable on its own.

## 10. Git workflow

This is a solo project, but follow real conventions rather than committing straight
to `main` — it produces a better commit history for a portfolio repo and catches
mistakes before they hit the deployed app.

- **`main` stays deployable at all times.** Every commit on `main` should be a state
  the live app can run in. Connect the repo to Vercel so every push to `main`
  triggers a production deploy, and every PR/branch gets its own preview URL
  automatically — this is the free equivalent of a staging environment.
- **One branch per feature or build-order step**, branched off `main`. Naming:
  `feature/<short-description>`, matching the build order steps where it makes sense
  — e.g. `feature/groq-extraction`, `feature/resume-upload`, `feature/status-filter-search`,
  `fix/<short-description>` for bug fixes.
- **Open a PR against `main` even as the sole reviewer.** The point isn't review by
  someone else — it's getting a clean diff to read before merging, and a commit
  history with descriptive PR titles instead of a flat list of `main` commits. Check
  the Vercel preview URL for that branch actually works before merging.
- **Merge only when the feature works end-to-end**, not partway through. If a feature
  naturally splits into smaller pieces (e.g. "Groq extraction" could split into
  "extraction API route" + "wire it to the form"), that's fine — smaller PRs are
  easier to review and revert if something breaks. Don't merge a half-wired feature
  just to "save it" — a local branch doesn't need saving via merge.
- **Commit messages**: short imperative summary line (`Add status filter to dashboard`,
  not `added status filter` or `fixes`), with detail in the body only if the change
  isn't self-explanatory from the diff. Don't bundle unrelated changes (a schema
  migration and a CSS tweak) into one commit.
- **Delete branches after merging** to keep the branch list readable; the commit
  history on `main` is the permanent record, not the branch.
- No feature flags needed at this scale — a solo dev merging working features doesn't
  need to hide half-built code from "users" the way a team shipping continuously
  does. If a feature spans multiple sessions and isn't done, just keep it on its
  branch until it is, rather than merging incomplete work behind a flag.

## 11. Open questions / decisions log

Use this section for two things: decisions made mid-build so future sessions don't
re-litigate them, and a running log of features added after this file's initial
scope (per the standing rule at the top of this file). Append, don't delete — even
a feature that gets removed later should leave a line here saying so, rather than
silently disappearing.

When adding a new feature after v1, follow this sequence rather than jumping
straight to code:
1. Add a line here describing the feature and why it's being added.
2. Update section 2 (scope) to list it.
3. If it touches data, update section 5 (data model) with the new table/columns —
   match the existing style (types, nullability, `ON DELETE` behavior where relevant).
4. If it changes a screen, add or update the relevant numbered section (6, 7, 8) or
   add a new one, following the conventions in section 4.
5. Only then write the code.

- (example) Decided to use Supabase Storage over a separate file host because Auth
  and DB are already on Supabase — one fewer service to configure.