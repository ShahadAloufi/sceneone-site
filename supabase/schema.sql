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
  role       text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

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

alter table public.admins enable row level security;

-- Any signed-in admin may read the admin list (needed to show names / assignees).
drop policy if exists "admins can read admins" on public.admins;
create policy "admins can read admins"
  on public.admins for select
  to authenticated
  using ( public.is_admin(auth.uid()) );

-- (Creating/removing admins is done server-side with the service-role key,
--  which bypasses RLS — so no INSERT/UPDATE/DELETE policies are defined here.)

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
  assigned_to   uuid references public.admins(id) on delete set null
);

-- Add assigned_to if the table pre-existed from an earlier version.
alter table public.submissions
  add column if not exists assigned_to uuid references public.admins(id) on delete set null;

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
