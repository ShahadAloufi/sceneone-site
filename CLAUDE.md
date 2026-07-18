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
coverage workspace + report, role-based access, deadlines, and report delivery to
writers. Actively iterating on UX polish and workflow features.

**Recently shipped (2026-07):**
- **Report delivery pivoted** from a client-rasterized PDF (unreliable Arabic) to a
  **hosted, tokenized report link** rendered natively (`report.html` / `/api/report`),
  with a shared renderer (`report-render.js`) and a redesigned bilingual email.
- **IP access logging** — `access_log` + `/api/log-access`; Manage-admins flags
  readers seen from many IPs (shared-account detection).
- **Delivery tracking + tabs** — sends stamp `coverages.delivered_at/by`; readers get
  a **"Delivered by me"** tab, super-admins a **"Deliveries"** oversight tab (with the
  reviewing reader). Both open the hosted report read-only. Delivered submissions
  **leave the main Scripts list** (active pipeline only) and move to the tabs live.
- **Role-gated nav hardened** — tabs set explicitly per role (readers never see Manage
  admins); a **boot loader** so the admin page is never blank during the session check.
- **Dashboard/landing polish** — Pages column, film-type deadlines (feature 15d /
  short 10d), wider scripts table, pricing cards, redesigned writer email.

**Status:** all merged to `main` and deploying via Vercel. **Blocked on the manual
Supabase SQL below**; auth/serverless flows are verifiable only on the deploy.

---

## Tech Stack

- **Frontend:** vanilla HTML + CSS + JavaScript. **No framework, no build step,
  no bundler.** Libraries loaded via CDN `<script>` tags (supabase-js UMD, pdf.js).
- **Backend:** Vercel serverless functions (plain `module.exports` handlers in
  `/api`, native `fetch`, no `package.json`).
