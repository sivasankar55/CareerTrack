# CareerTrack — Project Spec

This file is the source of truth for the CareerTrack project. Refer back to it before generating
any schema, API route, or component, so the data model and naming stay consistent
across sessions. Do not invent new tables, columns, or status values that aren't
listed here without updating this file first.

**Standing rule for every future feature, with no exceptions:** before writing any
code for something not already described in this file, update this file first —
add it to section 2's scope list, add any new tables/columns to section 5, follow
the naming/folder/UI/copy conventions in section 4, and log the decision in section
17 (formerly section 11). A feature that isn't in this file yet doesn't get built
yet. If a coding tool proposes a new feature mid-session (a new status value, a new
table, a new page), treat that as a prompt to pause and edit this file before
continuing, not something to implement first and document later — documenting after
the fact is how this file goes stale and stops being trustworthy.

## 1. Problem

Job applicants apply to dozens of roles across LinkedIn, Naukri, Indeed, and company
career pages, then lose track of what they applied to, when they followed up, and
which resume version they sent. Generic spreadsheets get abandoned. Paid SaaS trackers
are overkill for one person.

## 2. Scope

### v1 (initial build)

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

### v2 (post-v1 additions)

- **Interview prep / question tracker**: per-application interview round tracking (round label, scheduled date, questions asked, post-interview notes, prep notes, rating)
- **Offer comparison**: side-by-side comparison page for applications with "offer" status, showing salary, equity, benefits, and other details in a table
- **Tags / labels**: custom labels beyond status (e.g. "remote", "startup", "FAANG", "backend") with color coding, filterable on the dashboard
- **Dashboard charts**: visual funnel breakdown and timeline chart of applications over time
- **Follow-up email templates**: pre-written email templates the user can select from when creating a follow-up, with template variables for personalization
- **Salary / compensation tracking**: new columns on applications for salary range, equity, and benefits
- **Cover letter tracking**: LLM-assisted cover letter generation and version storage (same pattern as resume versions), tagged per application

Out of scope for v2: multi-user/team accounts, browser extension, mobile app,
Kanban drag-and-drop, automatic job scraping from URLs.

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
| Charts | Recharts | lightweight, React-native chart library, fits the stack |

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
│   │   │   ├── search-bar.tsx
│   │   │   ├── application-form.tsx
│   │   │   ├── follow-up-form.tsx
│   │   │   └── resume-upload-form.tsx
│   │   ├── applications/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # detail view (includes interview rounds, tags, cover letter)
│   │   │       └── edit/page.tsx
│   │   ├── offers/
│   │   │   └── page.tsx         # v2: offer comparison page (section 10)
│   │   └── resumes/
│   │       └── page.tsx
│   ├── api/
│   │   ├── extract/route.ts
│   │   ├── generate-cover-letter/route.ts  # v2: LLM cover letter generation
│   │   └── cron/
│   │       └── reminders/route.ts
│   ├── layout.tsx
│   └── proxy.ts                  # Next.js 16 — replaces middleware.ts, auth guard
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   └── shared/                   # navbar, footer, layout chrome
├── lib/
│   ├── supabase/
│   ├── groq.ts
│   ├── csv.ts
│   ├── follow-up-templates.ts    # v2: email template constants (section 13)
│   └── utils.ts
├── hooks/
│   └── use-applications.ts
├── types/
│   ├── application.ts
│   ├── status.ts
│   └── interview.ts              # v2: interview round types
└── public/
```

### UI

- Use **shadcn/ui** components as the primitive layer.
- Pick one spacing scale (Tailwind's default 4px-based scale: `p-2`, `p-4`,
  `p-6`, `gap-4`) and stick to it.
- One accent color for primary actions, neutral gray scale for everything else,
  and status-specific colors only on the status badge/filter itself.
- Empty states: one sentence + a clear action.

### Copy (button labels, errors, empty states)

- Buttons: verb + object, no punctuation — "Add application," "Save changes," "Delete application."
- Confirmations for destructive actions are specific: "Delete this application to Razorpay?"
- Error messages say what happened and what to do, not the raw error.
- Empty states: one sentence + a clear action.

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
| `job_url` | text | nullable — link to the original posting |
| `location` | text | nullable |
| `key_requirements` | jsonb | array of strings |
| `source` | text | one of: `LinkedIn`, `Naukri`, `Indeed`, `Company site`, `Referral`, `Other` |
| `status` | text | one of: `applied`, `interview`, `offer`, `rejected`, `ghosted`, `withdrawn` |
| `applied_date` | date | required |
| `last_status_change` | timestamptz | updated whenever `status` changes |
| `resume_version_id` | uuid, fk → `resume_versions` | nullable, `ON DELETE SET NULL` |
| `cover_letter_version_id` | uuid, fk → `cover_letter_versions` | nullable, `ON DELETE SET NULL` (v2) |
| `salary_min` | integer | nullable, in whole currency units (v2) |
| `salary_max` | integer | nullable, in whole currency units (v2) |
| `equity` | text | nullable, free-text e.g. "0.1%", "$50k over 4 years" (v2) |
| `benefits` | text | nullable, free-text (v2) |
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

### `cover_letter_versions` (v2)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | default `gen_random_uuid()` |
| `user_id` | uuid, fk → `auth.users` | required |
| `label` | text | e.g. "v1-general", "stripe-application" |
| `content` | text | the actual cover letter text |
| `file_url` | text | nullable — optional PDF upload path |
| `file_size_kb` | int | nullable |
| `created_at` | timestamptz | default `now()` |

### `follow_ups`

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
or delete rows here.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | default `gen_random_uuid()` |
| `application_id` | uuid, fk → `applications`, `ON DELETE CASCADE` | required |
| `status` | text | same allowed values as `applications.status` |
| `changed_at` | timestamptz | default `now()` |

### `interview_rounds` (v2)

Per application, multiple interview rounds — one row per round.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | default `gen_random_uuid()` |
| `application_id` | uuid, fk → `applications`, `ON DELETE CASCADE` | required |
| `round_label` | text | e.g. "Phone Screen", "Technical", "On-site", "HR" |
| `scheduled_date` | date | nullable |
| `questions_asked` | text | nullable — freeform, what was asked during the round |
| `notes` | text | nullable — post-interview notes on how it went |
| `prep_notes` | text | nullable — prep notes before the interview |
| `rating` | integer | nullable, 1–5 scale |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

### `tags` (v2)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, pk | default `gen_random_uuid()` |
| `user_id` | uuid, fk → `auth.users`, `ON DELETE CASCADE` | required |
| `name` | text | required, unique per user |
| `color` | text | hex color code e.g. `#6b7280`, default `#6b7280` |
| `created_at` | timestamptz | default `now()` |
| | | `UNIQUE(user_id, name)` |

