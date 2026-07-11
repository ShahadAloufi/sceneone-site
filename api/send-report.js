// Vercel serverless function — emails the completed coverage report to the
// writer. Triggered manually by an admin/reader from the report page.
//
//   POST /api/send-report   { submission_id }
//
// The caller must send their Supabase session access token as
// `Authorization: Bearer <token>`; we verify it maps to a row in `admins`.
// The report is only sent once the coverage is marked "completed". All reads
// use the service-role key (server-side only), and the email goes out through
// the existing Resend integration.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
const NOTIFY_TO = "sceneone.info@gmail.com";

const EVAL = ["Premise & Theme", "Hook", "Stakes & Plot", "Character", "Structure & Pace", "Producibility", "Presentation"];
const EVAL_AR = {
  "Premise & Theme": "الفكرة والموضوع", "Hook": "عنصر الجذب", "Stakes & Plot": "الرهانات الدرامية والحبكة",
  "Character": "الشخصيات", "Structure & Pace": "البناء الدرامي والإيقاع", "Producibility": "قابلية الإنتاج",
  "Presentation": "العرض والتنسيق"
};
const DECISION_AR = { Recommend: "يُوصى به", Consider: "يستحق الدراسة", Pass: "غير موصى به" };

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Resolve the caller from their bearer token, then confirm they are an admin.
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
    url + "/rest/v1/admins?id=eq." + user.id + "&select=id",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const rows = roleResp.ok ? await roleResp.json() : [];
  if (!rows.length) return { error: 403, message: "غير مصرّح" };
  return { user };
}

// Final rating /10: use the manual score if set, else the average of the set
// evaluation scores (1–5) scaled to 10.
function finalScore(c) {
  if (c.score10 != null && c.score10 !== "") return c.score10;
  var ev = c.eval || {};
  var vals = EVAL.map(function (n) { return ev[n] && ev[n].score; }).filter(function (s) { return s; });
  if (!vals.length) return null;
  var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
  return Math.round(avg * 2 * 10) / 10;
}

function section(title, body) {
  if (!body || !String(body).trim()) return "";
  return '<h3 style="margin:22px 0 6px;font-size:16px;color:#15110f;">' + escapeHtml(title) + "</h3>" +
    '<p style="margin:0;white-space:pre-wrap;color:#3f3a35;line-height:1.85;">' + escapeHtml(body) + "</p>";
}

function buildEmail(sub, cov) {
  var c = cov.data || {};
  var title = sub.title_ar || sub.title_en || "";
  var dec = c.verdict && c.verdict.decision ? (DECISION_AR[c.verdict.decision] || c.verdict.decision) : "—";
  var score = finalScore(c);
  var scoreStr = score != null ? (score + " / 10") : "—";

  var evalRows = EVAL.map(function (n) {
    var e = (c.eval && c.eval[n]) || {};
    if (!e.score && !(e.text && String(e.text).trim())) return "";
    return "<tr>" +
      '<td style="padding:8px 12px;border:1px solid #e7e2da;font-weight:bold;white-space:nowrap;vertical-align:top;">' +
      escapeHtml(EVAL_AR[n] || n) + (e.score ? ' <span style="color:#BD3D20;">(' + e.score + "/5)</span>" : "") + "</td>" +
      '<td style="padding:8px 12px;border:1px solid #e7e2da;white-space:pre-wrap;color:#3f3a35;">' + escapeHtml(e.text || "—") + "</td>" +
      "</tr>";
  }).join("");

  return '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#1a1a1a;max-width:680px;line-height:1.85;">' +
    '<h2 style="margin:0 0 6px;">تقرير تغطية النص — Scene One</h2>' +
    '<p style="color:#555;margin:0 0 18px;">العنوان: <strong>' + escapeHtml(title) + "</strong></p>" +
    '<table style="border-collapse:collapse;margin:0 0 6px;"><tr>' +
    '<td style="padding:8px 14px;border:1px solid #e7e2da;background:#f7f4ef;font-weight:bold;">القرار</td>' +
    '<td style="padding:8px 14px;border:1px solid #e7e2da;">' + escapeHtml(dec) + "</td>" +
    '<td style="padding:8px 14px;border:1px solid #e7e2da;background:#f7f4ef;font-weight:bold;">التقييم النهائي</td>' +
    '<td style="padding:8px 14px;border:1px solid #e7e2da;">' + escapeHtml(scoreStr) + "</td>" +
    "</tr></table>" +
    section("الملخّص", c.synopsis) +
    (evalRows ? '<h3 style="margin:22px 0 6px;font-size:16px;">التقييم التفصيلي</h3><table style="border-collapse:collapse;width:100%;">' + evalRows + "</table>" : "") +
    section("نقاط القوة", c.overall && c.overall.strengths) +
    section("ما يحتاج إلى تطوير", c.overall && c.overall.toDevelop) +
    section("الخلاصة", c.verdict && c.verdict.text) +
    '<p style="margin-top:28px;color:#888;">فريق Scene One</p>' +
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ message: "خدمة البريد غير مهيأة" });

  const gate = await requireAdmin(req);
  if (gate.error) return res.status(gate.error).json({ message: gate.message });

  const b = req.body || {};
  const subId = (b.submission_id || "").toString().trim();
  if (!subId) return res.status(400).json({ message: "معرّف النص مطلوب" });

  // Fetch the submission (writer + email) and its coverage.
  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId) + "&select=id,title_ar,title_en,writer,email",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "النص غير موجود" });
  const sub = subs[0];
  if (!sub.email) return res.status(400).json({ message: "لا يوجد بريد إلكتروني للكاتب" });

  const covResp = await fetch(
    url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(subId) + "&select=data,status",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const covs = covResp.ok ? await covResp.json() : [];
  if (!covs.length || covs[0].status !== "completed") {
    return res.status(400).json({ message: "التقرير غير مكتمل بعد" });
  }

  const title = sub.title_ar || sub.title_en || "";
  const html = buildEmail(sub, covs[0]);

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [sub.email],
        reply_to: NOTIFY_TO,
        subject: "تقرير تغطية نصك — Scene One" + (title ? (" — " + title) : ""),
        html: html,
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("Resend send-report failed:", r.status, detail);
      return res.status(502).json({ message: "تعذّر إرسال التقرير" });
    }
  } catch (err) {
    console.error("send-report error:", err);
    return res.status(500).json({ message: "تعذّر إرسال التقرير" });
  }

  return res.status(200).json({ ok: true });
};