- **Database/Auth/Storage:** Supabase (Postgres + RLS, Supabase Auth, Storage).
- **Email:** Resend (verified sender domain `sceneone.info`).
- **Hosting:** Vercel (static + serverless). Repo: `ShahadAloufi/sceneone-site`.
- **Analytics:** Vercel Web Analytics via `<script defer src="/_vercel/insights/script.js">`
  (Vercel's edge serves that path — no npm package, no build). Added to the **public
  pages only** (`index`, `submit`, `about-coverage`, `privacy`, `terms`). Deliberately
  **not** on `report.html` (writer's private tokenized link), `admin.html` or
  `coverage.html` (internal staff tools) — don't add it there.

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
  `review-coverage.js` (staff approve / request-revision + writer email),
  `report.js` (public report data, token-gated), `report-pdf.js` (server PDF).
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
  `status` (`in_progress` | `submitted` | `revision_requested` | `approved`),
  `review_note` (staff revision note), `delivered_at`, `delivered_by` (set
  server-side when the report is sent to the writer).
- **access_log** — `admin_id`, `ip`, `user_agent`, `created_at`. One row per
  dashboard sign-in (written by `/api/log-access`, service role); **super-admins
  only** may read it (RLS). Surfaces possible shared reader accounts.

RLS uses `SECURITY DEFINER` helper functions: `is_admin(uid)` (in admins table),
`is_staff(uid)` (admin/super_admin), `is_assigned(uid, submission_id)` (primary
assignee or co_reader). Coverages: SELECT = staff OR assigned OR status='approved';
INSERT/UPDATE = assigned only.

**Realtime:** the dashboard subscribes to `submissions` and `coverages`. These tables
must be in the `supabase_realtime` publication for live updates to fire.

---

## Business Rules

- **Roles:** `admin`, `super_admin`, `senior_reader`, `junior_reader`. Staff =
  admin/super_admin; readers = senior/junior.
- **Assignment:** a reader claims a script (primary assignee). If the primary is a
  **junior** reader, a **co-reader** slot opens for a second reader.
- **One active assignment (readers):** a reader may **not** claim the **primary** slot
  of a new submission while they still have another primary assignment they haven't
  **handed off** — i.e. its coverage is still `in_progress` / `revision_requested` (or
  not started). Submitting for approval frees them (QC/delivery is out of their hands).
  Enforced authoritatively by the DB trigger `enforce_single_active_assignment()` (a
  `check_violation` raising `READER_HAS_ACTIVE_ASSIGNMENT`); the admin UI mirrors it by
  disabling the "+" claim button. **Co-reader slots are exempt.**
- **Coverage lifecycle (quality-controlled):** `in_progress` (reader drafting) →
  `submitted` (reader hit **"Submit Coverage for Approval"**; locked from reader edits;
  NOT writer-visible) → `approved` (staff signed off, report sent to the writer) OR
  `revision_requested` (staff bounced it back with a required note; reader revises and
  resubmits). **Readers can never send to the writer or self-approve** — the DB trigger
  `enforce_coverage_reader_transitions()` restricts client (reader) writes to
  `in_progress`/`submitted` and locks a submitted/approved coverage. **Only staff
  (admin/super_admin)** approve or request revision, and only via the service-role
  endpoint `/api/review-coverage` (`action: approve | request_revision`). Approval
  stamps `coverages.delivered_at`/`delivered_by` and emails the writer.
- **Coverage access:** the assignee edits while drafting; staff get a read-only view
  plus the review actions when `submitted`; an **approved** coverage is the
  writer-visible report, viewable read-only by any authenticated staff/reader.
- **Writer visibility:** the writer sees the report **only when `status = 'approved'`**
  (`/api/report` and `/api/report-pdf` gate on it; RLS SELECT exposes only `approved`).
- **Dashboard coverage label:** approved → "View report"; submitted → staff "Review
  coverage" / others "Awaiting approval"; revision_requested → assignee "Revise
  coverage" / others "Revision requested"; unassigned → "Awaiting assignment";
  assigned-to-me drafting → "Start/Continue coverage"; claimed-by-another → "In review".
- **Role-specific dashboard:** the main "Submissions" view differs by role.
  **Readers** get the detailed table (assign "+", writer info, open the workspace).
  **Staff (admin/super_admin)** get a **kanban board** — three columns *Awaiting
  assignment / In review / Awaiting approval* with cards (title, deadline badge,
  read-only assignee avatar, action) and **no writer PII** — since they only act on
  review/approval and care about deadlines. Staff also get two full-detail tabs:
  **All submissions** (every script, all columns, coverage→View report) and
  **Deliveries** (approved/delivered only). Readers keep **Delivered by me**;
  super-admins keep **Manage admins**.
- **Report gating:** "Generate report" (preview) needs a 1–5 score on all 7 evaluation
  points; "Submit Coverage for Approval" additionally needs every written section filled.
- **Deadline:** every submission's deadline = `created_at` + the max turnaround for its
  type — **features 15 days, shorts 10 days** (matches the landing-page cards) — shown
  on the dashboard with a color-coded days-left/overdue badge (derived, not stored;
  delivered submissions leave the main list, so no "delivered" badge appears there).
- **Report delivery:** delivery is the side effect of **staff approval** (there is no
  reader "Send to writer" anymore). Approving via `/api/review-coverage` emails the
  writer a **private link** to the hosted report page (`/report?t=<report_token>`,
  Resend). The writer opens it in any browser (native rendering → correct Arabic, no
  account) and can Save-as-PDF (server-generated PDF via `/api/report-pdf`). **Why a
  link, not a PDF attachment:** client-side rasterisation can't reliably render Arabic.
  Approval stamps `coverages.delivered_at` / `delivered_by` (the approving admin), which powers the
  reader's **"Delivered by me"** dashboard tab (readers only) — the scripts they
  reviewed (assignee/co-reader) whose report was sent to the writer — and the
  super-admin **"Deliveries"** oversight tab (all delivered reports + the reviewing
  reader). Once delivered, a submission **leaves the main Scripts list** (which shows
  only the active pipeline: unassigned / in review / submitted-awaiting-approval) and
  appears in those delivery tabs instead. The move happens live (realtime + on
  return to the dashboard).
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
- **Native rendering over rasterization** — the report is delivered as a hosted link
  the writer opens (and can browser-Save-as-PDF), *not* an html2canvas PDF, because
  client-side rasterization can't reliably render Arabic. `report-render.js` is the
  single source of truth for the report, shared by the workspace and the public page.
- **Script file access is per-assignment for readers** (changed from the earlier
  all-staff model): **staff** (admin/super_admin) may download any script for quality
  review; a **reader** may download only a script that is **unassigned** (so they can
  preview before claiming) or that they're **assigned to** (primary or co-reader) — never
  one another reader is working on. Enforced by the Storage RLS policy "staff read all
  scripts, readers read unassigned or their own" via `can_read_script(uid, object_name)`,
  which maps the storage object back to `submissions.file_path`; the dashboard and
  coverage workspace mirror it with a "Locked" label. Still a private bucket +
  short-lived signed URLs. IP monitoring is **passive + flagged, never blocking**
  (`IP_FLAG_THRESHOLD = 4`).
- **"Delivered" means actually sent** (stamped `coverages.delivered_at`), not merely
  a completed coverage.
- **coverage.html / report.html are intentionally self-contained** (own styles +
  no-flash theme/lang script) to avoid a flash of unstyled/wrong-language content.
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

  -- "Delivered by me": stamp the coverage when its report is sent to the writer.
  alter table public.coverages add column if not exists delivered_at timestamptz;
  alter table public.coverages add column if not exists delivered_by uuid references public.admins(id) on delete set null;

  -- Quality-control coverage flow: new statuses + review_note, migrate old data,
  -- writer sees only 'approved', and a trigger that stops readers approving their
  -- own work or editing a locked coverage. Full bodies in supabase/schema.sql.
  alter table public.coverages add column if not exists review_note text;
  alter table public.coverages drop constraint if exists coverages_status_check;
  update public.coverages set status = 'approved'  where status = 'completed' and delivered_at is not null;
  update public.coverages set status = 'submitted' where status = 'completed' and delivered_at is null;
  alter table public.coverages add constraint coverages_status_check
    check (status in ('in_progress','submitted','revision_requested','approved'));

  drop policy if exists "staff+assigned read, everyone reads completed" on public.coverages;
  drop policy if exists "staff+assigned read, everyone reads approved" on public.coverages;
  create policy "staff+assigned read, everyone reads approved" on public.coverages for select
    to authenticated using (
      public.is_staff(auth.uid()) or public.is_assigned(auth.uid(), submission_id) or status = 'approved');

  create or replace function public.enforce_coverage_reader_transitions()
  returns trigger language plpgsql security definer set search_path = public as $$
  begin
    if auth.uid() is null then return new; end if; -- service role (review API) trusted
    if tg_op = 'UPDATE' and old.status in ('submitted','approved') then
      raise exception 'COVERAGE_LOCKED' using errcode = 'check_violation';
    end if;
    if new.status not in ('in_progress','submitted') then
      raise exception 'COVERAGE_FORBIDDEN_STATUS' using errcode = 'check_violation';
    end if;
    new.delivered_at := case when tg_op = 'UPDATE' then old.delivered_at else null end;
    new.delivered_by := case when tg_op = 'UPDATE' then old.delivered_by else null end;
    new.review_note  := case when tg_op = 'UPDATE' then old.review_note  else null end;
    return new;
  end; $$;
  drop trigger if exists trg_coverage_reader_transitions on public.coverages;
  create trigger trg_coverage_reader_transitions
    before insert or update on public.coverages
    for each row execute function public.enforce_coverage_reader_transitions();

  -- Script files are per-assignment for readers: staff read any; a reader reads a
  -- script only if it's unassigned (preview before claiming) or assigned to them.
  create or replace function public.can_read_script(uid uuid, object_name text)
  returns boolean language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from public.submissions s
      where s.file_path = object_name
        and (s.assigned_to is null or s.assigned_to = uid or s.co_reader_id = uid)
    );
  $$;
  drop policy if exists "admins can read scripts" on storage.objects;
  drop policy if exists "staff read all scripts, readers read unassigned or their own" on storage.objects;
  create policy "staff read all scripts, readers read unassigned or their own"
    on storage.objects for select to authenticated
    using (
      bucket_id = 'scripts' and public.is_admin(auth.uid())
      and (public.is_staff(auth.uid()) or public.can_read_script(auth.uid(), name))
    );

  -- One-active-assignment rule (readers freed on SUBMIT, not delivery).
  create or replace function public.enforce_single_active_assignment()
  returns trigger language plpgsql security definer set search_path = public as $$
  declare caller uuid := auth.uid(); caller_role text; active_count int;
  begin
    if new.assigned_to is distinct from old.assigned_to and new.assigned_to = caller then
      select role into caller_role from public.admins where id = caller;
      if caller_role in ('senior_reader','junior_reader') then
        select count(*) into active_count
        from public.submissions s
        left join public.coverages c on c.submission_id = s.id
        where s.assigned_to = caller and s.id <> new.id
          and (c.status is null or c.status in ('in_progress','revision_requested'));
        if active_count > 0 then
          raise exception 'READER_HAS_ACTIVE_ASSIGNMENT' using errcode = 'check_violation';
        end if;
      end if;
    end if;
    return new;
  end; $$;
  drop trigger if exists trg_single_active_assignment on public.submissions;
  create trigger trg_single_active_assignment
    before update on public.submissions
    for each row execute function public.enforce_single_active_assignment();
  ```
- **Confirm the production domain** — report-email links use `https://sceneone.info`
  (`SITE_URL` in `api/review-coverage.js`); update if the live domain differs.
- **Verify on the deploy** (can't run locally): send a report → open the link on
  iPhone/Safari (Arabic, logo, dark banner) → Save-as-PDF; confirm the email renders
  in a real inbox; check the Pages column, film-type deadlines, Manage-admins IP
  flags, and the "Delivered by me" tab after a real send.
- **Optional:** host a dark clapperboard PNG for the email logo (currently a wordmark);
  tune `IP_FLAG_THRESHOLD` once real login data accumulates.

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
- **`POST /api/review-coverage`** — **staff-only** (admin/super_admin); `action:
  "approve"` sets the coverage `approved`, stamps delivery, and emails the writer the
  tokenized report link; `action: "request_revision"` (with a required `note`) sets it
  `revision_requested`. The only path that can approve — readers can't reach it.
- **`GET /api/report?t=<report_token>`** — **public** (the token is the auth); returns
  the report-safe fields (no email/file) of a submission with an *approved* coverage.
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
4. **Remember `coverage.html` and `report.html` are self-contained** (inline styles +
   own theme/lang script) — shared CSS changes there must be duplicated, not linked.
   The report markup itself lives in the shared `js/report-render.js`.
5. **Server is the source of truth** — validate/authorize in `/api`; never move
   privileged logic or the service-role key into the browser.
6. **For schema/Supabase changes**, hand the user exact SQL to run manually.
7. **The local preview can't run serverless functions or Supabase auth** — plan
   verification accordingly.
8. Match existing code style (ES5-ish browser JS), escape user content, and reuse
   existing helpers and CSS classes.
