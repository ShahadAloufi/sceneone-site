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
writers. **The payment gate is live and has taken real money** (see below).
Actively iterating on UX polish and workflow features.

**Recently shipped (2026-08-11 → 08-12):**
- **Public-site English support** — `index.html`, `readers.html`, and
  `about-coverage.html` are now fully bilingual (`js/i18n.js`), plus
  `sample-report.html`'s report content (previously Arabic-only regardless
  of its own toggle). `submit`, `privacy`, `terms` still need it. Full
  detail in the "Public-site i18n" section below — read it before touching
  translated copy or the `[dir="ltr"]` CSS mirror.
- **One font per language, site-wide:** Arabic is always Tajawal, English is
  always IBM Plex Sans. `IBM Plex Sans Arabic` is fully removed from the
  codebase after two passes the same day (first unified everything to
  Tajawal, then split it back out once English-reading visitors found
  Tajawal's Latin rendering harder to read). See "Important Design
  Decisions" for the mechanics — it's not just a Google Fonts swap, the six
  self-contained pages and `payment-status.html`'s simultaneous-bilingual
  layout each needed their own fix.
- **Nav bar mirrors fully with the language, logo included** — it used to
  stay LTR always (logo pinned left even in Arabic); now the whole bar
  flips, and the six nav links were reordered (دليل المنصة moved up before
  من يقرأ نصك؟). See "Site Chrome" below.
- A long tail of copy/layout fixes from direct user feedback: em dashes
  removed from several English strings (the site's copy style avoids them),
  the landing hero's partner-association logo now centers over its caption,
  the readers-page hero headline was removed outright, "About SCENE ONE"
  stacks onto two lines and matches "Readers Profile"'s heading size/weight.

**Recently shipped (2026-08-04 → 08-07):**
- **Payment gate LIVE on Moyasar.** A real card payment and a real full refund have
  both run end to end in production. See "the payment gate is fully proven" below and
  the Business Rules for the state machine.
- **Writer level** — required select on the submission form (`writer_level`), shown as
  a **المستوى / Level** column in the readers' table, All submissions and Deliveries,
  and in the coverage workspace's pulled panel.
- **Self-service password reset** for readers/staff on `/admin`, plus the two Supabase
  settings that had made *every* auth email undeliverable (Site URL, custom SMTP).
- **Assignment notice rewritten as a sweep**, fixing a bug where releasing a script
  could still tell the writer work had begun.
- **Site chrome** — inline nav on every page, readers hero rebuilt with a new photo and
  an overlaid wordmark, landing CTAs opened up, VAT line removed from pricing.

**Recently shipped (2026-07):**
- **Quality-control coverage flow** — reader **Submits for approval** → staff
  **Approve & Send** (emails the writer) or **Request Revision** (required note). The
  writer sees the report only once **approved**. See the Business Rules for the full
  state machine, `/api/review-coverage`, and the DB triggers.
- **Assignment notice window** — claiming a script shows a confirm ("writer notified
  after 2h") and starts a release window. The writer's "work started" email is sent by
  a **sweep over scripts still assigned past the window** (`lib/assignment-notices.js`),
  never scheduled ahead — so releasing simply stops it qualifying. Readers are told
  **2h** but the real window is **3h** (intentional buffer). All
  claims/releases/reassigns go through `/api/claim-script`, which also runs the sweep.
- **Claim eligibility (readers only; staff are exempt)** — two rules, both enforced in
  `/api/claim-script` and mirrored in the dashboard so the "+" is disabled with a
  reason rather than failing on click: (1) **junior readers cannot claim
  `professional` / `veteran` writers**; (2) **one active assignment per reader** —
  blocked while they hold any submission (primary *or* co-reader) whose coverage
  isn't `delivered_at`. Submitting for approval does **not** free them; staff approval
  does.
- **Staff dashboard = kanban** (In review / Awaiting approval) with a **reassign**
  picker; readers keep the detailed table (with a "what I'm working on" filter). Staff
  also get **All submissions** + **Deliveries** full-detail tabs (grouped by month,
  with a month filter), and share the **Quality review** tab with lead readers — that
  one is gated on `isReviewer`, not `isStaff`. Report delivery is a hosted tokenized
  link + **server-generated PDF** (`/api/report-pdf`, headless Chrome).
- **Per-assignment script access** — a reader may download a script only if it's
  unassigned or theirs (Storage RLS + `can_read_script`); staff download any; a
  **lead reader** additionally reads a script while quality-reviewing its coverage,
  and only while that coverage is `submitted` (`can_qa_review`).
- **Lead Reader role + Quality review tab** (2026-08-13) — a reader who also does QA
  for other readers' coverages, with per-point review notes on the evaluation. See
  Business Rules for the full boundary; it is **not** part of `is_staff()`.
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

**Status (updated 2026-08-13): all of the above is live.** The payment gate shipped,
its SQL was applied 2026-07-28, and the whole flow was re-validated end to end on
2026-08-11 with production taking real money. Everything through the Lead Reader role
and per-point review notes is pushed to `origin/main` and its SQL applied
(2026-08-13). Auth/serverless/email flows remain verifiable **only on the deploy** —
the local preview runs neither — so any new work touching them still lands with SQL
first, then the push, in the same window.

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
  `theme.js`, `i18n.js` (public-site AR/EN — `index`, `readers`, `about-coverage`;
  `submit`/`privacy`/`terms` still Arabic-only; see "Public-site i18n" below),
  `main.js` (landing), `submit.js` (submission form + PDF page count),
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
  writer confirmation + team alert + **reader "new assignment available" broadcast**
  + refund alert + unreconciled-payment alert, all sent from the payment webhook;
  the payment prompt from `/api/submissions`). The reader broadcast
  (`sendReaderNotice`) BCCs every `senior_reader`/`junior_reader` once the script
  reaches the pool, and deliberately names neither the script nor the writer —
  eligibility is decided in the dashboard, not the inbox.
- **`READER_NOTICE_TEST_TO` — sandbox-only override.** When set, the reader
  broadcast goes to that single address with **no bcc** (the real list is dropped,
  not hidden) and a `[TEST]` subject prefix. The reader lookup still runs and logs
  its count, so a sandbox payment still proves the query finds the right people
  without emailing them. **Preview scope ONLY — never set it on Production:** with
  it set, real readers silently stop being told about new scripts, and the only
  trace is a `console.warn` in the function logs.
  **Proven in the 2026-08-11 sandbox run:** a full test payment produced
  `[TEST] تكليف جديد متاح` at the single override address, with the real readers
  suppressed — the first time the broadcast had ever run against real data. Remove the
  variable when the run finishes.
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
  divider) → "عن SCENE ONE" story (3 paragraphs) → "فريق القرّاء" reader cards.
  **Three cards, in this order: ود القبلان (Lead Reader) → هيفاء السيد → فجر
  الفرحان** (Wid added 2026-08-13). An earlier fourth card, دانيا جابر, was
  removed long before that — don't re-add it without being asked.
  The grid is **3 columns**, stepping to 2 below 1200px and 1 below 900px.
  Wid's photo (`assets/reader-3.png`) is a **transparent-background PNG** so it
  blends into the dark page; the other two are opaque crops.
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
  - The landing page once carried its own "من يقرأ نصك؟" section with a matching
    gradient over `.readers__bg`. **That section was removed 2026-08-11** —
    markup, `.readers*` CSS and `assets/readers-printer.jpg` all went with it.
    The nav's «من يقرأ نصك؟» has always pointed at `/readers`, so the page is
    still reachable; nothing on the landing page links to it now.
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

### The hero (rebuilt 2026-08-06)

- **Photo: `assets/aboutus-hero-v2.jpg`** — 1672×941 (16:9). It replaced a
  2200×1916 near-square image. **The shape is the whole story:** in a
  full-width band, `cover` decides how much survives by height alone, so the
  old photo showed only ~39% at 55vh with the lighting truss clipped and the
  audience gone. Fourteen commits on 2026-07-27 tried to fix that by moving
  `background-position` — they were redistributing the same 39%. The 16:9
  photo at **80vh** loses only ~11%. Showing the old one whole would have
  needed ~139vh.
- **`.au-hero__mark` is the SCENE ONE wordmark as an overlay**, not baked into
  the photo (the previous hero had it burned in, which is why cropping hurt).
  It stays crisp at any size and the crop can never cut it.
  - **Placement is derived from the image, not eyeballed.** `cover` centres
    the photo, so the image's centre always lands on the hero's centre; the
    screen's centre sits at 45.5%/54.7% of the image. The crop is width-driven
    at these proportions, so the displayed height is 0.563 × the hero width —
    hence `left: 45.5%` and `top: calc(50% + 2.6vw)`. **Only change these if
    the photo changes.**
  - **`opacity: .6`**, so it reads as projected onto the screen.
    `mix-blend-mode: multiply` at ~.85 is the noted alternative — it picks up
    the screen's shading instead of fading evenly.
  - **Do NOT use `mix-blend-mode: screen`.** It was the first attempt at
    removing the source PNG's black background and it washed the letters out:
    screen lifts blacks toward white, and the mark sits on the brightest part
    of the photo. The black was **keyed out** instead by flood-filling from the
    image border, so the clapperboard detail *inside* the letters survives
    while the surround became transparent.
- **Mobile uses a 4:3 crop, deliberately not the source's 16:9.** Full width at
  16:9 gives a ~210px strip where the title and the wordmark collide; 4:3 trades
  some sides for the height the old near-square photo used to provide. The mark
  is placed against the photo box directly there (`left: 43%; top: 50%; width:
  40vw`) because the mobile crop is height-driven, unlike desktop's.

---

## Site Chrome: Nav & Landing CTAs (2026-08-06/07)

- **Inline nav links in the bar on every page** (`.nav__links`), replacing a
  site where every destination was hidden behind the hamburger. Six items, in
  this order (**reordered 2026-08-12**, دليل المنصة moved up before من يقرأ
  نصك؟): الرئيسية · Scene One · دليل المنصة · من يقرأ نصك؟ · رحلة النص ·
  تواصل معنا. The bar (`.nav__links`) and the hamburger's overlay
  (`.overlay__links`) list the same six in the same order on every page that
  has this nav — keep them in step if the order ever changes again.
- **Breakpoint is 1000px.** Above it the links show and **the hamburger is
  hidden** — every destination is already in the bar, so it would only open an
  overlay of the same six. Below it the links hide and the overlay carries them.
  The overlay's list is kept **in step with the bar's**; changing one without
  the other means phone and desktop visitors see different menus.
- **The group sits beside the hamburger/lang-toggle end of the bar, not next
  to the logo** — hugging the logo strands «الرئيسية» mid-bar with a dead gap.
  ~~The reference design's logo always stayed physically left~~ — **changed
  2026-08-11**: `.nav` itself now mirrors with the language (`direction: rtl`
  by default, `html[dir="ltr"] .nav { direction: ltr }`), so the *whole bar*
  reads right-to-left in Arabic — logo on the right, links flowing from
  there, the lang toggle + hamburger on the far left — and left-to-right in
  English, logo included. Not just the links text; the earlier version kept
  the logo pinned left in both languages, which is what this replaced.
- **No letter-spacing on the links.** Arabic is cursive and it pulls joined
  letters apart; applying it to «Scene One» alone would leave that one item
  looking unlike its neighbours.
- **Hrefs differ by page on purpose:** `index.html` uses in-page anchors
  (`#about`), every other page uses the root-prefixed form (`/#about`) so the
  links work from anywhere.
- **`.landing section[id] { scroll-margin-top: 112px }`** — the bar is fixed at
  104px, so without it any in-page jump lands with the section heading tucked
  underneath. `scroll-behavior: smooth` is already global on `<html>`; no JS.
- **Landing hero buttons:** «عرض التغطيات» → `#coverage-types` (was «سجل
  اهتمامك» opening the registration modal), and «دليل المنصة» → `/about-coverage`.
  **Registration is no longer in the hero or any menu** — it survives only via
  the `#register` banner further down and `/?register`. Deliberate, but it is a
  real drop in prominence; revisit if sign-ups fall.

---

## Public-site i18n (2026-08-11 → 08-12)

The public site was Arabic-only until now. `js/i18n.js` adds English, following
the same dict + `data-i18n` + `applyLang()` pattern already used by
`js/admin.js`/`js/coverage.js`, but with its **own storage key**
(`sceneone-lang`) so a visitor's language choice never collides with a staff
member's admin-panel language pref (`sceneone-admin-lang`).

- **`index.html`, `readers.html`, `about-coverage.html` done; `submit`,
  `privacy`, `terms` still Arabic-only** — same dict/attribute pattern, just
  not done yet. Don't assume the toggle exists on every page.
- **`data-i18n-doctitle` on `<title>`** names the dict key for that page's
  translated `<title>` (e.g. `readers.html` uses `docTitleReaders`); pages
  that don't opt in keep the landing page's title as a fallback. **Read
  `d` (the dict) via `dict()` before this line, not after** — an earlier
  version referenced `d` before its `var d = dict();` line, which threw and
  silently aborted the rest of `applyLang()` (dir flipped, nothing else did)
  on any page with the attribute set. Caught testing `readers.html`, fixed
  2026-08-11.
- **`data-i18n`** swaps `textContent`; **`data-i18n-html`** swaps `innerHTML`
  (for the handful of strings carrying a `<br>` or `<strong>` — the dict values
  are hardcoded translator-authored copy, never user input, so this is safe);
  **`data-i18n-alt`**/**`data-i18n-ph`**/**`data-i18n-aria`** cover `alt`,
  `placeholder`, `aria-label`; **`data-i18n-src`** swaps the whole `src`.
  All five are read from `T.ar`/`T.en` in `js/i18n.js` and applied by the
  same `applyLang()`.
- **The three "cards" images have their headline + paragraph baked into the
  PNG** (photo composited with rendered text at design time), not HTML
  overlay — so translating them means swapping the whole file via
  `data-i18n-src`, not swapping text. Each has an `-en` twin at the same
  crop/size: `card_writers.png` ↔ `card_writers-en.png`, same for
  `_producers`/`_cinema`. If the Arabic photo/crop/copy ever changes, the
  English asset has to be regenerated to match — nothing enforces the two
  staying in sync.
- **`html[dir="ltr"]` CSS mirror block** at the very end of `css/styles.css`.
  The Arabic layout hardcodes `direction: rtl` / `text-align: right` per
  section (never inherited from `<html dir>`), so flipping the language
  needed an explicit override for every one of those declarations — nav
  links, hero, quote, about, partnership, coverage cards, journey timeline,
  banner, FAQ, footer links, modal, toast, and the overlay menu's info/links
  columns. The `[dir="ltr"]` attribute selector outranks the plain class it
  overrides, so unlike the rest of this file, source order doesn't matter for
  this block — but keep it as one block so the two directions stay diffable.
  **Deliberately not mirrored:** the hero's photo gutter and the red banner's
  clapperboard image position — those are composition choices, not reading
  direction, and swapping them is a bigger visual redesign out of scope for
  this first pass.
- **`main.js` has its own small `MSG` dict** (`ar`/`en`) for the five strings
  it generates at runtime — the submit button's "Sending…" state and the two
  registration toasts — because those never exist as DOM text for
  `data-i18n` to find until JS builds them. Reads the current language off
  `document.documentElement.lang`, which `i18n.js` keeps in sync.
- **`.footer__copy` keeps its inline `dir="rtl"`** in the Arabic markup
  (explained in its own HTML comment: `.footer__row` is LTR, which would
  otherwise scramble the Arabic around the Latin "SCENE ONE"). `applyLang()`
  flips that one element's `dir` attribute directly — CSS can't reach it,
  since it's a hardcoded attribute, not a class.
- **Email/phone inputs in the register modal** used to be inline
  `style="text-align:right"` — inline styles beat any CSS override, so
  language-switching couldn't reach them. Replaced with a
  `.field__input--email` class (still right-aligned by default) that the
  `[dir="ltr"]` block flips to left for English.
- **Toggle UI:** a `.lang-toggle-group` pill in the nav (desktop + mobile) and
  a second copy in the hamburger overlay (`.lang-toggle-group--overlay`),
  each holding two static `.lang-btn[data-lang="en"|"ar"]` buttons. **Changed
  2026-08-12 from a single button that swapped its own text** to both
  languages always visible, the current one highlighted via `.active` — a
  visitor shouldn't have to infer what "EN" on the button actually means
  (the language it's in, or the language it switches to). Each button's own
  click handler calls `applyLang(this.dataset.lang)` directly; `applyLang()`
  just toggles which one carries `.active`, it doesn't touch their text.
- **`readers.html` reuses the shared nav/overlay/footer dict keys** (`navHome`,
  `overlayTag`, `footerCopyHtml`, etc. — same ones `index.html` uses) and adds
  its own page-only keys for the "About SCENE ONE" story and the two reader
  bios (`auAboutLabelWord`, `auAboutP1`–`P3`, `auTeamTitle`, `haifaName`/
  `haifaRole`/`haifaBio`, `fajrName`/`fajrRole`/`fajrBio`). Its own
  `html[dir="ltr"]` mirror block sits right after the landing page's, covering
  `.au-about__label`/`__body`, `.au-team__title`, and the card text.
  `.au-about__inner`'s grid-column layout is left alone — the label stays
  next to its body, a composition choice independent of reading direction
  (same policy as the landing page's hero gutter and the red banner's
  clapperboard). **`.au-about__inner`/`.au-cards` themselves DO get an
  English margin override** (`margin: 0 auto 0 0`), added 2026-08-12 — both
  blocks were still pinned to the *right edge of the page* in English (only
  their own internal text had flipped), which read as backwards even with
  the label-next-to-body composition preserved.
  **The hero title (`.au-hero__title` / `auHeroTitleHtml`) is gone —
  removed 2026-08-12 on request.** `.au-hero__row` is now an empty spacer
  div; the hero is just the background photo and the SCENE ONE wordmark.
  Don't resurrect the old `.au-hero__row` flex-end/flex-start mirroring notes
  from earlier in this file's history — they described a title that no
  longer exists.
  **`.au-about__label` picked up three more changes, all 2026-08-12:**
  stacked onto two lines (a literal `<br>` between the word span and "SCENE
  ONE" span in the markup, not a CSS trick — `data-i18n` only replaces the
  first span's `textContent`, so the `<br>` survives language swaps), sized
  to match `.au-team__title`'s `clamp(34px, 5vw, 56px)` instead of a flat
  25px, and set to `font-weight: 700`. Also fixed a real bug the same day:
  the mobile stacked layout (`max-width: 900px`) sets
  `text-align: right` on the label unconditionally with no `[dir="ltr"]`
  counterpart, so English stayed right-aligned below 900px even after the
  desktop fix landed — the desktop-only text-align override was never
  ported to `.au-about__label` itself (only `.au-about__body p` got one).
  Fixed by adding `text-align: left` to the existing
  `html[dir="ltr"] .au-about__label` rule instead of leaving it
  direction-only.
- **`about-coverage.html` also reuses the shared nav/overlay/footer keys**,
  plus its own for the hero tags, all four content sections, the four
  "aspects" (`covAspect1Html`–`4Html`, each `<strong>N. Label:</strong> body`
  via `data-i18n-html`), the three PASS/CONSIDER/RECOMMEND grade bodies (the
  labels themselves — "PASS" etc — are never translated, same in both
  languages by design), and the TOC. Its footer previously built the
  Arabic-only-reasoning `dir="rtl"` and the `.footer__links` row from inline
  `style` attributes rather than the shared classes `index.html`/`readers.html`
  use — switched to the `footer__copy` class and dropped the inline
  `direction:rtl` so both are reachable by the same generic handler and CSS
  mirror instead of a page-specific one.
  **`.cov`'s single `direction: rtl → ltr` flip is enough to swap the
  main-content/TOC column order** — `.cov-wrap` is an unordered flexbox, and
  flexbox resolves its main axis from `direction`. What that flip does
  *not* reach: the TOC's own physical `border-right`/`padding-right`/`right`
  offset (its active-item bar and rule), fixed regardless of direction, so
  after the column swap they'd sit on the wrong edge unless mirrored
  explicitly — see the `.toc` rules in the `[dir="ltr"]` block.

---

## Database Overview

Tables (all with RLS enabled):
- **admins** — `id` (=auth user id), `name`, `email`, `role`, `created_at`.
- **submissions** — script metadata: `created_at`, `title_ar/en`, `email`, `writer`,
  `genre`, `film_type`, `draft`, `writer_level`, `duration`, `logline`, `vision`, `ip_registered`,
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
  `review_note` (reviewer's overall revision note), `review_comments` (jsonb:
  per-evaluation-point notes, `{ "<point>": "<note>" }`), `delivered_at`,
  `delivered_by` (set server-side when the report is sent to the writer).
  `review_note` and `review_comments` are both **pinned in the reader trigger** —
  the reader's resubmit passes through it, so without that they could blank or
  forge the reviewer's feedback.
- **access_log** — `admin_id`, `ip`, `user_agent`, `created_at`. One row per
  dashboard sign-in (written by `/api/log-access`, service role); **super-admins
  only** may read it (RLS). Surfaces possible shared reader accounts.

RLS uses `SECURITY DEFINER` helper functions: `is_admin(uid)` (in admins table),
`is_staff(uid)` (admin/super_admin), `is_assigned(uid, submission_id)` (primary
assignee or co_reader), `is_lead_reader(uid)`, and `can_qa_review(uid, sub_id)`
(lead, **not** the assignee, and the coverage is `submitted`). Coverages:
SELECT = staff OR assigned OR can_qa_review OR status='approved';
INSERT/UPDATE = assigned only — **a reviewer can never write the coverage row**,
which is why every review action goes through `/api/review-coverage` on the
service role.

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
- **Writer level (`writer_level`)** — required select on the submission form, four
  values ordered least → most experienced: `new` / `emerging` / `professional` /
  `veteran`. Deliberately **evidence-based** ("لم يُنتج لي عمل بعد", "أفلام قصيرة
  منتجة", "عمل منتج أو مشارك في مهرجانات", "أعمال طويلة أو جوائز") rather than a bare
  مبتدئ/متوسط/محترف self-rating, so two writers choosing the same level mean roughly
  the same thing and a reader can actually calibrate on it.
  `emerging` originally read "أفلام قصيرة أو **ورش كتابة**" — changed 2026-08-04
  because attending a workshop is something anyone can sign up for, so it sat oddly
  beside a produced short and let two very different writers pick the same level.
  **Every tier is now a production credit**, which makes the ladder read cleanly:
  nothing produced → shorts produced → produced or festival work → features or
  awards. Known trade-off, accepted deliberately: a writer with a finished but
  unproduced feature has to choose `new`. If that starts reading as dismissive, the
  fix is the wording of `new`, not adding a non-credit back into `emerging`. It exists to set
  the coverage's **depth and tone** — it is **not** a quality score, does **not**
  affect price, and does **not** gate acceptance; the form says so under the field.
  That is also why the dashboard badge uses a neutral palette instead of the
  payment column's green/amber — a red or green level would read as a verdict on
  the writer. Shown as a **المستوى / Level** column right after the writer's name in
  the readers' scripts table, All submissions, and Deliveries. The allowlist lives in
  `WRITER_LEVELS` (`api/submissions.js`); labels are duplicated in `submit.html`
  (long, writer-facing), `js/admin.js` (`LEVEL` short + `LEVEL_TIP` tooltip) and
  `lib/submission-emails.js` (`LEVEL_AR`, team notification) — **add a level in all
  four or the column falls back to the raw key.** The column is nullable and
  pre-field rows render an em dash.
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
- **The published refund policy (`terms.html`, rewritten 2026-08-19)** — the writer-facing
  contract, and it now states all three cases the code actually implements: a **full
  refund before the script is assigned** to a reader, **no refund once it is assigned and
  work has begun**, and a **full refund within 14 business days if the platform can't
  deliver**. It replaced "no refund after the reading has commenced", which was silent on
  the before-assignment case. **Keep it in step with two things:** the "work has started"
  email (`lib/assignment-notices.js`), which is where the writer is actually told the
  window has closed, and the webhook's full-refund-only assumption below. A **50%
  post-assignment refund was drafted and dropped the same day** — it would have been a
  partial refund, which the webhook drops as a `status_mismatch` and never reflects in
  the DB, so the policy would have promised something the code cannot do.
- **A Moyasar event the webhook can't act on emails the team** (`sendUnreconciledAlert`).
  Three paths reach it: the re-read payment's status contradicts the event
  (`status_mismatch`), the payment carries no invoice id or metadata and no row
  matches it (`unmatched`), or the amount paid differs from the quoted
  `payment_amount` (`amount_mismatch`). Each answers **200** — no retry would fix
  any of them, and Moyasar retries only on non-2xx — which is exactly why the email
  matters: without it, Moyasar has moved money the database doesn't reflect and the
  only trace is a Vercel log. `amount_mismatch` is the one that strands a writer, who
  has paid but stays behind the gate. Resolve by hand in the Moyasar dashboard. A
  malformed event carrying no payment id at all is logged only — there is nothing to
  reconcile it against.
- **Refunds are full or nothing — partial refunds are not part of the policy**, and the
  published terms say so too (see the bullet above). The
  handler assumes a refund is for the whole amount: it pulls an unclaimed script to
  the terminal `refunded` status, which would be the wrong outcome for, say, a 100 SAR
  goodwill refund on a 1200 SAR feature — the script dies for a writer who paid almost
  all of it. Nothing external can produce a partial refund; it only exists if a human
  types a smaller amount into the Moyasar dashboard, so the policy closes the gap
  instead of code. Moyasar's docs, checked 2026-07-28, state "the payment status
  changes to `refunded`" under **full** refund only and say nothing about the status
  after a partial one, so the handler's behaviour in that case is unverified as well as
  unwanted. **If this policy ever changes, the webhook has to change first** — accept
  `payment_refunded` when the re-read payment is `paid` with a non-zero `refunded`
  amount (today it is dropped as a status mismatch), and gate the pull on the refund
  covering the full quoted `payment_amount`.
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
- **Roles:** `admin`, `super_admin`, `lead_reader`, `senior_reader`, `junior_reader`.
  Staff = admin/super_admin; readers = lead/senior/junior.
- **Lead Reader (`lead_reader`) — a reader with ONE extra power, not a junior admin.**
  It is deliberately **absent from `is_staff()`**, and must stay that way: `is_staff`
  is what opens "All submissions", "Deliveries", the kanban board, admin management,
  reassignment, and unrestricted coverage/script access. A lead gets none of those.
  What they get instead:
  - **Quality review.** They approve or bounce coverages written by *other* readers,
    which is the same `/api/review-coverage` path staff use (same writer email, same
    `delivered_by` stamp). Admins keep the action too — a lead **replaces** them in
    routine QA rather than locking them out.
  - **Their own coverages**, claimed from the same pool as any reader, with the same
    one-active-assignment limit. They are **senior-equivalent** for claiming: no
    special case exists anywhere in `api/claim-script.js`, because only
    `junior_reader` is level-restricted or opens a co-reader slot.
  The whole boundary is **`can_qa_review(uid, sub_id)`**: true only when the caller is
  a lead, is **not** that script's assignee, and the coverage is in **`submitted`**.
  It gates both the coverage body and the script file (`can_read_script`), so a lead's
  view of another reader's script **opens when they submit and closes on approval** —
  there is no standing window. `js/admin.js` filters the QA queue the same way, but
  that is UI convenience; RLS is the real gate.
  - **A lead's own coverage skips QA entirely and is delivered by them.** Their submit
    button reads "Send Coverage to Writer" and calls `review-coverage` directly
    (`selfDeliver` branch), so it never enters `submitted` and never appears in
    anyone's queue. **This is the one delivery path with no second pair of eyes** —
    a deliberate trust decision (2026-08-12), not an oversight. A lead can never
    QA-review their own work either way: `can_qa_review` excludes assignees, and the
    API refuses `request_revision` on the self-deliver path. If this ever needs
    reversing, make `selfDeliver` set `submitted` instead and let staff approve it.
- **Per-point review notes (`coverages.review_comments`).** A reviewer can attach a
  note to an individual **evaluation point** on top of the one overall `review_note`.
  Each point shows a collapsed "Add comment" link; clicking it reveals a box for that
  point alone. **The synopsis and the verdict deliberately have none** — the boxes are
  built inside the `EVAL` loop in `js/coverage.js` and nowhere else, so there is no
  second list to keep in sync. The reader sees each note read-only under the exact
  point it is about when the coverage comes back.
  Two things follow from RLS, and neither is optional:
  - **Nothing is saved until "Request Revision" is clicked.** The reviewer is not the
    assignee and the row is locked while `submitted`, so they cannot write it at all;
    the whole set rides along with the revision request and the API persists it.
    **Known cost:** notes typed and then abandoned are lost. Fixing that needs a
    separate reviewer-scoped endpoint, deliberately not built.
  - **Keyed by the canonical English point name** (`"Hook"`, not the Arabic label), so
    a note written in Arabic still lands against the right point for a reader viewing
    in English. Do not key these off the translated label.
  Approving clears them (`null`), mirroring `review_note`. The payload is
  browser-supplied and is rendered back into the reader's workspace, so
  `sanitizeComments()` caps the count/key/body length and drops non-strings.
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
  reader, but it can never return to unassigned.
  **Implemented as a SWEEP, not a scheduled email** (`lib/assignment-notices.js`):
  nothing is queued at claim time and nothing is cancelled on release. The sweep
  emails scripts that are *still assigned* once `assigned_at` is older than the
  window, claiming each row with an UPDATE filtered on `writer_notified_at is null`
  **and** `assigned_to is not null` **and** the cutoff — so a reader who releases
  between the SELECT and the UPDATE loses the row and no email goes out.
  `writer_notified_at` is stamped immediately **before** sending, so two concurrent
  sweeps can't double-email; the trade is that a Resend failure after a successful
  stamp drops that one notice instead of retrying, which is the safer way round.
  It is **not** inferred from elapsed time anywhere — doing that would mark a script
  notified and make the sweep skip it, so the writer would never hear anything.
  **This replaced Resend scheduled sending** (`scheduled_at` at claim, `POST
  /emails/:id/cancel` on release), which shipped a real bug: the cancel was
  best-effort and its failure only logged, so a release could leave the email queued
  and the writer would be told work had begun — and their refund window closed — for
  a script sitting back in the pool. A reassign followed by a release orphaned it the
  same way.
  **Triggers:** `/api/claim-script` runs the sweep on every claim/release/reassign
  (readers hit it constantly, so notices land within minutes of falling due), plus
  `/api/send-notices` daily via Vercel Cron as a backstop for quiet stretches.
  **Vercel Hobby caps cron at once per day — a more frequent expression fails
  deployment** — which is why the piggyback exists at all; on Pro the cron could be
  the sole trigger. Sending *late* is harmless (the reader's cancellation window only
  widens); sending *early* would be damaging and is impossible, since the cutoff is
  enforced in both the query and the claiming UPDATE. The writer is notified **once
  per script** — a later reassignment leaves `assigned_at` alone, so the notice still
  fires at the original window's end and never twice. All primary claims/releases go
  through `/api/claim-script`; `enforce_assignment_lock()` rejects client-side claims
  outright (`ASSIGNMENT_VIA_API_ONLY`) so the notice can never be skipped, and rejects
  any release once locked (`ASSIGNMENT_LOCKED`). **Co-reader slots have no window and
  no notice.**
- **Claim eligibility** is enforced **in `/api/claim-script`, not the DB.** That is
  sufficient for PRIMARY claims precisely because `enforce_assignment_lock()` already
  rejects client-side ones (`ASSIGNMENT_VIA_API_ONLY`), so the API is the only way in.
  Two rules, readers only (staff exempt):
  - **Junior readers cannot claim `professional` / `veteran` writers**
    (`RESTRICTED_LEVELS` in claim-script.js; mirrored as `JUNIOR_BLOCKED_LEVELS` in
    admin.js). Rejects 403 `JUNIOR_LEVEL_RESTRICTED:`.
  - **One active assignment per reader** — any submission where they are
    `assigned_to` **or** `co_reader_id` and the coverage has no `delivered_at`.
    Rejects 409 `READER_HAS_ACTIVE_ASSIGNMENT:`. Both messages carry that leading
    marker so `js/admin.js` swaps in localised copy instead of echoing the Arabic.
  - ⚠️ **Co-reader claims bypass both rules**: `assignCo()` writes `co_reader_id`
    straight through the Supabase client, never touching `/api/claim-script`. Holding
    a co-reader slot *counts against* the limit but taking one is not itself gated.
    Deliberate for now — gating it could deadlock the junior-mentorship pairing when
    every senior is busy.
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
- **Deadline: the clock starts at `writer_notified_at`, NOT `created_at`** (changed
  2026-08-10). Deadline = `writer_notified_at` + the max turnaround for the type —
  **features 28 days (up to 4 weeks), shorts 15 days (typically 10–15)** — shown as a
  colour-coded days-left/overdue badge (derived, never stored; delivered submissions
  leave the main list, so no "delivered" badge appears there).
  `writer_notified_at` is stamped only when the "work has started" email actually goes
  out, i.e. once the release window has closed and the reader is locked in — which is
  exactly what the landing-page card promises: *"سيتم احتساب مدة التسليم بعد اسناد نصك
  الى احد القراء وستصلك رسالة عبر الايميل حين الاسناد."*
  Deliberately **not** `created_at` (would charge readers for however long a script sat
  unclaimed in the pool) and **not** `assigned_at` (inside the release window the reader
  can still drop it, so there is no commitment to miss yet). Until it is stamped the
  badge reads **"لم تبدأ بعد" / "Not started"** (`.adm-due--idle`, dashed + neutral —
  it is not a warning state) with the due date shown as `—`.
  All of this lives in `deadlineParts()` in `js/admin.js`, the single source for both
  the table cell and the kanban badge. Still mirrors the public promise, so "Overdue"
  means the commitment was missed — **keep `deadlineDays()` and `index.html` in sync.**
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
- **Post-delivery Q&A:** the report email's second button ("طلب توضيح/ استفسار حول
  التقرير") sends the writer to `/ask?t=<report_token>`. Submitting stores a
  `report_questions` row and emails the **assigned reader** (+ co-reader, + the Scene
  One inbox) a link to `/answer?q=<answer_token>`, where the reader types the reply;
  saving emails it to the writer. Both ends are **token-gated, no sign-in** — the same
  model as the report itself. `answer_token` is deliberately separate from
  `report_token` so forwarding a reply link never exposes the report. Answering is
  **one-shot** (see `/api/answer-question`); a link that's already been answered
  renders the thread read-only instead of a fresh form.
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
- **Internal links use the clean, root-relative path — never `.html`, never relative.**
  `cleanUrls` means `/privacy.html` 308-redirects to `/privacy`, so the `.html` form
  costs an extra round trip on every click. Relative links (`readers.html`) work only
  from whichever directory the linking page happens to sit in. So:
  - `/privacy` · `/terms` · `/about-coverage` · `/readers` · `/submit` · `/admin`
  - with a query string too: `/coverage?id=…` · `/report?t=…`
  - the writer's report link is built server-side as `SITE_URL + "/report?t=…"`
    (`api/review-coverage.js`) — keep it that way; it is the one link that reaches
    paying customers.
  All 17 remaining `.html` links were converted on 2026-08-07: 12 footer links across
  the six public pages, and 5 in `js/admin.js`.

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
- **Font is one-per-language site-wide, settled 2026-08-12: Arabic is always
  Tajawal, English is always IBM Plex Sans.** (Briefly unified everything to
  Tajawal earlier the same day; superseded by this once English-reading
  visitors found Tajawal's Latin rendering harder to read than a dedicated
  Latin face.) `IBM Plex Sans Arabic` — previously used for headings on the
  marketing pages and for everything on the six self-contained pages — is
  gone from the codebase entirely; grep for it before assuming it's still
  around.
  - **Marketing pages** (link `css/styles.css`): `--font-body`/`--font-head`
    both default to Tajawal on `:root`; `html[dir="ltr"] { --font-body:
    'IBM Plex Sans'; --font-head: 'IBM Plex Sans'; }` swaps both the moment
    `js/i18n.js` flips the page to English. One rule covers every element
    site-wide because custom properties re-resolve wherever `var()` is used,
    not just where they're declared.
  - **Self-contained pages** (`coverage`, `report`, `sample-report`, `ask`,
    `answer`, `payment-status` — no `css/styles.css`, own inline `<style>`)
    each carry their own copy: `--font: 'Tajawal'...` on `:root`,
    `html[dir="ltr"] { --font: 'IBM Plex Sans'... }` beneath it. Google Fonts
    `<link>` on every page (all 13) requests both families now.
  - **`payment-status.html` is the one exception to the `html[dir]` pattern**
    — it shows Arabic and English *simultaneously* (`#ar-body` + `#en-body`),
    never toggles `<html dir>`. A custom property set on an ancestor doesn't
    reach a descendant's already-inherited `font-family`, so `[dir="ltr"]`
    there sets `font-family` directly (not through `--font`) to reach
    `#en-body` specifically.
  - Marketing pages' Tajawal request grew a `600` weight
    (`Tajawal:wght@400;500;600;700`) because headings use `font-weight:600`
    and, unlike before, headings now actually render in Tajawal for Arabic —
    without it the browser would silently substitute the nearest loaded
    weight instead of true Tajawal SemiBold.
- **⚠️ THE TWO REPORT PAGES SET DIFFERENT BASE FONT SIZES** — `report.html` is
  **16px**, `coverage.html` is **21px** — while `report-render.js` emits the *same*
  markup into both. So **any element the report CSS doesn't give an explicit
  `font-size` renders at two different scales**, and looks wrong in at least one.
  This produced three separate "the text is too big" reports on 2026-08-05, all the
  same root cause: the logline (`.logline > div`), the synopsis (`.rep-sec > p`, §01)
  and the verdict text (`.verdict > p`) were all bare elements inheriting the page
  base. Every paragraph the renderer emits now has an explicit size (13.5px/1.62,
  matching `.rep-item p`) **in both files** — the rules are duplicated, so keep them
  in step. **If you add markup to `report-render.js`, give it a size.**
- **The coverage workspace's pulled panel distinguishes prose from fields.**
  `.meta-grid .v` is 20px for the short scannable values; the two long-form rows
  (الملخص المختصر / رؤية الكاتب) carry a `prose` flag from `renderPulled` and drop to
  15px. Keyed on `.prose`, **not `.full`** — the script title is full-width too and
  must keep its size.
- **Recurring CSS pitfall: a media query above a base rule loses to it.** Equal
  specificity means source order decides, so `@media (max-width: 768px) { .x { … } }`
  placed *before* `.x { … }` never applies. Hit twice on 2026-08-05/06 — the
  submission card's narrow-screen padding had been silently dead (mobile was using
  desktop padding), and the desktop `.menu-btn { display: none }` didn't take. Both
  now sit **after** their base rules with a comment saying why.
- **Renaming an asset is the only reliable way to retire a cached one.** The readers
  hero photo was first replaced in place, so returning visitors kept serving the old
  cached file — which still had SCENE ONE burned in — *underneath* the new overlay,
  showing the wordmark twice. Caught locally before it shipped. Hence
  `aboutus-hero-v2.jpg`. Same applies to any image whose content changes.
- **Writers have no accounts** — all writer interaction is the public form + email.
- **Deadline is derived** from `created_at` (no stored deadline column) so it can't
  drift.
- **i18n via JS dictionaries** and `data-i18n` / `data-i18n-ph` / `data-i18n-title`
  attributes; `applyLang()` (admin) and `applyUILang()` (coverage) swap text +
  `dir`/`lang`. Language persists in `localStorage` key `sceneone-admin-lang`.

---

## Current TODOs

- **Public-site i18n covers `index.html`, `readers.html`, and
  `about-coverage.html`; `submit`, `privacy`, `terms` still need it**
  (2026-08-11/12) — same `data-i18n` + `[dir="ltr"]` treatment, see
  "Public-site i18n" above for the pattern and pitfalls (especially the
  `dict()`-before-use ordering bug).
  ~~The three coverage-type card images have their body copy baked into the
  PNG~~ — **done 2026-08-11**, English exports (`card_*-en.png`) swapped in
  via `data-i18n-src`.
  ~~`sample-report.html`'s report content was Arabic-only regardless of its
  toggle~~ — **done 2026-08-12**: `sampleSubmission_AR/EN` and
  `sampleCoverage_AR/EN` now carry a full parallel translation (logline,
  synopsis, all seven evaluation notes, market analysis, strengths/to-develop,
  verdict), and `applyLang()` picks the matching pair. This page has its own
  toggle (`sceneone-report-lang` in localStorage, a `.langseg` control) —
  separate from `js/i18n.js` and `sceneone-lang`, since it's one of the
  self-contained pages.
- ~~Set the Supabase Site URL / redirect allow-list~~ and ~~configure custom SMTP~~ —
  **both done 2026-08-04.** See the auth notes below; left here only as a pointer,
  since together they were why no reader could ever reset a password.
- ~~Set `CRON_SECRET`~~ — **done 2026-08-04**, confirmed by `/api/send-notices`
  answering 401 rather than 500 to an unauthenticated call. **Still worth one glance:**
  check a Vercel log around 06:00 (Hobby cron has ±59 min precision) shows
  `{"ok":true,"sent":N}` and not a 401. If it 401s the daily backstop is silently dead
  and nobody would notice, because the piggyback in `/api/claim-script` keeps working.
- **Hero photo resolution.** `assets/aboutus-hero-v2.jpg` is 1672×941 — a **1.72×
  upscale** on a Retina screen at 1440 wide, so it renders soft. If a larger export
  turns up (~2880 wide) it is a drop-in swap; only the mobile `aspect-ratio` needs a
  look if the shape differs. Rename it again (`-v3`) rather than replacing in place.
- ~~Internal links using the `.html` form~~ — **all converted 2026-08-07.** See the
  clean-URL rule under Coding Standards.
- **The "work started" notice is now Arabic-only.** Its English half was dropped with
  the 2026-08-06 rewrite. The payment confirmation and the coverage report are still
  bilingual, so that email is the odd one out — decide which way they should all go.
- **Registration lost prominence 2026-08-07.** It is no longer in the hero or any menu;
  only the `#register` banner and `/?register` remain. Watch sign-ups.
- ~~Test the refund path~~ — **done 2026-08-05, on live Moyasar.** A full refund of the
  1 SAR payment on `9ad52050-…` took the `pulled` branch exactly as designed: status →
  terminal **`refunded`**, `refunded_at` stamped, `paid_at` preserved, and the staff
  alert **"Refunded - script pulled from the queue"** arrived. **Every path in the
  payment gate has now executed for real.**
  **Still never exercised:** a refund on a script a reader has already CLAIMED — the
  branch that leaves the assignment untouched and sends the "ACTION NEEDED" alert
  instead. That is the expensive case (a reader keeps drafting a script the writer was
  paid back for), and testing it needs a claimed script, so it will realistically only
  be proven the first time it happens. Watch for that email.
- ~~Clean up the smoke test~~ — **done 2026-08-05.** `submissions` and `coverages` were
  emptied and the `scripts` bucket cleared, so **the next row to appear is a real
  writer**. Note `delete from submissions` does NOT remove the uploaded file: Storage is
  a separate system and `file_path` is just text, so deleting rows orphans the PDFs.
  Find orphans with:
  ```sql
  select o.name, o.created_at from storage.objects o
  where o.bucket_id = 'scripts'
    and not exists (select 1 from public.submissions s where s.file_path = o.name);
  ```
  Delete those through the **Storage UI**, not SQL — removing rows from
  `storage.objects` can leave the file in the backing store.
- **Clear Haifa's `access_log` rows** if the "⚠ 4 IPs" badge is still showing. The flag
  was accurate — her account was being shared — but she has her own password now, so
  the history is noise. Nothing gates on it; it is a dashboard badge only.
- ~~**Run these once in the Supabase SQL Editor**~~ — **all applied as of 2026-08-13**,
  including the Lead Reader block and `review_comments` + its trigger. Kept here as the
  canonical record of the schema: the block is idempotent, so re-run it whenever you
  need to confirm a database matches the code (a fresh project, or after a restore).
  Anything **new** still gets appended here and run before the deploy that needs it:
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

  -- Post-delivery Q&A between the writer and the assigned reader.
  -- Also in supabase/schema.sql §6.
  create table if not exists public.report_questions (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references public.submissions(id) on delete cascade,
    reader_id uuid references public.admins(id) on delete set null,
    answer_token uuid not null unique default gen_random_uuid(),
    question text not null,
    answer text,
    created_at timestamptz not null default now(),
    answered_at timestamptz
  );
  create index if not exists report_questions_submission_idx
    on public.report_questions (submission_id, created_at desc);
  create index if not exists report_questions_answer_token_idx
    on public.report_questions (answer_token);
  alter table public.report_questions enable row level security;
  drop policy if exists "staff+assigned read report questions" on public.report_questions;
  create policy "staff+assigned read report questions" on public.report_questions for select
    to authenticated using (
      public.is_staff(auth.uid()) or public.is_assigned(auth.uid(), submission_id)
    );
  grant select on public.report_questions to authenticated;
  grant all on public.report_questions to service_role;

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

  -- The one-active-assignment limit is NOT a DB trigger. It was one, was dropped,
  -- and is now enforced in /api/claim-script instead (safe because
  -- enforce_assignment_lock() already blocks client-side primary claims). Keep
  -- these drops: re-creating the trigger would double-enforce and break the
  -- co-reader path, which is intentionally ungated.
  drop trigger if exists trg_single_active_assignment on public.submissions;
  drop function if exists public.enforce_single_active_assignment();

  -- Writer's self-declared experience level (required on the submission form).
  -- MUST be applied before the code that writes it deploys, or every insert fails
  -- on an unknown column.
  alter table public.submissions add column if not exists writer_level text;

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

  -- Lead Reader role: a READER with one extra power (quality review). Deliberately
  -- NOT added to is_staff() — every staff-gated policy must keep excluding it.
  alter table public.admins drop constraint if exists admins_role_check;
  alter table public.admins add constraint admins_role_check
    check (role in ('admin','super_admin','lead_reader','senior_reader','junior_reader'));

  create or replace function public.is_lead_reader(uid uuid)
  returns boolean language sql security definer stable set search_path = public as $$
    select exists (select 1 from public.admins where id = uid and role = 'lead_reader');
  $$;

  -- The whole Lead security boundary: read access to a coverage (and its script
  -- file) opens only while that coverage is 'submitted' — i.e. actually awaiting
  -- review — and never for the lead's own assignment.
  create or replace function public.can_qa_review(uid uuid, sub_id uuid)
  returns boolean language sql security definer stable set search_path = public as $$
    select public.is_lead_reader(uid)
       and not public.is_assigned(uid, sub_id)
       and exists (select 1 from public.coverages
                   where submission_id = sub_id and status = 'submitted');
  $$;

  drop policy if exists "staff+assigned read, everyone reads approved" on public.coverages;
  create policy "staff+assigned read, everyone reads approved" on public.coverages for select
    to authenticated using (
      public.is_staff(auth.uid())
      or public.is_assigned(auth.uid(), submission_id)
      or public.can_qa_review(auth.uid(), submission_id)
      or status = 'approved');

  create or replace function public.can_read_script(uid uuid, object_name text)
  returns boolean language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from public.submissions s
      where s.file_path = object_name
        and (s.assigned_to is null or s.assigned_to = uid or s.co_reader_id = uid
             or public.can_qa_review(uid, s.id))
    );
  $$;

  -- Per-point review notes: { "<evaluation point>": "<note>" }. Written ONLY by
  -- /api/review-coverage (service role) with a revision request, and cleared on
  -- approval — the reviewer can't write the row themselves (RLS restricts
  -- coverage writes to the assigned reader).
  alter table public.coverages add column if not exists review_comments jsonb;

  -- Pin it in the reader trigger exactly like review_note, or the reader could
  -- blank the reviewer's notes when they resubmit the revised coverage.
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
    new.review_comments := case when tg_op = 'UPDATE' then old.review_comments else null end;
    return new;
  end; $$;
  ```
  ⚠️ **Run this WITH the deploy, not before it.** The currently-deployed
  `api/submissions.js` inserts `status: 'new'` explicitly, so the new default never
  applies to it; the one-time `new → unassigned` backfill above has already passed by
  then, and every submission taken on the old code after the migration would sit at
  `'new'` forever — invisible to the pool and unclaimable (`claim-script` requires
  `unassigned`), with no error anywhere. There is no status check constraint on
  `submissions` to catch it. Apply the SQL, then push, in that order and close together.
- **Payment gate and writer level are DEPLOYED** (2026-08-04, `main` at `1fddb9d`).
  Moyasar onboarding was approved the same morning; live key and live webhook
  `8353cb62-d412-4120-b6be-0cfcae7b863e` (→ `https://sceneone.info/api/payment-webhook`)
  are registered, `MOYASAR_SECRET_KEY` + `MOYASAR_WEBHOOK_SECRET` are set at
  **Production** scope, both migrations are applied, and the post-push backfill has
  been run. Post-deploy checks: the webhook route answers **401** to a bad token —
  which also proves the Production env vars are visible, since a missing one returns
  500 — and `/submit`, `/payment-status`, `/` all serve 200.
- **The payment gate is fully proven on live Moyasar (2026-08-04/05).** A real card
  payment moved `pending_payment → paid → unassigned` with `paid_at` and
  `confirmation_sent_at` stamped and both emails delivered; a full refund the next day
  moved it to terminal `refunded` with `refunded_at` stamped and the staff alert
  delivered. The **one branch still unexercised** is a refund on a script a reader has
  already claimed — see Current TODOs.
- **Testing with a smaller amount, without touching `PRICES`.** Editing the price
  constants would mis-charge any real writer who submits during the window. Instead:
  submit normally, create a 1 SAR invoice by hand
  (`POST /v1/invoices` with `callback_url` set to the production `/payment-status`),
  then repoint the row — **both** `payment_invoice_id` and `payment_amount`, or the
  webhook's amount guard rejects the payment as a mismatch. Everything downstream then
  runs exactly as it would for a real writer.
- **Deploy-day lesson: three stacked env-var faults, each masking the next** (all on
  2026-08-04, all surfaced from Vercel's runtime **Logs**, none guessable from the
  writer-facing error): (1) the Production `MOYASAR_SECRET_KEY` held a key that had
  since been regenerated — every regeneration invalidates the last, so **regenerate
  once and update Vercel immediately**; (2) a remove-then-add landed the variable on
  the wrong scope, so it was absent entirely (`MOYASAR_SECRET_KEY is not configured`
  rather than a 401 — the two errors distinguish *missing* from *wrong*); (3) the
  pasted value didn't match what worked in curl. Transfer with
  `printf '%s' 'KEY' | pbcopy` and paste, never retype. **Every fix needs a redeploy**
  — env vars are baked in at build time. Symptom throughout: the submission form
  returns `تعذّر بدء عملية الدفع` and inserts an orphan `pending_payment` row.
- **The sandbox is retired.** Webhook `356c6eea` (→ preview) was deleted when the live
  one was created, because the registry is account-wide (see above) and leaving it
  registered would have sent real payment events to a preview sitting behind Vercel
  Authentication. To test in the preview again: turn Vercel Authentication off, delete
  the production webhook, create one pointing at the branch alias — and put it back
  afterwards. Never leave both registered.
- **What the sandbox run actually proved (2026-07-28).** Two test submissions paid with
  `4111 1111 1111 1111` on the preview: invoice created and `payment_invoice_id` /
  `payment_amount` stored; Moyasar delivered `payment_paid` unaided; the row moved
  `pending_payment → paid → unassigned`; `paid_at` and `confirmation_sent_at` stamped;
  **both** emails (writer confirmation + team notification) arrived. Test 1 needed a hand
  replay because its build predated the env fixes — test 2 ran untouched, which is the
  run that proves delivery and the registered secret. **Still unexercised:** refunds,
  every `unreconciled` branch, and anything on the live Moyasar environment.
- Before deploying to production: (1) ~~run the payment-gate SQL~~ **done 2026-07-28**;
  (2) check that `MOYASAR_SECRET_KEY` and the registered webhook are in the **same**
  Moyasar environment; (3) ~~rotate `MOYASAR_WEBHOOK_SECRET`~~ — **done for test on
  2026-07-28**, still owed for live. Note the **test secret key was regenerated on
  2026-07-28**, which invalidated the previous one.
- **Moyasar TEST mode works today — onboarding gates LIVE only.** An earlier note here
  claimed the business bank account also gated the test environment; that was wrong and
  it held the sandbox up. Verified 2026-07-28 by creating a test invoice from the
  terminal with the `sk_test_` key (`POST /v1/invoices`, 1 SAR) — it came back
  `status: initiated` with a real `checkout.moyasar.com` URL. Test webhook management
  with the same key had already been working, which was the clue. So the sandbox can be
  exercised now; the bank account is only needed for `sk_live_` and settlement.
- **The test webhook points at PRODUCTION, which is wrong for sandbox testing.** Webhook
  `47fa5798-…` POSTs to `https://sceneone.info/api/payment-webhook`, but the `sk_test_`
  key and `MOYASAR_WEBHOOK_SECRET` are **Preview**-scoped and production still runs the
  pre-gate code — that route 404s there, and a preview never sees the delivery. Before
  the sandbox run: push the gate to a **non-`main` branch** (main deploys to production),
  take the branch's stable preview alias, then **delete and recreate** the test webhook
  against `<preview-url>/api/payment-webhook` — the API has no update endpoint. Also set
  **`SITE_URL` in Preview scope** to that URL: it defaults to `https://sceneone.info`
  (`api/submissions.js`), so the Moyasar `callback_url` would otherwise bounce test
  payers to production's non-existent `/payment-status`. Check `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` are Preview-scoped too.
- **The sandbox run needs the payment SQL, and there is only ONE Supabase project** — so
  migrating for the preview migrates production. **Chosen 2026-07-28: accept that, and
  hold the `main` push until the bank account is ready.** Applying the SQL early is safe
  for the live code, verified rather than assumed: the deployed `/api/claim-script`
  gates on **`assigned_to`** (null = claimable) and never reads `submissions.status`,
  and the deployed `admin.js` status checks are all against `coverages.status`. So
  `submissions.status` is **inert in production today** — the new columns and the
  rename are unused there, the backfill is a no-op for behaviour, and the new
  `pending_payment` default never applies because the old code inserts `'new'`
  explicitly.
- **THEREFORE, at push time: re-run the backfill AFTER pushing `main`.**
  ```sql
  update public.submissions set status = 'unassigned' where status = 'new';
  ```
  Every submission taken during the waiting window lands at `'new'`, and the push is the
  moment `'new'` stops being understood — that is when those rows go invisible and
  unclaimable, not before. The line is idempotent, and running it *after* the push is
  what matters: run it before and anything arriving in between is missed.
- **Sandbox test data lands in the production database.** The preview writes real rows
  into the live Supabase project, and once paid in test mode they enter the reader pool
  where readers can claim them. Use obviously-fake titles, run it outside reading hours,
  and delete the rows afterwards.
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
- **Upload the Scene One logo in the Moyasar dashboard** — the hosted checkout shows a
  grey "company logo" placeholder today (seen on a test invoice 2026-07-28; the API
  returns `logo_url: .../default-logo.png`). It is the one screen in the flow we don't
  style, and the writer reaches it straight from a fully branded submission form, so an
  unbranded page there reads as a redirect to the wrong site — on a payment page, that
  costs conversions. **Dashboard setting, no code.** Do it for **both** the test and
  live environments; like keys and webhooks, they're configured separately.
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
- **`/api/questions`** — **public** (tokens are the auth); the whole post-delivery
  Q&A. Three behaviours in **one function** — see the function-count note below.
  - `GET ?q=<answer_token>` — the thread for the reader's reply page. Returns the
    title only, never the writer's email.
  - `POST { t: <report_token>, question }` — the writer asks. Same gate as
    `/api/report` (approved coverage only), capped at 10 per submission. Inserts a
    `report_questions` row and emails the assigned reader (+ co-reader, + the Scene
    One inbox) a link to `/answer?q=<answer_token>`.
  - `POST { q: <answer_token>, answer }` — the reader replies. **One-shot**: the
    PATCH is conditioned on `answer=is.null`, so a double-submit or a forwarded link
    can't overwrite a sent reply or email the writer twice. Emails the answer to the
    writer (cc the Scene One inbox).
  - The POST branch is chosen by which token is present; sending both is a 400
    rather than a guess.
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
- **Password reset (self-service, added 2026-08-04).** "Forgot your password?" under the
  sign-in button calls `resetPasswordForEmail` with the email already typed in the form
  (no second prompt), `redirectTo: <origin>/admin`. The reply is **identical whether or
  not the address has an account** — a different message would let anyone enumerate who
  holds a reader account. Supabase mails a link back to `admin.html` carrying a recovery
  token; supabase-js exchanges it for a **real session**, which is why `boot()` checks
  for recovery **before** deciding what to render: otherwise the link would silently
  sign the reader in and never offer them a password, defeating the email. Recovery is
  detected two ways — the `type=recovery` marker read off `location.hash` at script
  start (supabase-js consumes the hash once it exchanges the token) and the
  `PASSWORD_RECOVERY` auth event. A recovery URL with no valid session means an expired
  or already-used link, and says so rather than showing a form that cannot work. On
  success the existing session carries straight into the dashboard — no second sign-in
  with the password just chosen.
- **Two Supabase dashboard settings this depends on — both were wrong, and together
  they meant no reader could ever reset a password. Fixed 2026-08-04.**
  1. **Authentication → URL Configuration.** Site URL must be `https://sceneone.info`,
     with `https://sceneone.info/**` in the Redirect URLs allow-list. It sat on the
     default `http://localhost:3000`, so **every auth email was dead on arrival** —
     recovery, invite and confirmation links all build from that setting. That is how
     a reader got a recovery link pointing at localhost.
  2. **Authentication → Emails → SMTP Settings** (NOT Project Settings, and not under
     Add-ons). Supabase's built-in mailer **only delivers to members of the Supabase
     project** and is capped at ~2/hour — so a reader who isn't in the Supabase org
     never receives anything, with no bounce and no error anywhere. Now on **Resend
     SMTP**: `smtp.resend.com:465`, username `resend`, password = a Resend API key
     (a separate key from the one in Vercel, so rotating either doesn't silently break
     the other), sender `no-reply@sceneone.info`. Custom SMTP also raises the cap to
     30/hour, adjustable under Authentication → Rate Limits.
  **If an invited reader ever says they got no email, check these two first** — the
  symptom is silence, not an error.

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
  **The `.html` form still resolves, but via a 308 redirect** — so linking it costs
  every visitor an extra round trip. Every internal link was converted on 2026-08-07;
  see the rule under Coding Standards.
- **⚠️ HARD CAP: 12 Serverless Functions per deployment (Hobby plan).** Every `.js`
  file under `/api` is one function — **the count, not the traffic, is what fails the
  build**, with `No more than 12 Serverless Functions can be added to a Deployment on
  the Hobby plan`. The project sits at **11** (2026-08-08), so there is **one slot
  left**. Adding a feature that needs several endpoints means **folding them into one
  handler** that branches on method/payload, the way `api/questions.js` carries the
  whole writer↔reader Q&A (GET thread + POST ask + POST answer). This bit once: the
  Q&A shipped as three files, hit 13, and failed the production build. Check
  `find api -name '*.js' | wc -l` before adding to `/api`.
- **Env vars (Vercel project settings):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `RESEND_API_KEY`, `MOYASAR_SECRET_KEY`, `MOYASAR_WEBHOOK_SECRET`, **`CRON_SECRET`**
  (Vercel Cron sends it as `Authorization: Bearer`; `/api/send-notices` fails closed
  without it — an open endpoint there would let anyone force notices out early and
  close writers' refund windows). Resend sender
  domain `sceneone.info` is verified; notifications go to `sceneone.info@gmail.com`.
- **Moyasar keys are per-environment, but the WEBHOOK REGISTRY IS ACCOUNT-WIDE.**
  Verified 2026-08-04: a `sk_live_` key listed webhook `356c6eea`, which had been
  created with the `sk_test_` key. An earlier note here claimed test and live keep
  separate webhooks — that was wrong and it is a dangerous thing to get wrong. It
  means **every registered webhook receives events from both environments**, so a
  webhook pointing at a preview URL will be sent real, live payment notifications.
  Distinguish them by the `live` boolean in the webhook payload, not by which
  webhook received it. **Re-confirmed 2026-08-10**, more directly: the Live and Test
  dashboard views list the *same single webhook* — identical URL and identical
  `created_at`, both "Showing 1 of 1". **The Live/Test toggle does not filter
  webhooks at all**; it only filters the data views (Invoices, Payments,
  Settlements). So it makes no difference which toggle position you are in when you
  add one. The webhook for production is registered at
  `https://sceneone.info/api/payment-webhook` (POST) and its Secret Token must equal
  `MOYASAR_WEBHOOK_SECRET` exactly, or every delivery 401s.
- **Cross-environment deliveries are handled in code, so BOTH webhooks may safely be
  registered at once** (added 2026-08-10, replacing the old "only one webhook at a
  time" rule — that rule pre-dated production taking real money, and following it now
  would mean *deleting the production webhook to run a sandbox test*, which strands
  every real payment made during the test window).
  `api/payment-webhook.js` compares the re-fetched `payment.live` against what its own
  `MOYASAR_SECRET_KEY` implies (`sk_live_` prefix) and returns **200
  `ignored: wrong_environment`** on a mismatch — 200 rather than an error so Moyasar
  stops retrying; a wrong-environment event is not a failure, it is simply not ours.
  **Why this is more than log hygiene:** production and preview share ONE Supabase. If
  production could read a test payment it would match the invoice, mark the submission
  paid, release it to the pool and email the REAL readers — and `READER_NOTICE_TEST_TO`
  is Preview-scoped, so it would not protect them. Guarded with `typeof` so an absent
  `live` flag never blocks a genuine payment (**fails open**). **Exercised for real on
  2026-08-11:** production received the sandbox payment event alongside the preview and
  ignored it, so both webhooks could stay registered throughout and real payments were
  never at risk.
- **`MOYASAR_SECRET_KEY` is split by Vercel environment** (set 2026-07-28): **Preview**
  holds the `sk_test_` key, **Production** holds `sk_live_`. A test key scoped to
  Production would point live checkouts at test Moyasar, where no real money moves. The
  split is also the only realistic way to exercise the payment gate at all, since it
  can't run locally: deploy a preview and it talks to test Moyasar end to end.
  **Production key CONFIRMED LIVE 2026-08-10** (launch day). It was set 2026-08-04 and
  could not be read back to check (Sensitive vars are write-only in Vercel — both the
  dashboard and `vercel env pull` return the literal `[SENSITIVE]`). Verified
  **behaviourally instead**: submitted a script through production `/submit`, stopped at
  checkout without paying, and the invoice (`4af117e67cec`, SAR 1,200, description
  `Scene One coverage — …`) appeared in Moyasar's **Live** invoice list. A `sk_test_`
  key cannot create a Live invoice, so that is conclusive. **Re-use this check after any
  key rotation** — it is the only way to confirm a Sensitive key's environment, and the
  failure it catches is silent: with a test key everything looks normal end to end
  (checkout, webhook, emails) while no money ever arrives.
- **Test-environment webhook** (recreated 2026-07-28): id
  `356c6eea-128f-40b8-8608-ba96a3953bbe`, POST to
  `https://sceneone-site-git-payment-gate-scene-one.vercel.app/api/payment-webhook`,
  events `payment_paid` + `payment_refunded`. Its `shared_secret` is in Vercel as
  `MOYASAR_WEBHOOK_SECRET`, **Preview** scope. It replaced `47fa5798-…`, which pointed
  at **production** — wrong for a sandbox run, since the test key is Preview-scoped and
  production still runs the pre-gate code. Before it, `7901eb37-…` (all 16 events,
  screenshot-exposed secret).
- **LIVE webhook CONFIRMED 2026-08-10** (launch day), replacing the earlier "whether
  live has a webhook at all is still unknown". Moyasar → Settings → Webhooks with the
  **Live Environment** toggle ON shows **exactly one** (`Showing 1 of 1`): POST to
  `https://sceneone.info/api/payment-webhook`, events `payment_paid` +
  `payment_refunded`, created 2026-08-04 — the same day `MOYASAR_WEBHOOK_SECRET` was
  added at Production scope, which is why deliveries authenticate rather than 401. The
  old preview-alias webhook is gone from the Live list. **This is the single most
  destructive thing to get wrong:** pointed anywhere else, a writer pays, sees "تم
  استلام الدفع", and nothing else ever happens — no confirmation, and not even an
  `unreconciled` alert, because the function never runs. Nothing sweeps stuck
  `pending_payment` rows, so it is invisible on both sides. Re-check after any change.
- **The sandbox rig (validated end to end 2026-07-28).** Branch `payment-gate` → Vercel
  **Preview**, reached at the stable branch alias
  `sceneone-site-git-payment-gate-scene-one.vercel.app` (pattern:
  `<project>-git-<branch>-<team>`). Use the alias, never the per-deploy hash URL — the
  hash changes on every push and would break the registered webhook. Three things have
  to be true for a sandbox run, and all three bit us in order:
  1. **Vercel Authentication OFF.** Standard Protection 302s every request to
     `vercel.com/sso-api`, so Moyasar's POST never reaches the function. Settings →
     Deployment Protection → the **Require Log In** toggle (none of the dropdown options
     make previews public). **Turn it back ON after testing** — with it off, the public
     preview `/submit` writes into the *production* database.
  2. **`SITE_URL` set at Preview scope** to the alias. It does not exist otherwise and
     the code falls back to `https://sceneone.info`, so `callback_url` sends test payers
     to production's non-existent `/payment-status`. Confirmed by reading `callback_url`
     back off the created invoice.
  3. **`MOYASAR_WEBHOOK_SECRET` must match, and a redeploy must finish before paying.**
     Env vars are baked in at build time, so a payment made against a build that predates
     the change hits the old secret and 401s. Editing a **Sensitive** var did not take —
     remove the entry and add it fresh. Copy with `printf '%s' "$SECRET" | pbcopy` so no
     trailing newline sneaks in; the compare is `timingSafeEqual` and length-checks first.
  Redeploy via `git commit --allow-empty && git push` on the branch — the dashboard's
  Redeploy dialog offers the deployments of whichever branch you opened it from, which is
  `main` by default and silently gives you a preview of the pre-gate code.
- **Re-validated end to end 2026-08-11**, this time with production live and taking real
  money. Full run: preview `/submit` → test card → webhook → `paid` → `unassigned` →
  all four emails. Additions and corrections from that run:
  - **`payment-gate` is now just a pointer, fast-forwarded from `main` per run.** Do NOT
    roll it back to the "known good" July commit: you would be testing code that is not
    in production, and `READER_NOTICE_TEST_TO` would not exist, so the broadcast would
    hit every real reader. Fast-forward, run, done.
  - **Register BOTH webhooks — never re-point the production one.** The old "one webhook
    at a time" rule is obsolete (see the account-wide entry above); deleting the live
    webhook to run a sandbox strands every real payment made during the window.
  - **`READER_NOTICE_TEST_TO` at Preview scope is mandatory**, or the sandbox payment
    emails every real reader about a fake script.
  - **`vercel ls` after pushing — pushed is not deployed.** A push to `main` produced no
    Production build at all: `payment-gate` pointed at the identical SHA and had already
    built as a Preview, and Vercel appears to have de-duplicated. Production silently
    stayed on the previous commit. Caught by checking what production was actually
    serving, fixed with an empty commit. **Always verify the deployment, not the push.**
  - **The protection toggle has a separate Save button**, and the browser will lie to you
    about whether it took (you are logged into Vercel, so the preview loads either way).
    Verify from outside:
    `curl -s -o /dev/null -w "%{http_code}\n" https://sceneone-site-git-payment-gate-scene-one.vercel.app/`
    — **200** = off, **302** = on.
  - **Deployment Protection Exceptions** would be the clean fix (exempt just the preview
    alias, leave everything else protected) but it is **Pro + $150/month**. Password
    Protection does not help — Moyasar cannot type a password either. The OPTIONS
    allowlist is irrelevant; the webhook is a POST.
- **Replaying a webhook by hand** (the fastest way to isolate handler bugs from delivery
  bugs — the endpoint re-reads the payment from Moyasar, so a hand-made POST is
  equivalent to a real one):
  ```bash
  curl -s -X POST "$PREVIEW/api/payment-webhook" -H 'Content-Type: application/json' \
    -d "{\"type\":\"payment_paid\",\"secret_token\":\"$WH_SECRET\",\"data\":{\"id\":\"$PAYMENT_ID\"}}"
  ```
  Get `$PAYMENT_ID` from `GET /v1/invoices/<invoice_id>` → `payments[0].id` (**not** the
  invoice id). A replay proves the handler; it does **not** prove Moyasar's own delivery
  or that the registered `shared_secret` matches — only an untouched payment does that.
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
9. **Real money is live.** The payment gate takes real cards. Never test with `PRICES`
   edited — that mis-charges any writer who submits during the window. Test by
   submitting normally, creating a 1 SAR invoice by hand, then repointing the row's
   **`payment_invoice_id` AND `payment_amount`** (both, or the webhook's amount guard
   rejects it as a mismatch). See the note under Deployment & Environment.
10. **When CSS "doesn't apply", check source order before specificity.** Media queries
   at equal specificity lose to base rules that come later in the file. This has cost
   time twice.
11. **When something renders at the wrong size in the report or workspace**, suspect the
   two different page base font sizes (16px vs 21px) before anything else — see
   Important Design Decisions.
12. **Verify by measuring, not by eye.** The browser preview's screenshots capture at an
   inconsistent scale and its programmatic scrolling is throttled; `getBoundingClientRect`
   and `getComputedStyle` are reliable when a screenshot looks wrong. Also bust caches
   explicitly (`?v=` on the stylesheet, and on `background-image` URLs) — a stale CSS or
   image file has repeatedly looked like a broken change. **This bites `.js` too:** a
   stale `js/i18n.js` / `js/coverage.js` made correct edits look like they hadn't
   applied, twice on 2026-08-13. Confirm what the server actually holds with
   `fetch(src, {cache:'reload'})` before debugging code that is already right.
13. **`is_staff()` is the staff boundary — do not widen it.** `lead_reader` is a reader
   with one scoped extra power and must keep failing `is_staff`. If a lead needs to see
   something new, extend `can_qa_review()` (narrow, self-closing) or add a fresh
   predicate; adding the role to `is_staff` would silently hand them All submissions,
   Deliveries, the kanban, admin management and reassignment in one line.
14. **A reviewer cannot write the coverage row.** RLS restricts coverage writes to the
   assigned reader, and the row locks at `submitted`. Anything a reviewer needs to
   persist (approval, revision note, per-point notes) goes through
   `/api/review-coverage` on the service role — never by relaxing the policy.
15. **The client-side role checks are conveniences, not the gate.** `js/admin.js` and
   `js/coverage.js` decide what to *offer*; RLS and the API re-check independently and
   are what actually protect anything. Keep them mirrored, but never move a decision
   out of the server and into the browser.
