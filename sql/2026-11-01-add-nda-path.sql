-- Scene One — the signed NDA that unlocks an unregistered script submission.
--
-- The file itself lives in the `ndas` Storage bucket (anon insert, staff read).
-- This column records WHERE, so the dashboard can open it with one click
-- instead of reconstructing the path from the submission's file_path prefix.
--
-- Nullable on purpose: every row written before this existed has no NDA, and a
-- registered script never has one. api/submissions.js writes it only when the
-- writer answered "no" to the IP question, and refuses such a submission when
-- the object is not actually in the bucket.
alter table public.submissions
  add column if not exists nda_path text;
