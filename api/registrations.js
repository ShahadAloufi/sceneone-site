// Vercel serverless function — handles the "Register Interest" form.
// Sends an email via Resend's REST API. The API key is read from the
// RESEND_API_KEY environment variable (set in Vercel project settings),
// so it is never exposed to the browser.

const TO_ADDRESS = "sceneone.info@gmail.com";
const FROM_ADDRESS = "Scene One <onboarding@resend.dev>";
const SUBJECT = "New Interest Registration - Scene One";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const body = req.body || {};
  const name = (body.name || "").toString().trim();
  const email = (body.email || "").toString().trim();
  const phone = (body.phone || "").toString().trim();
  const type = (body.type || "").toString().trim();
  const notes = (body.notes || "").toString().trim();

  // Server-side validation (mirrors the client checks).
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (name.length < 2 || !emailRe.test(email) || type.length < 1) {
    return res.status(400).json({ message: "بيانات غير صحيحة" });
  }

  var apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured");
    return res.status(500).json({ message: "تعذّر إرسال التسجيل" });
  }

  var rows = [
    ["الاسم", name],
    ["البريد الإلكتروني", email],
    ["رقم الهاتف", phone || "—"],
    ["نوع الاهتمام", type],
    ["ملاحظات", notes || "—"],
  ];

  var html =
    '<div dir="rtl" style="font-family: Arial, sans-serif; font-size: 15px; color: #1a1a1a;">' +
    '<h2 style="margin: 0 0 16px;">تسجيل اهتمام جديد - Scene One</h2>' +
    '<table style="border-collapse: collapse; width: 100%; max-width: 600px;">' +
    rows
      .map(function (r) {
        return (
          "<tr>" +
          '<td style="padding: 8px 12px; border: 1px solid #e2e2e2; background: #f7f7f7; font-weight: bold; white-space: nowrap;">' +
          r[0] +
          "</td>" +
          '<td style="padding: 8px 12px; border: 1px solid #e2e2e2;">' +
          escapeHtml(r[1]) +
          "</td>" +
          "</tr>"
        );
      })
      .join("") +
    "</table></div>";

  var text = rows
    .map(function (r) {
      return r[0] + ": " + r[1];
    })
    .join("\n");

  try {
    var resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: TO_ADDRESS,
        reply_to: email,
        subject: SUBJECT,
        html: html,
        text: text,
      }),
    });

    if (!resp.ok) {
      var detail = await resp.text();
      console.error("Resend failed:", resp.status, detail);
      return res.status(502).json({ message: "تعذّر إرسال التسجيل" });
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Resend request error:", err);
    return res.status(500).json({ message: "تعذّر إرسال التسجيل" });
  }
};