### `application_tags` (v2)

Junction table linking applications to tags.

| Column | Type | Notes |
|---|---|---|
| `application_id` | uuid, fk → `applications`, `ON DELETE CASCADE` | required, part of composite PK |
| `tag_id` | uuid, fk → `tags`, `ON DELETE CASCADE` | required, part of composite PK |
| `created_at` | timestamptz | default `now()` |
| | | `PRIMARY KEY (application_id, tag_id)` |

### `extraction_cache`

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
   delete its associated `follow_ups`, `status_history`, `interview_rounds`, and
   `application_tags` rows (cascade delete at the DB level via `ON DELETE CASCADE`
   on the foreign keys is simpler than handling it in application code). Deleting an
   application must NOT delete the linked `resume_versions` or `cover_letter_versions`
   row — these can be reused across multiple applications, so they should only be
   removed independently from their respective management screens.

In v2, the detail view also shows: tags assigned to the application, interview
rounds (with add/edit/delete), linked cover letter version, and salary/compensation
details.

## 7. List view: status filter and search

These are required on the list/dashboard view from the first working version, not
deferred to a "polish" pass — a tracker without a way to find a specific application
again defeats the point of building one.

**Status filter** — a set of filter controls (tabs, a dropdown, or buttons; any of
these is fine) for the six values in section 5's status list (`applied`, `interview`,
`offer`, `rejected`, `ghosted`, `withdrawn`), plus an "All" option that's the default
view. Selecting a status shows only applications currently in that status. This reads
from `applications.status`, not from `status_history` — history is for the audit
trail and dashboard stats, not for what the list view filters by.

In v2, a **tag filter** is also available alongside the status filter. It shows all
tags the user has created, and selecting one filters to applications tagged with it.
Tag filter and status filter combine (e.g. "remote" tag + "interview" status shows
only remote-tagged applications in interview status).

