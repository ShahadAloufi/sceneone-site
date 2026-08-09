// Vercel serverless function — a reader claims or releases a script.
//
//   POST /api/claim-script  { submission_id, action: "claim" | "release" }
//
// Claiming starts a 2-hour notice window. At the end of it the writer is emailed
// that work has begun and the submission can no longer be cancelled or refunded;
// releasing within the window frees the script and the notice never goes out.
//
// NOTHING IS SCHEDULED OR CANCELLED HERE. The notice is sent by a sweep over
// scripts still assigned past the window (lib/assignment-notices.js), which this
// endpoint runs on every request. The previous design scheduled the email with
// Resend at claim time and cancelled it on release — but the cancel was
// best-effort and its failure was only logged, so a writer could be told work had
// begun, and their refund window closed, for a script that was back in the pool.
//
// This runs with the service-role key, so it re-checks the rules the DB triggers
// would normally apply to a signed-in caller (service role bypasses auth.uid()
// guards): the one-active-assignment limit, and the post-window lock.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

// ASSIGNMENT_WINDOW_MS is the REAL notice/lock window and lives with the sweep
// that acts on it. Readers are TOLD 2 hours (see claimConfirm in the dashboard)
// but actually get 3 — a deliberate hidden buffer. Keep in sync with the
// enforce_assignment_lock() trigger's interval and admin.js. Not a bug.
const { sweepAssignmentNotices, ASSIGNMENT_WINDOW_MS } = require("../lib/assignment-notices");

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

