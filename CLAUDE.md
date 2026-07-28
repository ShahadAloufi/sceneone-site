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
- **Quality-control coverage flow** — reader **Submits for approval** → staff
  **Approve & Send** (emails the writer) or **Request Revision** (required note). The
  writer sees the report only once **approved**. See the Business Rules for the full
  state machine, `/api/review-coverage`, and the DB triggers.
- **Assignment notice window** — claiming a script shows a confirm ("writer notified
  after 2h"), starts a release window, and schedules the writer's "work started" email
  via **Resend scheduled sending**. Readers are told **2h** but the real window is
  **3h** (intentional buffer). No one-active-assignment limit — readers claim freely.
  All claims/releases/reassigns go through `/api/claim-script`.
- **Staff dashboard = kanban** (In review / Awaiting approval) with a **reassign**
  picker; readers keep the detailed table (with a "what I'm working on" filter). Staff
  also get **All submissions** + **Deliveries** full-detail tabs (grouped by month,
  with a month filter). Report delivery is a hosted tokenized link + **server-generated
  PDF** (`/api/report-pdf`, headless Chrome).
- **Per-assignment script access** — a reader may download a script only if it's
  unassigned or theirs (Storage RLS + `can_read_script`); staff download any.
- **Branded emails** (submission confirmation, team notification, report, notice all
  share one shell), **Vercel Web Analytics** on the public pages, turnaround updated
  (feature ≤4 weeks = 28d / short 10–15 = 15d), commercial registration in the footer.

**Built but NOT deployed (as of 2026-07-28)** — 12 commits on local `main`,
`origin/main` untouched, so production still runs the old, unpaid flow:
- **Payment gate** — a submission starts `pending_payment` and is invisible to readers
  until a Moyasar invoice is paid; `/api/payment-webhook` is the only path that may
  mark it paid.
- **Refund handling** — `payment_refunded` pulls an *unclaimed* script to the terminal
  `refunded` status; a refund on a script a reader already holds leaves the assignment
  alone and only flags it, because yanking it mid-draft would destroy their work.
- **Payment state in the dashboard** — Payment column on All submissions (paid /
  awaiting / abandoned after 48h / refunded) and a red "needs a decision" flag on
  refunded-but-still-assigned kanban cards.

**Status:** everything above is committed but unpushed, and the payment-gate SQL has
**not** been applied. The rest of the project is merged, deployed via Vercel, and its
SQL applied. Auth/serverless/email flows are verifiable only on the deploy — and the
payment gate not even there until Moyasar onboarding completes. See Current TODOs for
the deploy sequence; the SQL must land in the same window as the push, SQL first.

---

## Tech Stack

- **Frontend:** vanilla HTML + CSS + JavaScript. **No framework, no build step,
  no bundler.** Libraries loaded via CDN `<script>` tags (supabase-js UMD, pdf.js).
- **Backend:** Vercel serverless functions (plain `module.exports` handlers in
  `/api`, native `fetch`). A **root `package.json` exists only for the two Chromium
  deps** used by `report-pdf.js` (`@sparticuz/chromium`, `puppeteer-core`) — there is
  **no build script**; the frontend is still served static and never bundled.
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
  `about-coverage`, `readers` (public "تعرّف على قصتنا" / about-us + reader
  team page, see below), `privacy`, `terms`.
- **Styles:** single shared `css/styles.css`. Prefix conventions: `adm-` (admin),
  `sub-`/`so-` (submission), `cov-` (about-coverage), `au-` (readers/about-us),
  `.nav` (shared header), `.so-loader` (shared Scene One loader).
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
  `log-access.js` (IP logging), `claim-script.js` (claim / release / reassign + the
  scheduled writer notice), `review-coverage.js` (staff approve / request-revision +
  writer email), `report.js` (public report data, token-gated), `report-pdf.js`
  (server PDF via headless Chrome), `payment-webhook.js` (Moyasar → `paid` / `refunded`).
- **Server modules (`/lib`):** shared server-side code, deliberately **outside
  `/api`** because Vercel turns every file under `/api` into a public route.
  `moyasar.js` (invoice creation + payment lookup), `submission-emails.js` (the
  writer confirmation + team alert, sent from the payment webhook).
- **Schema:** `supabase/schema.sql` is the source of record; **schema changes are
  run manually in the Supabase SQL Editor** (the file is not auto-applied).

Business logic, validation, and privileged operations live server-side in `/api`.
Client JS is UI only; client validation is UX-only and always re-validated server-side.

---

## Public Page: `readers.html` (About Us / Reader Team)

Added 2026-07-26/27. Dark-themed public page ("تعرّف على قصتنا") linked from the
nav overlay on every page as **"من يقرأ نصك؟"**, and from the landing page's
"من يقرأ نصك؟" section link. All styling is in the `.au-*`-prefixed block at the
bottom of `css/styles.css`; markup is `readers.html`.

- **Sections:** full-bleed hero (photo + right-aligned title + quote + thin
  divider) → "عن SCENE ONE" story (3 paragraphs) → "فريق القرّاء" reader cards
  (currently **فجر الفرحان** and **هيفاء السيد** only — a third card, دانيا
  جابر, was removed early on; don't re-add without being asked).
- **Hero structure is easy to get wrong — read this before touching it:**
  - `.au-hero` has `overflow: hidden`. Anything meant to sit *below* the hero
    (the divider `.au-hero__rule`, the quote `.au-hero__quote`) **must live
    outside `<header class="au-hero">` in the DOM**, as siblings after
    `</header>`. Putting them inside and pushing them past the box's bottom
    edge (negative `bottom`, large `margin-top`) just clips them invisible —
    this bit us twice in-session.
  - Desktop hero background is `.au-hero__bg` (`position:absolute`,
    `background-size:cover`), height is a plain `vh` value (currently `80vh`
    — this number has been tuned back and forth several times per feedback,
    don't assume it's final). `background-position` is `center <N>%`;
    increasing `N` crops further into the top of the photo (ceiling truss)
    while keeping the wordmark roughly centered — that's how "zoom"/"crop
    from top" requests were implemented, not by changing hero height.
  - **Mobile (`≤640px`) does not reuse `.au-hero__bg`.** It's a totally
    separate flow: `.au-hero` becomes a flex column, `.au-hero__inner`
    dissolves via `display:contents` (so title/quote inside it can be
    reordered independently), and a dedicated `.au-hero__photo` block (own
    `aspect-ratio`, hidden on desktop) renders the image at full size, no
    crop. Order on mobile: photo → title (overlaid on the photo's dark top
    band) → quote → rule.
  - Hero shade (`.au-hero__shade`) gradient intentionally mirrors the landing
    page's hero gradient (`rgba(0,0,0,.3) → transparent → rgba(14,2,2,.88)`)
    for visual consistency between the two heroes — the bottom stop is a
    *partial-opacity* version of `--bg`, not the bare variable, so the photo
    still shows through slightly; don't make it fully opaque again.
  - The landing page's own readers-section photo (`.readers__bg` on
    `index.html`) got the same top-to-bottom gradient treatment layered onto
    its existing radial/horizontal vignette, for consistency across the site.
- **Assets:** `assets/aboutus-hero.jpg` (cinema/wordmark photo), `assets/reader-1.png`
  (فجر), `assets/reader-2.png` (هيفاء) — both grayscale via CSS filter, sized
  with `object-fit: contain` (not `cover` — an earlier `cover` crop zoomed too
  tightly into هيفاء's photo).
- **"اطلب التغطية" buttons are deliberately disabled** (`.btn--disabled`:
  faded, `pointer-events:none`, `aria-disabled`) on both pricing cards in
  `index.html` — not a bug, a temporary product decision. Markup/href kept
  intact so re-enabling is a one-line class removal.
- **Nav on this page must stay `position:fixed` with a `.au .nav.scrolled`
  rule** (mirrors the landing page's scroll-to-solid nav) — it was briefly
  `position:absolute` with no `.scrolled` style, which made it scroll away
  and never turn solid; don't reintroduce that.

---

## Database Overview

Tables (all with RLS enabled):
- **admins** — `id` (=auth user id), `name`, `email`, `role`, `created_at`.
- **submissions** — script metadata: `created_at`, `title_ar/en`, `email`, `writer`,
  `genre`, `film_type`, `draft`, `duration`, `logline`, `vision`, `ip_registered`,
  `file_path`, `file_name`, `status`, `assigned_to`, `co_reader_id`, `pages`,
  `report_token` (uuid; the unguessable key in the writer's report link),
  `assigned_at` / `notice_email_id` / `writer_notified_at` (the assignment notice
  window — when the claim started, the scheduled Resend email id, and when the writer
  was notified), `payment_invoice_id` / `payment_url` / `payment_amount` / `paid_at`
  (the Moyasar invoice, its hosted checkout URL, the amount quoted in halalas, and
  when payment cleared), `refunded_at`, `confirmation_sent_at` (when the paid
  confirmation + team notification went out — the webhook's send-once key).
  `status` runs `pending_payment` → `paid` → `unassigned` → `in_review`; column
  default is `pending_payment`. The legacy `new` status was backfilled to
  `unassigned` when the payment gate landed.
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

- **Payment gate (payment before assignment):** a script must be paid for before it
  can enter the review pipeline. `/api/submissions` inserts the row as
  `pending_payment` and creates a **Moyasar invoice** (hosted checkout — card data
  never touches our servers), then redirects the writer there. **Only
  `/api/payment-webhook` may mark a submission paid**: it checks the shared secret
  token, then **re-reads the payment from Moyasar's API** rather than trusting the
  posted body, verifies the amount against `payment_amount`, sets `paid` + `paid_at`,
  and immediately releases it into the pool as `unassigned`. Both updates are filtered
  on the current status, so a replayed delivery rewrites nothing. The **emails** are
  keyed off `confirmation_sent_at` instead, not off which update matched a row: the
  release is a second write, and a retry after it fails would otherwise look like a
  duplicate and swallow the confirmation for a payment that really cleared.
  `/api/claim-script` refuses to claim anything that isn't `unassigned`, and the
  dashboard's pipeline list hides `pending_payment` rows (staff still see them under
  "all submissions"). The only email sent before money clears is the **"complete your
  payment" prompt**, which carries the stored `payment_url` so a writer who closes the
  checkout tab can get back to their invoice; it promises nothing about review. The
  writer confirmation and the team alert both fire from the webhook. Prices live in `lib/moyasar.js` (`PRICES`,
  in halalas) and must match the homepage: feature 1200 SAR / short 750 SAR.
- **Refunds (`payment_refunded` → `/api/payment-webhook`):** the same secret-check and
  re-read-from-Moyasar path as a payment, then the disposition depends on whether a
  reader already has the script. **Nobody has it yet** (`unassigned`/`paid`) → pulled
  from the pool into the terminal status **`refunded`**, which can never be claimed
  again because `/api/claim-script` only accepts `unassigned`. **A reader already has
  it** → the assignment is **left completely untouched**; only `refunded_at` is stamped
  and staff get an "ACTION NEEDED" alert to resolve by hand. Yanking a script mid-draft
  would destroy a reader's work, and this is rare by design — the writer is told at the
  3h notice that the submission can no longer be cancelled or refunded. The pull is
  filtered on the pullable statuses, so a claim that lands in the same moment wins and
  the script stays with its reader. `refunded_at` is stamped **either way** (filtered
  `is null`, which is what makes the handler idempotent). Refunds are issued in the
  **Moyasar dashboard** — there is no in-app refund button, on purpose.
- **Where payment state shows up in the dashboard:** the pipeline list and kanban drop
  both `pending_payment` and `refunded` (neither is claimable), so a refunded card on
  the board can only be the still-assigned case — it gets a red **"needs a decision"**
  flag under the title, which is the one thing standing between an unpaid script and a
  reader who keeps working. The **All submissions** tab carries a **Payment** column
  (paid / awaiting payment / abandoned after 48h / refunded, with the amount); the
  Deliveries tab deliberately doesn't, since a delivered report is paid by definition.
  "Abandoned" is only a label — nothing expires an unpaid checkout, **by decision**
  (2026-07-28), not by omission. Expiring them to a terminal status and letting the
  writer resume a stale checkout were both considered and deferred: labelling loses no
  data and answers the only question staff actually had ("who hasn't paid?"). Revisit
  if abandoned rows pile up enough to clutter All submissions. Do **not** add an expiry
  sweep on the assumption it was simply missed.
- **Roles:** `admin`, `super_admin`, `senior_reader`, `junior_reader`. Staff =
  admin/super_admin; readers = senior/junior.
- **Assignment:** a reader claims a script (primary assignee). If the primary is a
  **junior** reader, a **co-reader** slot opens for a second reader.
- **Assignment notice window (told 2h, actually 3h):** claiming a script pops a
  confirm dialog — *"the writer will be notified that you started working after 2
  hours; you can release it before then"* — and starts a grace period in which the
  reader may still release it. **The reader is told 2 hours, but the real window is
  3** — a deliberate hidden buffer. The "2h" figure lives **only** in user-facing
  copy (`claimConfirm` / `releaseHint`); every enforcement point uses **3h**
  (`ASSIGNMENT_WINDOW_MS` in `api/claim-script.js` and `js/admin.js`, and the
  `enforce_assignment_lock()` trigger's `interval '3 hours'`). **Do not "reconcile"
  the two — the mismatch is intentional.** When the window closes the writer is
  emailed that work has started **and that the submission can no longer be cancelled
  or refunded**, and the assignment is locked — staff may hand it to a **different**
  reader, but it can never return to unassigned. Implemented with **Resend scheduled
  sending** (`scheduled_at` at claim time, `POST /emails/:id/cancel` on release)
  rather than a cron job, because Vercel Hobby only runs cron once a day. The writer
  is notified **once per script**: `writer_notified_at` is stamped when the window
  lapses, and a later reassignment sends nothing. All primary claims/releases go
  through `/api/claim-script`; `enforce_assignment_lock()` rejects client-side claims
  outright (`ASSIGNMENT_VIA_API_ONLY`) so the notice can never be skipped, and rejects
  any release once locked (`ASSIGNMENT_LOCKED`). **Co-reader slots have no window and
  no notice.** **No one-active-assignment limit** — readers may claim as many scripts
  as they like.
- **Staff reassignment:** staff (admin/super_admin) get a reader picker on each
  kanban card (`action: "reassign"`). It is the only way to move a locked
  assignment, and deliberately offers **no "unassign"** — once claimed, a script
  always has someone responsible. Reassigning **keeps the original window and
  scheduled notice**: "work started on your script" is still true under a new
  reader, so the writer isn't re-notified and the clock isn't restarted. A
  co-reader is dropped unless the incoming primary is a junior reader.
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
  type — **features 28 days (up to 4 weeks), shorts 15 days (typically 10–15)** — shown
  on the dashboard with a color-coded days-left/overdue badge (derived, not stored;
  delivered submissions leave the main list, so no "delivered" badge appears there).
  These mirror the turnaround promised on the landing-page cards, so "Overdue" means
  the public commitment was missed — **keep `deadlineDays()` and `index.html` in sync.**
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
- **`coverages` is the single source of truth for approval and delivery.**
  `submissions.status` stops at `in_review` and is never advanced to `approved` — the
  dashboard reads `coverages.status` / `delivered_at` instead. Considered and rejected
  (2026-07-28) mirroring approval onto the submission: two columns tracking one fact
  drift apart, and it would mean re-auditing every claim, refund, RLS and trigger
  branch that reads `submissions.status`, all with quiet failure modes. The schema
  comment previously described a pipeline ending in `approved` that no code ever wrote;
  the comment was corrected rather than the code changed.
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
  -- The whole block is idempotent: safe to paste and run in full, any number of
  -- times, whatever has already been applied.
  alter table public.submissions add column if not exists pages int;

  -- Realtime publication (ALTER PUBLICATION ... ADD errors if already present).
  do $$
  begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      if not exists (select 1 from pg_publication_tables
                     where pubname='supabase_realtime' and schemaname='public' and tablename='submissions') then
        alter publication supabase_realtime add table public.submissions;
      end if;
      if not exists (select 1 from pg_publication_tables
                     where pubname='supabase_realtime' and schemaname='public' and tablename='coverages') then
        alter publication supabase_realtime add table public.coverages;
      end if;
    end if;
  end $$;

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

  -- 2-hour assignment window: a reader may release a script they just claimed until
  -- the writer is told work started, after which the assignment is locked.
  alter table public.submissions
    add column if not exists assigned_at timestamptz,
    add column if not exists notice_email_id text,
    add column if not exists writer_notified_at timestamptz;

  create or replace function public.enforce_assignment_lock()
  returns trigger language plpgsql security definer set search_path = public as $$
  declare window_closed boolean;
  begin
    if new.assigned_to is not distinct from old.assigned_to then return new; end if;
    if auth.uid() is null then return new; end if; -- claim API (service role) is trusted
    if old.assigned_to is null and new.assigned_to is not null then
      raise exception 'ASSIGNMENT_VIA_API_ONLY' using errcode = 'check_violation';
    end if;
    -- 3 hours is the REAL window (readers are only TOLD 2h in the dashboard copy).
    window_closed := old.writer_notified_at is not null
      or (old.assigned_at is not null and now() >= old.assigned_at + interval '3 hours');
    if window_closed then
      raise exception 'ASSIGNMENT_LOCKED' using errcode = 'check_violation';
    end if;
    return new;
  end; $$;
  drop trigger if exists trg_assignment_lock on public.submissions;
  create trigger trg_assignment_lock
    before update on public.submissions
    for each row execute function public.enforce_assignment_lock();

  -- No one-active-assignment limit: readers may claim freely. Drop the old trigger.
  drop trigger if exists trg_single_active_assignment on public.submissions;
  drop function if exists public.enforce_single_active_assignment();

  -- Payment gate (payment before assignment). The column was first shipped as
  -- `payment_id`, so rename in place rather than growing a second empty column.
  do $$
  begin
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='submissions' and column_name='payment_id') then
      alter table public.submissions rename column payment_id to payment_invoice_id;
    end if;
  end $$;
  alter index if exists public.submissions_payment_id_idx
    rename to submissions_payment_invoice_id_idx;
  alter table public.submissions
    add column if not exists payment_invoice_id text,
    add column if not exists payment_url text,
    add column if not exists payment_amount int,
    add column if not exists paid_at timestamptz,
    -- Refunds: stamped on every refund; `refunded` status only when unclaimed.
    add column if not exists refunded_at timestamptz,
    -- Claims the paid emails, so exactly one delivery ever sends them.
    add column if not exists confirmation_sent_at timestamptz;
  create index if not exists submissions_payment_invoice_id_idx
    on public.submissions (payment_invoice_id);
  -- Pre-gate rows are grandfathered into the pool; new rows start behind the gate.
  update public.submissions set status = 'unassigned' where status = 'new';
  alter table public.submissions alter column status set default 'pending_payment';
  ```
  ⚠️ **Run this WITH the deploy, not before it.** The currently-deployed
  `api/submissions.js` inserts `status: 'new'` explicitly, so the new default never
  applies to it; the one-time `new → unassigned` backfill above has already passed by
  then, and every submission taken on the old code after the migration would sit at
  `'new'` forever — invisible to the pool and unclaimable (`claim-script` requires
  `unassigned`), with no error anywhere. There is no status check constraint on
  `submissions` to catch it. Apply the SQL, then push, in that order and close together.
- **Payment gate is BUILT BUT NOT DEPLOYED** (as of 2026-07-28). Three commits sit on
  local `main`; `origin/main` is untouched, so production still has the old, unpaid
  flow. Before deploying: (1) run the payment-gate SQL above — the code writes
  `payment_invoice_id` and will fail against a database that still has `payment_id`;
  (2) finish **Moyasar onboarding** (business bank account — it also gates the
  test-environment toggle); (3) check that `MOYASAR_SECRET_KEY` and the registered
  webhook are in the **same** Moyasar environment; (4) ~~rotate
  `MOYASAR_WEBHOOK_SECRET`~~ — **done for test on 2026-07-28**, still owed for live.
  Note the **test secret key was regenerated on 2026-07-28**, which invalidated the
  previous one.
- **Repeat the whole Moyasar setup for live at deploy time.** Everything done so far is
  test-only: (a) regenerate the live secret key, store it in a password manager, and add
  `MOYASAR_SECRET_KEY` scoped to **Production**; (b) list live webhooks — none has ever
  been confirmed to exist; (c) create one (or delete + recreate, there being no update
  endpoint) with a fresh `shared_secret` and
  `events: ["payment_paid","payment_refunded"]`; (d) set that secret as
  `MOYASAR_WEBHOOK_SECRET` scoped to **Production**. The commands are under Deployment &
  Environment.
- ~~Register `payment_refunded` on the Moyasar webhook~~ — **done for test on
  2026-07-28**, as part of the secret rotation (see Deployment & Environment). Still owed
  for live.
- **Verify the payment column against real rows** — it was built against injected sample
  data (the dashboard needs Supabase auth, which the local preview can't run), so the
  badge logic is only proven on the deploy.
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
- **A refund on an already-claimed script is resolved manually** — by design. The
  webhook stamps `refunded_at` and emails staff, but never touches the assignment, so
  someone has to decide whether the reader keeps going. Refunds on *unclaimed* scripts
  are fully automatic.
- **Partial refunds are treated as full ones.** The handler acts on Moyasar's
  `refunded` payment status; the alert email reports the actual refunded amount, but a
  partially-refunded unclaimed script is still pulled from the pool outright.
- The payment gate cannot be exercised locally at all — it needs the deployed
  functions **and** a real Moyasar environment on both ends.

---

## API Structure

All handlers are plain `module.exports = async (req, res) => {...}`, use native
`fetch`, verify the caller's Supabase bearer token, and use the service-role key for
privileged reads/writes.
- **`POST /api/submissions`** — validates + inserts a submission as
  `pending_payment` (service role), creates the Moyasar invoice, stores
  `payment_invoice_id`/`payment_url`/`payment_amount`, and returns `paymentUrl` for
  the browser to redirect to, and emails the writer that same link as a fallback.
  Sends **no confirmation** — see the payment gate in Business Rules.
- **`POST /api/payment-webhook`** — **public**, called by Moyasar (the shared
  `MOYASAR_WEBHOOK_SECRET` is the auth). Re-reads the payment from Moyasar's API
  before trusting anything, then `pending_payment` → `paid` → `unassigned` and sends
  the writer confirmation + team alert. Also handles **`payment_refunded`**: unclaimed
  scripts are pulled to the terminal status `refunded`, claimed ones keep their
  assignment, and either way `refunded_at` is stamped and staff are alerted. Idempotent;
  ignores every other event with a 200 so Moyasar stops retrying. The **only** path
  that may mark a submission paid or refunded.
- **`POST /api/claim-script`** — signed-in reader/staff; `action: "claim"` requires
  status `unassigned` (the payment gate), assigns the caller, sets `in_review`, stamps
  `assigned_at`, and schedules the writer's "work started" email (+3h, Resend
  `scheduled_at`); `action: "release"` (assignee, window still open) cancels that
  email, frees the script and returns it to `unassigned`; `action: "reassign"`
  (**staff only**) hands it to another reader without re-notifying. The only path that
  may claim — a client-side claim is rejected by the DB trigger.
- **`POST /api/review-coverage`** — **staff-only** (admin/super_admin); `action:
  "approve"` sets the coverage `approved`, stamps delivery, and emails the writer the
  tokenized report link; `action: "request_revision"` (with a required `note`) sets it
  `revision_requested`. The only path that can approve — readers can't reach it.
- **`GET /api/report?t=<report_token>`** — **public** (the token is the auth); returns
  the report-safe fields (no email/file) of a submission with an *approved* coverage.
- **`GET /api/report-pdf?t=<report_token>`** — **public**, same token gate; renders the
  live report page to a real PDF with headless Chrome (`@sparticuz/chromium` +
  `puppeteer-core`) and returns it as a download. Needs the `vercel.json`
  `includeFiles` glob, `engines.node` = 20, and `AWS_LAMBDA_JS_RUNTIME=nodejs20.x` set
  before the require — see the comment atop `api/report-pdf.js`.
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
  `RESEND_API_KEY`, `MOYASAR_SECRET_KEY`, `MOYASAR_WEBHOOK_SECRET`. Resend sender
  domain `sceneone.info` is verified; notifications go to `sceneone.info@gmail.com`.
- **Moyasar** keeps **test and live completely separate** — separate keys *and*
  separate webhooks. A `sk_test_` key in Vercel with only a live webhook registered
  means payments succeed but nothing is ever marked paid. The webhook is registered at
  `https://sceneone.info/api/payment-webhook` (POST) and its Secret Token must equal
  `MOYASAR_WEBHOOK_SECRET` exactly, or every delivery 401s.
- **`MOYASAR_SECRET_KEY` is split by Vercel environment** (set 2026-07-28): **Preview**
  holds the `sk_test_` key, **Production** holds `sk_live_`. Production is deliberately
  **unset** until deploy day — nothing deployed reads it yet, and a test key scoped to
  Production would point live checkouts at test Moyasar, where no real money moves. The
  split is also the only realistic way to exercise the payment gate at all, since it
  can't run locally: deploy a preview and it talks to test Moyasar end to end.
- **Test-environment webhook** (rotated 2026-07-28): id
  `47fa5798-8891-4e67-abe1-a7ca10858762`, POST to the URL above, events narrowed to
  `payment_paid` + `payment_refunded`. Its `shared_secret` was regenerated at the same
  time and lives in Vercel as `MOYASAR_WEBHOOK_SECRET`, **Preview** scope. This replaced
  `7901eb37-…` (all 16 events, screenshot-exposed secret), which was deleted.
  **Whether live has a webhook at all is still unknown** — every check so far ran with a
  `sk_test_` key.
- **Inspecting webhooks from the terminal.** `export MOYASAR_SECRET_KEY='sk_...'` (leading
  space keeps it out of `~/.zsh_history`), then
  `curl -s https://api.moyasar.com/v1/webhooks -u "$MOYASAR_SECRET_KEY:"`. The API has
  **no update endpoint** — create, fetch, list, delete only — so changing a webhook's
  events *or* rotating its `shared_secret` means deleting and recreating it.
- **The dashboard's "Secret Key ID" is not the secret key.** It's a ~22-char identifier
  that stays visible forever; the real key is ~48 chars and shown **once**, at
  regeneration. Authenticating with the ID returns "You provided your secret key ID
  instead of the full secret key". Copying the masked field yields literal `*`
  characters, which fail the same way — `printf '%s' "$KEY" | grep -c '[^a-zA-Z0-9_]'`
  returns 0 for a clean value. Vercel can't help either: `MOYASAR_SECRET_KEY` is marked
  **Sensitive** there, meaning non-readable after creation. So a lost key is lost —
  regenerate and store it in a password manager immediately.
- `js/config.js` holds only client-safe values (Supabase URL, anon key, bucket name).
- Schema changes are applied manually in Supabase (not automated).
- **No secrets in the repo.** `.env*` is gitignored — commits are made with
  `git add -A`, so an un-ignored `.env` from `vercel env pull` would carry the Moyasar,
  Supabase and Resend keys into history, where rotating them is the only cleanup. Keys
  live in Vercel env vars and a password manager, nowhere else.

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
