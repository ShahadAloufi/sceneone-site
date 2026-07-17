// Vercel serverless function — STAFF quality-control review of a submitted
// coverage. This is the ONLY path that can approve a coverage (making it visible
// to the writer) or bounce it back for revision — readers can never do either.
//
//   POST /api/review-coverage
//     { submission_id, action: "approve" }
//     { submission_id, action: "request_revision", note: "<why>" }
//
// The caller must send their Supabase session token as `Authorization: Bearer
// <token>`; we verify it maps to a STAFF row (admin | super_admin). All reads and
// writes use the service-role key (bypasses RLS), so the state transition and
// delivery stamping are trusted.
//
// - approve:          status → 'approved', stamp delivered_at/by, email the
//                     writer a private link to their (now visible) report.
// - request_revision: status → 'revision_requested', store the required note; the
//                     reader reopens, revises, and resubmits. Nothing is emailed
//                     to the writer.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
const NOTIFY_TO = "sceneone.info@gmail.com";
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Resolve the caller from their bearer token, then confirm they are STAFF
// (admin or super_admin) — readers must not reach the review actions.
async function requireStaff(req) {
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
  const row = rows[0];
  if (!row || (row.role !== "admin" && row.role !== "super_admin")) {
    return { error: 403, message: "هذا الإجراء مخصص لفريق الجودة فقط" };
  }
  return { user };
}

// Bilingual email inviting the writer to open their (now approved) report.
function reportEmail(sub, link) {
  var esc = escapeHtml;
  var title = sub.title_ar || sub.title_en || "";
  var name = (sub.writer || "").toString().trim();

  var arHi = name ? "مرحبًا " + esc(name) + "،" : "مرحبًا،";
  var enHi = name ? "Hello " + esc(name) + "," : "Hello,";

  var titleLine = title
    ? '<p style="margin:0 0 24px;color:#8a8178;font-size:13px;">العنوان: ' +
      '<strong style="color:#15110f;">' + esc(title) + '</strong></p>'
    : "";

  var bodyStyle = "margin:0 auto;max-width:440px;font-size:15px;line-height:1.9;color:#4a453f;";

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:46px 44px;text-align:center;">' +

            '<div style="font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 30px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 14px;font-size:25px;line-height:1.3;color:#15110f;font-weight:700;">تقرير تقييم نصك جاهز الآن</h1>' +

            titleLine +

            '<p dir="rtl" style="' + bodyStyle + 'margin-bottom:6px;">' +
              arHi +
              "<br> يمكنك عرض التقرير والإطلاع على تفاصيله من خلال الضغط على الزر أدناه" +
            "</p>" +

            '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto;"><tr>' +
              '<td style="border-radius:12px;background:#111111;">' +
                '<a href="' + esc(link) + '" style="display:inline-block;padding:16px 40px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;">عرض التقرير</a>' +
              "</td></tr></table>" +

            '<hr style="border:0;border-top:1px solid #ece7df;width:78%;margin:26px auto;">' +

            '<p dir="ltr" style="' + bodyStyle + '">' +
              enHi +
              "<br>Your script coverage report is ready. Open it with the button above, and save it as a PDF from there if you like." +
            "</p>" +

            '<p style="margin:30px 0 0;color:#a49b90;font-size:12.5px;"> The Scene One team</p>' +

          "</td></tr>" +
        "</table>" +

        '<p dir="ltr" style="max-width:600px;margin:18px auto 0;color:#a49b90;font-size:12px;line-height:1.6;">' +
          "If the button doesn't work, copy this link:<br>" + esc(link) +
        "</p>" +

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

  const gate = await requireStaff(req);
  if (gate.error) return res.status(gate.error).json({ message: gate.message });

  const b = req.body || {};
  const subId = (b.submission_id || "").toString().trim();
  const action = (b.action || "").toString().trim();
  if (!subId) return res.status(400).json({ message: "معرّف النص مطلوب" });
  if (action !== "approve" && action !== "request_revision") {
    return res.status(400).json({ message: "إجراء غير معروف" });
  }

  const headers = { apikey: key, Authorization: "Bearer " + key };

  // The coverage must currently be awaiting review.
  const covResp = await fetch(
    url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(subId) + "&select=status",
    { headers }
  );
  const covs = covResp.ok ? await covResp.json() : [];
  if (!covs.length) return res.status(404).json({ message: "لا توجد تغطية لهذا النص" });
  if (covs[0].status !== "submitted") {
    return res.status(409).json({ message: "هذه التغطية ليست بانتظار المراجعة" });
  }

  // -------- Request revision: bounce back to the reader with a note. --------
  if (action === "request_revision") {
    const note = (b.note || "").toString().trim();
    if (!note) return res.status(400).json({ message: "ملاحظة التعديل مطلوبة" });
    const patch = await fetch(
      url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(subId),
      {
        method: "PATCH",
        headers: Object.assign({}, headers, { "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ status: "revision_requested", review_note: note }),
      }
    );
    if (!patch.ok) {
      console.error("review-coverage request_revision failed:", patch.status, await patch.text());
      return res.status(502).json({ message: "تعذّر إرسال طلب التعديل" });
    }
    return res.status(200).json({ ok: true, status: "revision_requested" });
  }

  // -------- Approve: mark approved, stamp delivery, email the writer. --------
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ message: "خدمة البريد غير مهيأة" });

  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId) +
    "&select=id,title_ar,title_en,writer,email,film_type,report_token",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "النص غير موجود" });
  const sub = subs[0];
  if (!sub.email) return res.status(400).json({ message: "لا يوجد بريد إلكتروني للكاتب" });
  if (!sub.report_token) return res.status(500).json({ message: "رمز التقرير غير متوفر" });

  // Flip to approved + stamp delivery FIRST, so the report link is live before the
  // email goes out (the public report API gates on status = 'approved').
  const patch = await fetch(
    url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(subId),
    {
      method: "PATCH",
      headers: Object.assign({}, headers, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({
        status: "approved",
        delivered_at: new Date().toISOString(),
        delivered_by: gate.user.id,
        review_note: null,
      }),
    }
  );
  if (!patch.ok) {
    console.error("review-coverage approve failed:", patch.status, await patch.text());
    return res.status(502).json({ message: "تعذّر اعتماد التغطية" });
  }

  const FILM_EN = { feature: "Feature", short: "Short Film" };
  const filmLabel = FILM_EN[sub.film_type];
  const subject = "Scene One " + (filmLabel ? filmLabel + " " : "") + "Coverage Report";
  const link = SITE_URL + "/report?t=" + encodeURIComponent(sub.report_token);
  const html = reportEmail(sub, link);

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [sub.email],
        reply_to: NOTIFY_TO,
        subject: subject,
        html: html,
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("Resend review-coverage send failed:", r.status, detail);
      // The coverage is approved and live; surface a soft warning so the reviewer
      // knows the email itself didn't go out (the writer can still be re-notified).
      return res.status(200).json({ ok: true, status: "approved", emailed: false });
    }
  } catch (err) {
    console.error("review-coverage email error:", err);
    return res.status(200).json({ ok: true, status: "approved", emailed: false });
  }

  return res.status(200).json({ ok: true, status: "approved", emailed: true });
};
