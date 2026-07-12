-- ============================================================
-- Scene One — database schema (run in Supabase SQL editor)
-- Covers: script submissions, admin accounts/roles, and access policies.
-- Safe to re-run (uses IF NOT EXISTS / conflict guards where possible).
-- ============================================================

-- ------------------------------------------------------------
-- 1) ADMINS
-- Maps a Supabase Auth user (auth.users) to a role + display name.
-- Auth (email/password, sessions) is handled by Supabase Auth; this table
-- just records who is an admin and whether they are the super admin.
-- ------------------------------------------------------------
create table if not exists public.admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null,
  role       text not null default 'admin' check (role in ('admin', 'super_admin', 'senior_reader', 'junior_reader')),
  created_at timestamptz not null default now()
);

-- Widen the role allowlist if the table pre-existed with the old two-role check.
-- Readers (senior_reader / junior_reader) currently share the same access as
-- admins via is_admin(); payment-gating will restrict them to paid submissions
-- later. junior readers get a co-reader on each submission they claim.
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins
  add constraint admins_role_check
  check (role in ('admin', 'super_admin', 'senior_reader', 'junior_reader'));

-- Helper functions (SECURITY DEFINER so they bypass RLS on `admins` and avoid
-- infinite recursion when referenced inside `admins` policies).
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.admins where id = uid);
$$;

create or replace function public.is_super_admin(uid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.admins where id = uid and role = 'super_admin');
$$;

-- "Staff" = full-access roles (admin / super_admin). Readers are excluded, so
-- this is the flag used to grant unrestricted coverage access.
create or replace function public.is_staff(uid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.admins
    where id = uid and role in ('admin', 'super_admin')
  );
$$;

-- True when `uid` is the primary assignee or the co-reader of `sub_id`.
-- Used to restrict readers to coverages for scripts they've claimed.
create or replace function public.is_assigned(uid uuid, sub_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.submissions
    where id = sub_id and (assigned_to = uid or co_reader_id = uid)
  );
$$;

alter table public.admins enable row level security;

-- Any signed-in admin may read the admin list (needed to show names / assignees).
drop policy if exists "admins can read admins" on public.admins;
create policy "admins can read admins"
  on public.admins for select
  to authenticated
  using ( public.is_admin(auth.uid()) );

-- (Creating/removing admins is done server-side with the service-role key,
--  which bypasses RLS — so no INSERT/UPDATE/DELETE policies are defined here.)

-- Base table privilege for the signed-in role. RLS (above) still restricts
-- this to a user's own admin row via is_admin(); without this GRANT, Postgres
-- denies access at the privilege layer before RLS is ever evaluated.
-- Nothing is granted to `anon` (least privilege).
grant usage on schema public to authenticated;
grant select on public.admins to authenticated;

-- The service role (used only by the /api serverless functions) needs full
-- table privileges. It bypasses RLS, but NOT table-level GRANTs, so without
-- this the server can't read roles, create admins, or insert submissions.
grant usage on schema public to service_role;
grant all on public.admins to service_role;
grant all on public.submissions to service_role;

-- ------------------------------------------------------------
-- 2) SUBMISSIONS
-- The script-submission form's data + a reference to the uploaded file.
-- `assigned_to` is the admin who claimed the submission (nullable).
-- ------------------------------------------------------------
create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  title_ar      text not null,
  title_en      text not null,
  email         text not null,
  writer        text not null,
  genre         text not null,
  film_type     text not null,
  draft         text not null,
  duration      text,
  logline       text,
  vision        text not null,
  ip_registered boolean not null default false,
  file_path     text,          -- object path inside the `scripts` bucket
  file_name     text,          -- original filename shown to admins
  status        text not null default 'new',
  assigned_to   uuid references public.admins(id) on delete set null,
  -- Second reader, only used when the primary assignee is a junior reader.
  co_reader_id  uuid references public.admins(id) on delete set null
);

-- Add assigned_to if the table pre-existed from an earlier version.
alter table public.submissions
  add column if not exists assigned_to uuid references public.admins(id) on delete set null;

-- Add co_reader_id if the table pre-existed from an earlier version.
alter table public.submissions
  add column if not exists co_reader_id uuid references public.admins(id) on delete set null;

-- Total page count of the uploaded PDF (title page included; the dashboard
-- shows page count minus the title page). Null for non-PDF uploads.
alter table public.submissions
  add column if not exists pages int;

alter table public.submissions enable row level security;

-- Admins can read every submission (shared inbox).
drop policy if exists "admins can read submissions" on public.submissions;
create policy "admins can read submissions"
  on public.submissions for select
  to authenticated
  using ( public.is_admin(auth.uid()) );

-- Admins can update submissions (used to claim/assign & change status).
drop policy if exists "admins can update submissions" on public.submissions;
create policy "admins can update submissions"
  on public.submissions for update
  to authenticated
  using ( public.is_admin(auth.uid()) )
  with check ( public.is_admin(auth.uid()) );

-- Base table privileges for the signed-in role (RLS above restricts these to
-- admins). No INSERT grant: new submissions are written server-side only.
grant select, update on public.submissions to authenticated;

-- NOTE: new submissions are INSERTed by the /api/submissions serverless
-- function using the service-role key (bypasses RLS), so there is deliberately
-- no public/anon INSERT policy on this table.

