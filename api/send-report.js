// Vercel serverless function — emails the completed coverage report to the
// writer. Triggered manually by an admin/reader from the report page.
//
//   POST /api/send-report   { submission_id }
//
// The caller must send their Supabase session access token as
// `Authorization: Bearer <token>`; we verify it maps to a row in `admins`.
// The report is only sent once the coverage is marked "completed". The writer
// receives an email with a private link to the hosted report page
// (report.html?t=<report_token>) — the token in the link is the authorization,
// so the writer needs no account. All reads use the service-role key.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
const NOTIFY_TO = "sceneone.info@gmail.com";
const SITE_URL = "https://sceneone.info";

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

// Bilingual email inviting the writer to open their hosted report. Table-based,
// inline-styled layout for email-client reliability: a warm background with a
// centered white card, the Scene One wordmark on top, and a black CTA button.
function reportEmail(sub, link) {
  var esc = escapeHtml;
  var title = sub.title_ar || sub.title_en || "";
  var name = (sub.writer || "").toString().trim();

  var arHi = name ? "مرحبًا " + esc(name) + "،" : "مرحبًا،";
  var enHi = name ? "Hello " + esc(name) + "," : "Hello,";

  //  تم التعديل هنا (العنوان بالعربي فقط)
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ message: "خدمة البريد غير مهيأة" });

  const gate = await requireAdmin(req);
  if (gate.error) return res.status(gate.error).json({ message: gate.message });

  const b = req.body || {};
  const subId = (b.submission_id || "").toString().trim();
  if (!subId) return res.status(400).json({ message: "معرّف النص مطلوب" });

  // Fetch the submission (writer email + the report token that gates the link).
  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId) + "&select=id,title_ar,title_en,writer,email,film_type,report_token",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "النص غير موجود" });
  const sub = subs[0];
  if (!sub.email) return res.status(400).json({ message: "لا يوجد بريد إلكتروني للكاتب" });
  if (!sub.report_token) return res.status(500).json({ message: "رمز التقرير غير متوفر" });

  const covResp = await fetch(
    url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(subId) + "&select=status",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const covs = covResp.ok ? await covResp.json() : [];
  if (!covs.length || covs[0].status !== "completed") {
    return res.status(400).json({ message: "التقرير غير مكتمل بعد" });
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
      console.error("Resend send-report failed:", r.status, detail);
      return res.status(502).json({ message: "تعذّر إرسال التقرير" });
    }
  } catch (err) {
    console.error("send-report error:", err);
    return res.status(500).json({ message: "تعذّر إرسال التقرير" });
  }

  // Record the delivery (who sent it, when) — powers the reader's "Delivered by
  // me" tab. Best-effort: the email already went out, so don't fail on this.
  try {
    await fetch(
      url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(subId),
      {
        method: "PATCH",
        headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ delivered_at: new Date().toISOString(), delivered_by: gate.user.id }),
      }
    );
  } catch (err) {
    console.error("send-report: delivery-stamp failed:", err);
  }

  return res.status(200).json({ ok: true });
};

