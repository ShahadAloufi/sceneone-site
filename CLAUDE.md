# CLAUDE.md — Scene One

Long-term project memory. Keep this concise and current. Update it when
architecture, rules, or workflow change — not for one-off tasks.

---

## Project Overview

Scene One is a production, bilingual (Arabic-primary RTL / English) platform that
connects screenwriters with professional script readers who produce written
**coverage** (script evaluation reports). Writers submit a script through a public
form; staff/readers are assigned scripts, write coverage in a reader workspace, and
deliver the finished report to the writer.

Two audiences:
- **Writers** — no accounts. They interact only via the public submission form and
  the emails they receive.
- **Staff/readers** — authenticated users who work in the admin dashboard and the
  reader coverage workspace.

---

## Current Development Phase

Core product is live in production: submission intake, admin dashboard, reader
coverage workspace + report, role-based access, deadlines, and manual report
delivery to writers. Actively iterating on UX polish and workflow features.

---

## Tech Stack

- **Frontend:** vanilla HTML + CSS + JavaScript. **No framework, no build step,
  no bundler.** Libraries loaded via CDN `<script>` tags (supabase-js UMD, pdf.js).
- **Backend:** Vercel serverless functions (plain `module.exports` handlers in
  `/api`, native `fetch`, no `package.json`).
- **Database/Auth/Storage:** Supabase (Postgres + RLS, Supabase Auth, Storage).
- **Email:** Resend (verified sender domain `sceneone.info`).
- **Hosting:** Vercel (static + serverless). Repo: `ShahadAloufi/sceneone-site`.

Do NOT introduce Next.js/React/a compiler/npm build. Keep it buildless.

---

## Project Architecture

- **Pages (root `.html`):** `index` (landing), `submit` (script submission),
  `admin` (login + dashboard), `coverage` (reader workspace + report),
  `report` (public, read-only report the writer opens via a tokenized link),
  `about-coverage`, `privacy`, `terms`.
- **Styles:** single shared `css/styles.css`. Prefix conventions: `adm-` (admin),
  `sub-`/`so-` (submission), `cov-` (about-coverage), `.nav` (shared header),
  `.so-loader` (shared Scene One loader).
  - **Exception:** `coverage.html` and `report.html` are self-contained — each has
    its **own inline `<style>` block and no-flash theme/lang script**, and does NOT
    link `css/styles.css`. Shared pieces are duplicated there.