-- ------------------------------------------------------------
-- 3) STORAGE — private `scripts` bucket for the uploaded files
-- ------------------------------------------------------------
-- Enforced at the bucket level so limits apply even though the browser uploads
-- directly (the file never passes through our serverless function):
--   * file_size_limit  — hard 25 MiB per-file cap → blocks storage-abuse / DoS.
--   * allowed_mime_types — the script formats we accept. `.fdx` / `.fountain`
--     files frequently report no MIME (browsers send application/octet-stream),
--     so that type is included; the authoritative extension check is done
--     server-side in /api/submissions.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scripts', 'scripts', false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'application/xml',
    'text/xml',
    'application/octet-stream'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anonymous visitors may UPLOAD (insert) into `scripts` only — no read/list.
drop policy if exists "anon can upload scripts" on storage.objects;
create policy "anon can upload scripts"
  on storage.objects for insert
  to anon
  with check ( bucket_id = 'scripts' );

-- Signed-in admins may READ files (to generate signed download URLs).
drop policy if exists "admins can read scripts" on storage.objects;
create policy "admins can read scripts"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'scripts' and public.is_admin(auth.uid()) );

-- ------------------------------------------------------------
-- 3.5) COVERAGES
-- One coverage evaluation per submission, written by the reader/admin who
-- opens it from the dashboard ("ابدأ التقييم"). The whole evaluation (glance
-- ratings, per-category scores + notes, market analysis, verdict, etc.) is
-- stored as a single JSON blob in `data`, so the coverage page can save/restore
-- it verbatim. `status` drives the dashboard button label (in_progress → resume,
-- completed → view report).
-- ------------------------------------------------------------
create table if not exists public.coverages (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  reader_id     uuid references public.admins(id) on delete set null,
  status        text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.coverages enable row level security;

-- Coverage access. Staff (admin / super_admin) can read every coverage.
-- Readers are limited to coverages for scripts they're assigned to (primary or
-- co-reader), PLUS any coverage that has been marked completed — a finished
-- report is viewable by every reader. Older policies are dropped first.
drop policy if exists "admins can read coverages" on public.coverages;
drop policy if exists "staff read all, readers read assigned coverages" on public.coverages;
drop policy if exists "staff+assigned read, everyone reads completed" on public.coverages;
create policy "staff+assigned read, everyone reads completed"
  on public.coverages for select
  to authenticated
  using (
    public.is_staff(auth.uid())
    or public.is_assigned(auth.uid(), submission_id)
    or status = 'completed'
  );

-- Create a coverage row (first time a submission is written to). Only the
-- assigned reader (primary or co-reader) may write — the coverage is read-only
-- for everyone else, including staff who haven't assigned themselves. Staff
-- still SEE every coverage via the SELECT policy above.
drop policy if exists "admins can insert coverages" on public.coverages;
drop policy if exists "staff insert all, readers insert assigned coverages" on public.coverages;
drop policy if exists "only assigned readers insert coverages" on public.coverages;
create policy "only assigned readers insert coverages"
  on public.coverages for insert
  to authenticated
  with check ( public.is_assigned(auth.uid(), submission_id) );

-- Update coverages (autosave while writing). Only the assigned reader may edit.
drop policy if exists "admins can update coverages" on public.coverages;
drop policy if exists "staff update all, readers update assigned coverages" on public.coverages;
drop policy if exists "only assigned readers update coverages" on public.coverages;
create policy "only assigned readers update coverages"
  on public.coverages for update
  to authenticated
  using ( public.is_assigned(auth.uid(), submission_id) )
  with check ( public.is_assigned(auth.uid(), submission_id) );

-- Base table privileges for the signed-in role (RLS above restricts to admins).
grant select, insert, update on public.coverages to authenticated;
grant all on public.coverages to service_role;

-- ============================================================
-- 4) SEED THE FIRST SUPER ADMIN  (one-time, manual)
-- ------------------------------------------------------------
-- Supabase Auth users can't be created via SQL, so:
--   a) Dashboard → Authentication → Users → "Add user":
--      enter the super admin's email + password, tick "Auto Confirm User".
--   b) Then run the statement below (replace the email) to grant super_admin.
--      After this, that person logs into /admin and creates the other admins.
--
-- insert into public.admins (id, email, name, role)
-- select id, email, 'Super Admin', 'super_admin'
-- from auth.users
-- where email = 'REPLACE-WITH-SUPER-ADMIN-EMAIL'
-- on conflict (id) do update set role = 'super_admin';
-- ============================================================

-- ============================================================
-- Realtime: let the admin dashboard receive live INSERT/UPDATE/DELETE
-- events for submissions and coverages, so new scripts appear the
-- moment they're submitted (no manual refresh). Run once in the SQL
-- Editor; idempotent (skips tables already in the publication).
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'coverages'
  ) then
    alter publication supabase_realtime add table public.coverages;
  end if;
end $$;

-- ------------------------------------------------------------
-- 5) ACCESS LOG — records each dashboard sign-in with the client IP so a
-- super-admin can spot accounts used from many IPs (shared reader access).
-- Rows are written only by the service role (/api/log-access); reads are
-- restricted to super-admins by RLS.
-- ------------------------------------------------------------
create table if not exists public.access_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid references public.admins(id) on delete cascade,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists access_log_admin_created_idx on public.access_log (admin_id, created_at desc);

alter table public.access_log enable row level security;

-- Only super-admins may read the access log.
drop policy if exists "super admins read access log" on public.access_log;
create policy "super admins read access log"
  on public.access_log for select
  to authenticated
  using ( public.is_super_admin(auth.uid()) );

-- No client INSERT policy: rows are written only by the service role.
grant select on public.access_log to authenticated;
grant all on public.access_log to service_role;