**Search bar** — a single text input that searches across `company_name` and
`role_title` (and `key_requirements` if convenient, but those two fields are the
priority — they're what someone actually remembers and types when looking for "that
Razorpay backend role"). For v1, a case-insensitive substring match is enough:

```sql
WHERE company_name ILIKE '%' || :query || '%'
   OR role_title ILIKE '%' || :query || '%'
```

In v2, search also covers `tags.name` via a join.

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

## 9. Interview prep / question tracker (v2)

### Purpose

Per-application interview round tracking. When a user has an interview scheduled, they
can add one or more "rounds" to the application (e.g. "Phone Screen", "Technical",
"On-site", "HR"). Each round tracks: scheduled date, questions asked, post-interview
notes, prep notes, and a rating (1–5).

### Data

Stored in `interview_rounds` table (see section 5). Each round belongs to exactly one
application. Deleting an application cascades to its rounds.

### UI placement

Interview rounds appear as a new card section on the application detail page
(`app/dashboard/applications/[id]/page.tsx`), alongside status history and follow-ups.
Each round shows:
- Round label + scheduled date
- Prep notes (collapsible section)
- Questions asked (collapsible section)
- Post-interview notes
- Rating as stars or number badge
- Edit / delete actions

A form at the bottom of the section allows adding a new round. Editing a round opens
an inline form (same pattern as the follow-up edit UI).

### Filtering / search

Rounds do not appear in the dashboard list filter or search — they are detail-view-only.
However, the dashboard stats could show "X upcoming interviews" based on
`applications.status = 'interview'`.

## 10. Offer comparison (v2)

### Purpose

When a user has multiple applications at "offer" status, they need a way to compare
them side-by-side to make a decision. The offer comparison page shows all offer-status
applications in a table comparing: company, role, location, salary_min, salary_max,
equity, benefits, applied_date, and notes.

### Data

This feature primarily reads from `applications` where `status = 'offer'`. It uses
the v2 salary/compensation columns (`salary_min`, `salary_max`, `equity`, `benefits`).

### UI placement

New page at `app/dashboard/offers/page.tsx`. Accessible from the navbar ("Offers" link).
If the user has zero offers, show an empty state: "No offers yet — keep applying!"

The page renders a table (using the existing shadcn `Table` component) with one row
per offer application. Columns:
- Company
- Role
- Location
- Salary (formatted as `salary_min – salary_max` or just one if only one is set)
- Equity
- Benefits
- Applied date
- Link to detail page

The table should be sortable by clicking column headers (client-side sort).

### Integration

A badge on the navbar "Offers" link shows the count of current offer-status applications
(e.g. "Offers (3)").

## 11. Tags / labels (v2)

### Purpose

Custom labels beyond the built-in status values. Users create tags like "remote",
"startup", "FAANG", "backend" and assign them to applications. Tags are filterable
on the dashboard alongside the status filter.

### Data

Two new tables: `tags` (id, user_id, name, color) and `application_tags` (application_id,
tag_id composite PK). See section 5 for full schema.

### UI — tag management

A new page or section at `/dashboard/tags` (or as a modal from the dashboard) where
users can create, edit, and delete tags. Each tag has a name and a color picker
(hex input or a small set of preset colors).

### UI — assigning tags

On the application form (both create and edit), add a multi-select tag picker at the
bottom. Show existing tags as checkboxes or as a combobox with create-on-the-fly.
On the detail view, show assigned tags as colored badges at the top of the page.

### UI — filtering

On the dashboard list view, add a horizontal tag filter row below the status filter
buttons. Each tag appears as a clickable pill/badge in its assigned color. Selecting
one filters to applications that have that tag. Selecting multiple tags shows
applications that have ALL selected tags (AND logic). A "Clear filters" link resets
all tag selections.

Tags and status filter combine: e.g. tag "remote" + status "interview" shows only
remote-tagged applications in interview status.

## 12. Dashboard charts (v2)

### Purpose

Visualize the user's job search progress with two charts:
1. **Funnel chart** — shows the pipeline breakdown from applied → interview → offer
2. **Timeline chart** — shows applications over time (by month or week)

### Implementation

Use Recharts (added to tech stack). Both charts render on the dashboard page below
the stats bar and above the application list.

**Funnel chart:** A horizontal bar chart or funnel SVG showing counts at each status
(applied → interview → offer → rejected/ghosted/withdrawn). Clicking a bar could
filter the list below to that status.

**Timeline chart:** An area or bar chart with months on the x-axis and count of
applications on the y-axis, colored by status stack. Derived from `applied_date`
column.

### Data source

All data is already in the `applications` table — no new queries or tables needed.
Compute on the client from the existing `useApplications()` hook data.

### Empty state

If the user has fewer than 3 applications, show a simplified message instead of
empty chart axes: "Add a few applications to see your search trends."

## 13. Follow-up email templates (v2)

### Purpose

When creating a follow-up reminder, the user can select from a set of pre-written
email templates rather than writing the note from scratch. The template content is
inserted into the note field, with template variables like `{{company}}`, `{{role}}`
that get replaced with the application's actual values.

### Data

Templates are defined as constants in `lib/follow-up-templates.ts` — not stored in
the database in v2. Each template has:
- `id` (string key)
- `name` (display name, e.g. "Gentle reminder")
- `body` (template text with `{{company}}` and `{{role}}` variables)

Pre-defined templates:
1. **Gentle reminder** — "Hi [hiring manager], I'm writing to follow up on my
   application for {{role}} at {{company}}..."
2. **Post-interview thank-you** — "Thank you for taking the time to interview me
   for {{role}} at {{company}}..."
3. **Status check** — "I wanted to check in on the status of my application for
   {{role}} at {{company}}..."
4. **Custom** — blank textarea

### UI integration

On the follow-up form (`follow-up-form.tsx`), add a dropdown/select labeled
"Template" above the note textarea. Selecting a template populates the note field
with the rendered text (variables replaced). The user can then edit the text before
saving. The template selection does not auto-save — it's just a convenience to
pre-fill the note.

### Cron integration

No changes to the cron route — it already reads `follow_ups.note` and sends it
as the email body via Resend.

## 14. Cover letter tracking (v2)

### Purpose

Same pattern as resume versions, but for cover letters. Users can:
- Store cover letter versions (text content, optionally uploaded as PDF)
- Generate a first draft via Groq (LLM-assisted)
- Link a cover letter version to an application
- Download or view the cover letter from the application detail page

### Data

New table `cover_letter_versions` (see section 5). New column
`cover_letter_version_id` on `applications` (nullable FK, `ON DELETE SET NULL`).

### LLM generation

New API route at `app/api/generate-cover-letter/route.ts` — POST endpoint that
accepts `{ company_name, role_title, job_description_raw }` and calls Groq with a
prompt asking it to write a professional cover letter. Returns `{ cover_letter: string }`.
The prompt instructs the model to keep it concise (3–4 paragraphs), professional,
and tailored to the company/role.

### UI — manage cover letters

A new tab/section on the existing `/dashboard/resumes` page is renamed to
"Documents" with sub-sections for "Resumes" and "Cover Letters". The cover letter
section mirrors the resume upload form: upload a PDF or paste/edit text content,
give it a label, and save.

Alternatively, a simpler approach for v2: add a cover letter section on the resume
management page.

### UI — application form

The application create/edit form gets a new dropdown "Cover letter version" next to
the existing "Resume version" dropdown, listing available cover letter versions.
A "Generate draft" button next to the dropdown calls the LLM generation endpoint
with the current form values and creates a new cover letter version, then selects it.

### UI — detail view

On the application detail page, show the linked cover letter version (if any) in
the Details card. Show "View cover letter" button that opens the content in a
dialog/modal, and a "Download" button if a PDF file_url exists.

## 15. Build order

### v1 build order

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

### v2 build order

1. **Schema migration** — add new columns to `applications` (salary/compensation,
   cover_letter_version_id), create new tables (`cover_letter_versions`,
   `interview_rounds`, `tags`, `application_tags`), update RLS policies, create
   Supabase Storage bucket for cover letter PDFs.
2. **Salary / compensation + offer comparison** — add salary/equity/benefits fields
   to the application create/edit form and detail view; build the `/dashboard/offers`
   comparison page; add "Offers" link to navbar with count badge.
3. **Tags / labels** — build tag CRUD page, tag picker on application form, tag
   badges on detail view, tag filter on dashboard alongside status filter.
4. **Interview prep / question tracker** — build interview round CRUD UI on the
   application detail page (add/edit/delete rounds).
5. **Dashboard charts** — add Recharts funnel and timeline charts to the dashboard.
6. **Follow-up email templates** — add template selector to the follow-up form;
   define templates in `lib/follow-up-templates.ts`.
7. **Cover letter tracking** — build `cover_letter_versions` CRUD, LLM generation
   endpoint, dropdown on application form, cover letter display on detail view.
8. **Polish** — update CSV export to include new columns, add tag column to export,
   update search to include tags.

## 16. Git workflow

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

## 17. Open questions / decisions log

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
- (v2) Added Recharts for dashboard charts — lightweight, React-native, no heavy
  dependencies, and already widely used in the Next.js ecosystem.
- (v2) Email templates defined as code constants rather than a DB table — simpler
  for v2, can be migrated to a template table later if users want custom templates.
- (v2) Cover letter generation uses the same Groq API (Llama 3.1 8B) already used
  for JD extraction — no new service needed.
- (v2) Tags use a dedicated junction table (`application_tags`) rather than a jsonb
  array on `applications` — proper referential integrity, color support, and easier
  filtering via SQL joins.
- (v2) Interview rounds stored as separate rows rather than a jsonb array on
  `applications` — supports future features like calendar integration and per-round
  follow-ups.
- (v2) Offer comparison page is read-only (no editing) in v2 — editing happens on
  the individual application edit page; the comparison page just views.