// Resolve the caller from their bearer token and return their admins row.
async function requireAdmin(req) {
  const { url, key } = svc();
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: 401, message: "غير مصرّح" };
  const userResp = await fetch(url + "/auth/v1/user", {
    headers: { apikey: key, Authorization: "Bearer " + token },
  });
  if (!userResp.ok) return { error: 401, message: "جلسة غير صالحة" };
  const user = await userResp.json();
  if (!user || !user.id) return { error: 401, message: "جلسة غير صالحة" };
  const roleResp = await fetch(
    url + "/rest/v1/admins?id=eq." + user.id + "&select=id,role",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const rows = roleResp.ok ? await roleResp.json() : [];
  if (!rows.length) return { error: 403, message: "غير مصرّح" };
  return { me: rows[0] };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { url, key } = svc();
  if (!url || !key) {
    console.error("Supabase env vars are not configured");
    return res.status(500).json({ message: "الخادم غير مهيأ" });
  }

  const gate = await requireAdmin(req);
  if (gate.error) return res.status(gate.error).json({ message: gate.message });
  const me = gate.me;

  const b = req.body || {};
  const subId = (b.submission_id || "").toString().trim();
  const action = (b.action || "").toString().trim();
  if (!subId) return res.status(400).json({ message: "معرّف النص مطلوب" });
  if (action !== "claim" && action !== "release" && action !== "reassign") {
    return res.status(400).json({ message: "إجراء غير معروف" });
  }

  const headers = { apikey: key, Authorization: "Bearer " + key };
  const jsonHeaders = Object.assign({}, headers, { "Content-Type": "application/json" });

  // Send any notices that have fallen due. Piggybacked here because readers hit
  // this endpoint constantly and Vercel Hobby caps cron at once a day; the daily
  // /api/send-notices run is only a backstop for a quiet stretch. Never throws,
  // and a slow or failing sweep must not block the reader's actual request — so
  // the result is logged, not awaited into the response.
  try {
    const sent = await sweepAssignmentNotices(url, jsonHeaders);
    if (sent) console.log("claim-script: sent " + sent + " assignment notice(s)");
  } catch (err) {
    console.error("claim-script: notice sweep error:", err);
  }

  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId) +
    "&select=id,title_ar,title_en,writer,email,status,assigned_to,co_reader_id,assigned_at,writer_notified_at,writer_level",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "النص غير موجود" });
  const sub = subs[0];

  const now = Date.now();
  const startedAt = sub.assigned_at ? new Date(sub.assigned_at).getTime() : null;
  const windowOpen = startedAt != null && now < startedAt + ASSIGNMENT_WINDOW_MS;
  // `writer_notified_at` is now stamped ONLY by the sweep, and only immediately
  // before the email actually goes out — so it means "the writer has been told",
  // not "we assume they have by now". Nothing infers it from elapsed time: doing
  // that would mark a script notified and then make the sweep skip it, so the
  // writer would never hear anything.
  const notified = !!sub.writer_notified_at;

  // --------------------------- REASSIGN ----------------------------
  // Staff hand a claimed script to a DIFFERENT reader. Deliberately never sets
  // assigned_to back to null: once claimed, a script always has someone
  // responsible. `assigned_at` is left untouched, so the clock isn't restarted and
  // the sweep still notifies at the ORIGINAL window's end — "work started on your
  // script" stays true under a new reader, and they're never notified twice.
  if (action === "reassign") {
    if (me.role !== "admin" && me.role !== "super_admin") {
      return res.status(403).json({ message: "إعادة الإسناد مخصصة للمشرفين" });
    }
    const to = (b.to || "").toString().trim();
    if (!to) return res.status(400).json({ message: "يجب اختيار قارئ" });
    if (!sub.assigned_to) return res.status(409).json({ message: "هذا النص غير مُسند" });
    if (to === sub.assigned_to) return res.status(200).json({ ok: true, assigned_to: to });

    const tResp = await fetch(
      url + "/rest/v1/admins?id=eq." + encodeURIComponent(to) + "&select=id,role",
      { headers }
    );
    const tRows = tResp.ok ? await tResp.json() : [];
    if (!tRows.length) return res.status(400).json({ message: "القارئ غير موجود" });

    // A co-reader only makes sense under a junior primary, and can't be the
    // primary as well — drop it otherwise.
    const body = { assigned_to: to };
    if (sub.co_reader_id === to || tRows[0].role !== "junior_reader") body.co_reader_id = null;

    const patch = await fetch(url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId), {
      method: "PATCH",
      headers: Object.assign({}, jsonHeaders, { Prefer: "return=minimal" }),
      body: JSON.stringify(body),
    });
    if (!patch.ok) {
      console.error("claim-script reassign failed:", patch.status, await patch.text());
      return res.status(502).json({ message: "تعذّر إعادة الإسناد" });
    }
    return res.status(200).json({ ok: true, assigned_to: to });
  }

  // ---------------------------- RELEASE ----------------------------
  if (action === "release") {
    if (sub.assigned_to !== me.id) {
      return res.status(403).json({ message: "هذا النص ليس مُسندًا إليك" });
    }
    if (notified || !windowOpen) {
      return res.status(409).json({ message: "انتهت مهلة الإلغاء، لم يعد بالإمكان إلغاء الإسناد" });
    }
    // No email to cancel: clearing `assigned_to` is what stops the notice, because
    // the sweep only ever picks up scripts that are still assigned.
    const patch = await fetch(url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId), {
      method: "PATCH",
      headers: Object.assign({}, jsonHeaders, { Prefer: "return=minimal" }),
      // Back into the pool — the script stays paid for, so it returns to
      // `unassigned`, never to `pending_payment`.
      body: JSON.stringify({ status: "unassigned", assigned_to: null, co_reader_id: null, assigned_at: null }),
    });
    if (!patch.ok) {
      console.error("claim-script release failed:", patch.status, await patch.text());
      return res.status(502).json({ message: "تعذّر إلغاء الإسناد" });
    }
    return res.status(200).json({ ok: true, assigned_to: null });
  }

  // ----------------------------- CLAIM -----------------------------
  if (sub.assigned_to) {
    return res.status(409).json({ message: "هذا النص مُسند بالفعل" });
  }
  // The payment gate. Only a script the writer has actually paid for reaches the
  // pool, and /api/payment-webhook is the only thing that puts it there.
  if (sub.status !== "unassigned") {
    return res.status(409).json({ message: "لم يكتمل دفع رسوم هذا النص" });
  }

  // Junior readers are kept off experienced writers: the script's self-declared
  // writer_level gates the claim, not the reader's own track record with it.
  const RESTRICTED_LEVELS = ["professional", "veteran"];
  if (me.role === "junior_reader" && RESTRICTED_LEVELS.indexOf(sub.writer_level) !== -1) {
    // Leading marker (like READER_HAS_ACTIVE_ASSIGNMENT below) so js/admin.js can
    // swap in its own localised copy instead of echoing this Arabic fallback.
    return res.status(403).json({
      message: "JUNIOR_LEVEL_RESTRICTED: هذا النص لكاتب محترف أو متمرّس، وهو مخصص لقارئ أول",
    });
  }

  // One-active-assignment limit: every reader (junior or senior) may hold only
  // one undelivered script at a time, as primary OR co-reader. "Undelivered"
  // mirrors the dashboard's own delivered_at check (see admin.js) — a script
  // whose coverage has been approved has left the reader's active queue even if
  // assigned_to still points at them, so it must not count here.
  const activeResp = await fetch(
    url + "/rest/v1/submissions?select=id,coverages(delivered_at)" +
    "&or=(assigned_to.eq." + encodeURIComponent(me.id) + ",co_reader_id.eq." + encodeURIComponent(me.id) + ")",
    { headers }
  );
  if (!activeResp.ok) {
    console.error("claim-script active-check failed:", activeResp.status, await activeResp.text());
    return res.status(502).json({ message: "تعذّر التحقق من التكليفات الحالية" });
  }
  const activeRows = await activeResp.json();
  const hasActive = activeRows.some(function (row) {
    var cov = row.coverages;
    if (Array.isArray(cov)) cov = cov[0];
    return !cov || !cov.delivered_at;
  });
  if (hasActive) {
    // The literal marker (not just the Arabic text) is what js/admin.js's
    // assign() regex-matches to show the friendlier assignBlocked copy instead
    // of this raw fallback — keep both in sync if either changes.
    return res.status(409).json({
      message: "READER_HAS_ACTIVE_ASSIGNMENT: لديك تكليف نشط بالفعل، أكمل تسليمه قبل قبول تكليف جديد",
    });
  }

  const claimedAt = new Date();

  // Nothing is sent or scheduled here. `assigned_at` IS the schedule: the sweep
  // notifies the writer once it is older than the window and the script is still
  // held. A claim that fails to land therefore leaves nothing to clean up.
  const patch = await fetch(url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId), {
    method: "PATCH",
    headers: Object.assign({}, jsonHeaders, { Prefer: "return=minimal" }),
    body: JSON.stringify({
      status: "in_review",
      assigned_to: me.id,
      assigned_at: claimedAt.toISOString(),
    }),
  });
  if (!patch.ok) {
    console.error("claim-script claim failed:", patch.status, await patch.text());
    return res.status(502).json({ message: "تعذّر إسناد النص" });
  }

  return res.status(200).json({
    ok: true,
    assigned_to: me.id,
    assigned_at: claimedAt.toISOString(),
    window_ends_at: new Date(claimedAt.getTime() + ASSIGNMENT_WINDOW_MS).toISOString(),
  });
};