- **Client JS (`/js`):** `config.js` (client-safe Supabase url/anonKey/bucket),
  `theme.js`, `main.js` (landing), `submit.js` (submission form + PDF page count),
  `admin.js` (login/dashboard/realtime), `coverage.js` (workspace/report),
  `report.js` (public report page), `report-render.js` (**shared** bilingual report
  renderer used by BOTH `coverage.js` and `report.js` — single source of truth for
  the report markup, so the workspace preview and the writer's page never drift).
- **API (`/api`):** `submissions.js`, `registrations.js`, `admin/admins.js`,
  `send-report.js`, `report.js` (public read-only report data, gated by token).
- **Schema:** `supabase/schema.sql` is the source of record; **schema changes are
  run manually in the Supabase SQL Editor** (the file is not auto-applied).

Business logic, validation, and privileged operations live server-side in `/api`.
Client JS is UI only; client validation is UX-only and always re-validated server-side.

---

## Database Overview

Tables (all with RLS enabled):
- **admins** — `id` (=auth user id), `name`, `email`, `role`, `created_at`.
- **submissions** — script metadata: `created_at`, `title_ar/en`, `email`, `writer`,
  `genre`, `film_type`, `draft`, `duration`, `logline`, `vision`, `ip_registered`,
  `file_path`, `file_name`, `status`, `assigned_to`, `co_reader_id`, `pages`,
  `report_token` (uuid; the unguessable key in the writer's report link).
- **coverages** — `submission_id`, `data` (jsonb: the full coverage content),
  `status` (`in_progress` | `completed`).
- **access_log** — `admin_id`, `ip`, `user_agent`, `created_at`. One row per
  dashboard sign-in (written by `/api/log-access`, service role); **super-admins
  only** may read it (RLS). Surfaces possible shared reader accounts.

RLS uses `SECURITY DEFINER` helper functions: `is_admin(uid)` (in admins table),
`is_staff(uid)` (admin/super_admin), `is_assigned(uid, submission_id)` (primary
assignee or co_reader). Coverages: SELECT = staff OR assigned OR status='completed';
INSERT/UPDATE = assigned only.

**Realtime:** the dashboard subscribes to `submissions` and `coverages`. These tables
must be in the `supabase_realtime` publication for live updates to fire.

---

## Business Rules

- **Roles:** `admin`, `super_admin`, `senior_reader`, `junior_reader`. Staff =
  admin/super_admin; readers = senior/junior.
- **Assignment:** a reader claims a script (primary assignee). If the primary is a
  **junior** reader, a **co-reader** slot opens for a second reader.
- **Coverage access (read-only model):** the assignee edits; non-assigned readers are
  blocked; non-assigned staff get a read-only view; a **completed** coverage is a
  finished report viewable read-only by any authenticated staff/reader.
- **Dashboard coverage label:** completed → "View report"; unassigned → "Awaiting
  assignment"; assigned-to-me → "Start/Continue coverage"; claimed-by-another →
  "In review".
- **Report gating:** "Generate report" needs a 1–5 score on all 7 evaluation points;
  "Mark complete" additionally needs every written section filled.
- **Deadline:** every submission's deadline = `created_at` + the max turnaround for its
  type — **features 15 days, shorts 10 days** (matches the landing-page cards) — shown
  on the dashboard with a color-coded days-left/overdue/delivered badge (derived, not
  stored).
- **Report delivery:** a manual **"Send to writer"** button on a *completed* report
  emails the writer a **private link** to the hosted report page
  (`/report?t=<report_token>`) via `/api/send-report` (Resend). The writer opens it
  in any browser (native rendering → correct Arabic, no account needed) and can
  Save-as-PDF from there. **Why a link, not a PDF attachment:** client-side
  rasterisation (html2canvas) can't reliably render Arabic word spacing, so the
  report is rendered natively instead.
- **PDF page count:** counted in the browser at upload (pdf.js); the coverage panel
  shows **page count − 1** (skips the title page). Non-PDF files keep the manual
  duration.
- **Default theme:** dark for both readers and admins (toggle still available).

---

## Security Rules

- Validate and sanitize every input **server-side**; never trust client validation.
- Guard against XSS (escape all interpolated user content), IDOR, and privilege
  escalation. Follow OWASP Top 10.
- **Service Role Key is server-only** — never in client JS. Client uses the anon key.
- Keep RLS enabled with least-privilege policies; never disable RLS.
- Secrets only in Vercel env vars; never log passwords/tokens/secrets or leak stack
  traces / DB errors to clients.
- Every API: validate input, authenticate (verify the bearer token), authorize the
  action, return safe messages and proper status codes.
- File uploads: validate extension, size, and reject unsafe files; never trust the
  filename.
- **Script files are IP-protected — never expose them.** The `scripts` bucket MUST
  stay **private** (`public = false`); **never** use a public bucket or
  `getPublicUrl`. Every view/download MUST be a **short-lived signed URL**
  (`createSignedUrl`, ≤120s) minted **only after** Storage RLS verifies the caller
  (currently `is_admin(auth.uid())`). Never return `file_path` to unauthenticated
  callers (e.g. the public report page/API must omit it).

---

## Coding Standards

- Match the surrounding code's style (this is ES5-ish browser JS: `var`, function
  declarations, no modules). Keep it readable and simple.
- No dead/duplicate code, magic numbers, or oversized functions. Factor shared logic
  into helpers.
- Escape user content in all HTML string building (`esc()`/`escapeHtml()`).
- Bilingual: all user-facing text goes through the i18n dictionaries (see below) —
  never hardcode a single language in the UI.

---

## Development Workflow

- **Push discipline:** make the change → verify in the preview → the user says
  **"push it"** → then commit + push. **Never push without an explicit "push it".**
- Commit straight to `main` (solo dev); no PR flow unless asked. End commit messages
  with the `Co-Authored-By` trailer.
- Validate JS with `node --check <file>` before committing.
- When a change needs a schema/Supabase change, provide the exact SQL and tell the
  user to run it in the Supabase SQL Editor.

---

## Important Design Decisions

- **Buildless vanilla stack** on purpose — simplicity and zero build tooling.
- **coverage.html is intentionally self-contained** (own styles + no-flash theme/lang
  script) to avoid a flash of unstyled/wrong-language content on the reader workspace.
- **Writers have no accounts** — all writer interaction is the public form + email.
- **Deadline is derived** from `created_at` (no stored deadline column) so it can't
  drift.
- **i18n via JS dictionaries** and `data-i18n` / `data-i18n-ph` / `data-i18n-title`
  attributes; `applyLang()` (admin) and `applyUILang()` (coverage) swap text +
  `dir`/`lang`. Language persists in `localStorage` key `sceneone-admin-lang`.

---

## Current TODOs

- **Run these once in the Supabase SQL Editor** (required by the latest features):
  ```sql
  alter table public.submissions add column if not exists pages int;
  alter publication supabase_realtime add table public.submissions;
  alter publication supabase_realtime add table public.coverages;

  -- Hosted report link: unguessable per-submission token (backfills existing rows).
  alter table public.submissions add column if not exists report_token uuid not null default gen_random_uuid();
  create index if not exists submissions_report_token_idx on public.submissions (report_token);

  -- Access log (detect shared reader accounts). Also in supabase/schema.sql §5.
  create table if not exists public.access_log (
    id bigint generated always as identity primary key,
    admin_id uuid references public.admins(id) on delete cascade,
    ip text, user_agent text,
    created_at timestamptz not null default now()
  );
  create index if not exists access_log_admin_created_idx on public.access_log (admin_id, created_at desc);
  alter table public.access_log enable row level security;
  drop policy if exists "super admins read access log" on public.access_log;
  create policy "super admins read access log" on public.access_log for select
    to authenticated using ( public.is_super_admin(auth.uid()) );
  grant select on public.access_log to authenticated;
  grant all on public.access_log to service_role;
  ```

---

## Future Development Roadmap

- **Payment gating** for submissions (schema comments already anticipate restricting
  access to paid submissions).
- Optional server-generated PDF export (e.g. headless Chrome) if writers want a file
  without using their browser's Save-as-PDF from the hosted report page.

---

## Known Limitations

- PDF page count works for **PDF only** (via pdf.js CDN); other formats store no page
  count and fall back to the writer's manual duration.
- `/api` serverless functions and Supabase Auth **do not run in the local preview** —
  the dashboard/report can only be exercised end-to-end on the deployed site.
- Report delivery emails a **tokenized link** to the hosted `report.html`; the writer
  Saves-as-PDF from their browser. There is no server-generated PDF attachment (Arabic
  can't be reliably rasterised client-side).

---

## API Structure

All handlers are plain `module.exports = async (req, res) => {...}`, use native
`fetch`, verify the caller's Supabase bearer token, and use the service-role key for
privileged reads/writes.
- **`POST /api/submissions`** — validates + inserts a submission (service role);
  emails an admin notification and a writer confirmation (Resend).
- **`POST /api/send-report`** — admin-authenticated; emails the writer a tokenized
  link to their completed coverage report.
- **`GET /api/report?t=<report_token>`** — **public** (the token is the auth); returns
  the report-safe fields (no email/file) of a submission with a *completed* coverage.
- **`POST /api/log-access`** — any signed-in admin/reader; records their dashboard
  visit with the **server-read client IP** (`x-forwarded-for`) to `access_log`.
  Fire-and-forget from the client on sign-in; never blocks the UI.
- **`POST|DELETE /api/admin/admins`** — super-admin only; create/delete admin accounts
  (creates the auth user + `admins` row).
- **`/api/registrations`** — interest/registration intake.

---

## Authentication & Authorization

- **Supabase Auth** (email/password). Client uses the anon key + session; the browser
  sends `Authorization: Bearer <access_token>` to protected API routes.
- Server verifies the token via `/auth/v1/user`, then checks the `admins` table for
  role. Authorization is **always** re-checked server-side (never trust the frontend).
- Admin pages/routes are role-gated; RLS enforces row access at the DB layer too.

---

## Storage Structure

- Private Supabase Storage bucket **`scripts`**. The browser uploads the file directly
  to a validated object path, then POSTs the path to `/api/submissions`.
- Object path format: `<digits>-<base36>/<sanitized-filename>` (enforced server-side).
- Reads use short-lived signed URLs. Allowed extensions: pdf, fdx, fountain, docx, txt.
  Max size 25 MiB.

---

## Deployment & Environment

- **Vercel**, `vercel.json` sets `cleanUrls` (so `/admin` serves `admin.html`, etc.).
- **Env vars (Vercel project settings):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `RESEND_API_KEY`. Resend sender domain `sceneone.info` is verified; notifications go
  to `sceneone.info@gmail.com`.
- `js/config.js` holds only client-safe values (Supabase URL, anon key, bucket name).
- Schema changes are applied manually in Supabase (not automated).

---

## Testing Strategy

- **Static/syntax:** `node --check` on changed JS before committing.
- **Manual/preview:** run the local dev server via the Browser pane (launch config
  name `sceneone`, port 4599) and verify visible behavior. Note: serverless functions
  and Supabase auth don't run locally, so login/dashboard/report often can't be fully
  exercised in the sandbox — verify layout/CSS/i18n locally and the server flows on the
  deploy.
- There is no automated test suite; rely on `node --check` + preview verification +
  careful self-review.

---

## Instructions for Future Claude Code Sessions

1. **Respect the buildless vanilla architecture** — no frameworks/bundlers/npm build.
2. **Only push when the user explicitly says "push it."** Verify first.
3. **Keep everything bilingual** via the i18n dictionaries; never hardcode one language
   in the UI, and mind RTL.
4. **Remember `coverage.html` is self-contained** (inline styles + own theme/lang
   script) — shared CSS changes there must be duplicated, not linked.
5. **Server is the source of truth** — validate/authorize in `/api`; never move
   privileged logic or the service-role key into the browser.
6. **For schema/Supabase changes**, hand the user exact SQL to run manually.
7. **The local preview can't run serverless functions or Supabase auth** — plan
   verification accordingly.
8. Match existing code style (ES5-ish browser JS), escape user content, and reuse
   existing helpers and CSS classes.
