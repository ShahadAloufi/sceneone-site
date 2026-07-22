// Vercel serverless function — a reader claims or releases a script.
//
//   POST /api/claim-script  { submission_id, action: "claim" | "release" }
//
// Claiming starts a 2-hour notice window. At the end of it the writer is emailed
// that work has begun and the submission can no longer be cancelled or refunded;
// releasing within the window cancels that email and frees the script.
//
// The delay is implemented with Resend's SCHEDULED SENDING (`scheduled_at`, up to
// 30 days out) rather than a cron job — Vercel Hobby only runs cron once a day,
// which can't express "in 2 hours". Claiming schedules the email and stores its
// id; releasing cancels it via POST /emails/:id/cancel. Nothing has to poll.
//
// This runs with the service-role key, so it re-checks the rules the DB triggers
// would normally apply to a signed-in caller (service role bypasses auth.uid()
// guards): the one-active-assignment limit, and the post-window lock.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
const NOTIFY_TO = "sceneone.info@gmail.com";
const ASSIGNMENT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours — keep in sync with the DB trigger

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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

// Bilingual "work has started on your script" notice. Same shell as the other
// writer emails so the whole sequence looks like one brand.
function noticeEmail(sub) {
  var esc = escapeHtml;
  var title = sub.title_ar || sub.title_en || "";
  var name = (sub.writer || "").toString().trim();
  var arHi = name ? "مرحبًا " + esc(name) + "،" : "مرحبًا،";
  var enHi = name ? "Hello " + esc(name) + "," : "Hello,";
  var titleLine = title
    ? '<p style="margin:0 0 24px;color:#8a8178;font-size:13px;">العنوان: ' +
      '<strong style="color:#15110f;">' + esc(title) + "</strong></p>"
    : "";
  var bodyStyle = "margin:0 auto;max-width:440px;font-size:15px;line-height:1.9;color:#4a453f;";
  var noteStyle = "margin:22px auto 0;max-width:440px;font-size:13.5px;line-height:1.8;color:#15110f;background:#f5f1e9;border-radius:12px;padding:14px 18px;";

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:46px 44px;text-align:center;">' +

            '<div style="font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 30px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 14px;font-size:25px;line-height:1.3;color:#15110f;font-weight:700;">بدأ العمل على نصك</h1>' +

            titleLine +

            '<p dir="rtl" style="' + bodyStyle + '">' +
              arHi +
              "<br>تم إسناد نصك إلى أحد قرّائنا وبدأ العمل على تقييمه. سنوافيك بالتقرير عبر بريدك الإلكتروني فور اكتماله واعتماده." +
            "</p>" +
            '<p dir="rtl" style="' + noteStyle + '">' +
              "لأن العمل على النص قد بدأ فعليًا، لم يعد بالإمكان إلغاء الطلب أو استرداد المبلغ في هذه المرحلة." +
            "</p>" +

            '<hr style="border:0;border-top:1px solid #ece7df;width:78%;margin:26px auto;">' +

            '<p dir="ltr" style="' + bodyStyle + '">' +
              enHi +
              "<br>Your script has been assigned to one of our readers and work has now begun. We'll email you the coverage report as soon as it's complete and approved." +
            "</p>" +
            '<p dir="ltr" style="' + noteStyle + '">' +
              "Because work on your script has now started, the submission can no longer be cancelled or refunded." +
            "</p>" +

            '<p style="margin:30px 0 0;color:#a49b90;font-size:12.5px;"> The Scene One team</p>' +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
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
  if (action !== "claim" && action !== "release") {
    return res.status(400).json({ message: "إجراء غير معروف" });
  }

  const headers = { apikey: key, Authorization: "Bearer " + key };
  const jsonHeaders = Object.assign({}, headers, { "Content-Type": "application/json" });

  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId) +
    "&select=id,title_ar,title_en,writer,email,assigned_to,co_reader_id,assigned_at,notice_email_id,writer_notified_at",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "النص غير موجود" });
  const sub = subs[0];

  const now = Date.now();
  const startedAt = sub.assigned_at ? new Date(sub.assigned_at).getTime() : null;
  const windowOpen = startedAt != null && now < startedAt + ASSIGNMENT_WINDOW_MS;
  // The notice has gone out if it was scheduled, never cancelled, and its send
  // time has passed. Persist that so a later reassignment doesn't re-notify.
  let notified = !!sub.writer_notified_at;
  if (!notified && sub.notice_email_id && startedAt != null && !windowOpen) {
    notified = true;
    await fetch(url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId), {
      method: "PATCH",
      headers: Object.assign({}, jsonHeaders, { Prefer: "return=minimal" }),
      body: JSON.stringify({ writer_notified_at: new Date(startedAt + ASSIGNMENT_WINDOW_MS).toISOString() }),
    });
  }

  // ---------------------------- RELEASE ----------------------------
  if (action === "release") {
    if (sub.assigned_to !== me.id) {
      return res.status(403).json({ message: "هذا النص ليس مُسندًا إليك" });
    }
    if (notified || !windowOpen) {
      return res.status(409).json({ message: "انتهت مهلة الإلغاء، لم يعد بالإمكان إلغاء الإسناد" });
    }
    // Cancel the pending writer notice before freeing the script.
    if (sub.notice_email_id) {
      try {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
          const c = await fetch("https://api.resend.com/emails/" + encodeURIComponent(sub.notice_email_id) + "/cancel", {
            method: "POST",
            headers: { Authorization: "Bearer " + apiKey },
          });
          if (!c.ok) console.error("claim-script: cancel failed:", c.status, await c.text());
        }
      } catch (err) {
        console.error("claim-script: cancel error:", err);
      }
    }
    const patch = await fetch(url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId), {
      method: "PATCH",
      headers: Object.assign({}, jsonHeaders, { Prefer: "return=minimal" }),
      body: JSON.stringify({ assigned_to: null, co_reader_id: null, assigned_at: null, notice_email_id: null }),
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
  // Re-check the one-active-assignment rule: the DB trigger keys off auth.uid(),
  // which is null for the service role, so it wouldn't fire for this write.
  if (me.role === "senior_reader" || me.role === "junior_reader") {
    const activeResp = await fetch(
      url + "/rest/v1/submissions?assigned_to=eq." + encodeURIComponent(me.id) + "&select=id,coverages(status)",
      { headers }
    );
    const active = activeResp.ok ? await activeResp.json() : [];
    const blocking = active.filter(function (r) {
      if (r.id === subId) return false;
      const c = (r.coverages && r.coverages[0]) || null;
      return !c || c.status === "in_progress" || c.status === "revision_requested";
    });
    if (blocking.length) {
      return res.status(409).json({ message: "READER_HAS_ACTIVE_ASSIGNMENT" });
    }
  }

  const claimedAt = new Date();
  let noticeId = null;

  // Schedule the writer notice for the end of the window — unless they've already
  // been told (a previous reader took it past the window).
  if (!notified && sub.email) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        const sendAt = new Date(claimedAt.getTime() + ASSIGNMENT_WINDOW_MS).toISOString();
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: NOTIFY_FROM,
            to: [sub.email],
            reply_to: NOTIFY_TO,
            subject: "بدأ العمل على نصك - Scene One",
            html: noticeEmail(sub),
            scheduled_at: sendAt,
          }),
        });
        const data = await r.json().catch(function () { return {}; });
        if (r.ok && data && data.id) noticeId = data.id;
        else console.error("claim-script: schedule failed:", r.status, JSON.stringify(data));
      } catch (err) {
        console.error("claim-script: schedule error:", err);
      }
    }
  }

  const patch = await fetch(url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId), {
    method: "PATCH",
    headers: Object.assign({}, jsonHeaders, { Prefer: "return=minimal" }),
    body: JSON.stringify({
      assigned_to: me.id,
      assigned_at: claimedAt.toISOString(),
      notice_email_id: noticeId,
    }),
  });
  if (!patch.ok) {
    console.error("claim-script claim failed:", patch.status, await patch.text());
    // Don't leave a scheduled email for a claim that didn't land.
    if (noticeId) {
      try {
        await fetch("https://api.resend.com/emails/" + encodeURIComponent(noticeId) + "/cancel", {
          method: "POST",
          headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY },
        });
      } catch (err) { /* best effort */ }
    }
    return res.status(502).json({ message: "تعذّر إسناد النص" });
  }

  return res.status(200).json({
    ok: true,
    assigned_to: me.id,
    assigned_at: claimedAt.toISOString(),
    window_ends_at: new Date(claimedAt.getTime() + ASSIGNMENT_WINDOW_MS).toISOString(),
  });
};
