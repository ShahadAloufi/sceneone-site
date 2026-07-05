/* ===========================================================
   Scene One — public Supabase configuration (single source of truth)
   -----------------------------------------------------------
   Loaded by both submit.html and admin.html BEFORE any page script.

   SAFE TO EXPOSE: the anon (public) key is designed to be shipped to the
   browser. It is constrained by Row Level Security + storage policies:
     • it may only UPLOAD (insert) into the private `scripts` bucket,
     • it cannot read the database or list/download files,
     • admin reads/updates require an authenticated admin session.
   The privileged service-role key lives ONLY in server env vars (never here).

   Fill these in after creating your Supabase project (Project Settings → API).
   =========================================================== */
window.SCENEONE_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR-ANON-PUBLIC-KEY",
  bucket: "scripts"
};
