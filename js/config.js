/* ===========================================================
   Scene One — public Supabase configuration (single source of truth)
   -----------------------------------------------------------
   Loaded by admin.html BEFORE any page script (and by the submission
   page once its frontend is rebuilt).

   SAFE TO EXPOSE: the anon (public) key is designed to be shipped to the
   browser. It is constrained by Row Level Security + storage policies:
     • it may only UPLOAD (insert) into the private `scripts` bucket,
     • it cannot read the database or list/download files,
     • admin reads/updates require an authenticated admin session.
   The privileged service-role key lives ONLY in server env vars (never here).

   Fill these in after creating your Supabase project (Project Settings → API).
   =========================================================== */
window.SCENEONE_SUPABASE = {
  url: "https://tdnhzxlrluqqcrjaajwk.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbmh6eGxybHVxcWNyamFhandrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNjQ0OTksImV4cCI6MjA5ODg0MDQ5OX0.YwKAfZjLpt7MVSRsSsP5o9smegp8mi0QP2XfmVAKsAg",
  bucket: "scripts"
};
