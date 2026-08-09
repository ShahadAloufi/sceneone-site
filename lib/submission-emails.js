// Emails sent when a submission is PAID FOR — moved here out of
// api/submissions.js so the payment webhook can send them.
//
// Nothing goes out at submission time any more: until Moyasar confirms the
// payment the script isn't in the pipeline, so telling the writer "a reader
// will review it" (or alerting the team) would be premature.
//
// Optional environment variables:
//   RESEND_API_KEY — when unset, both sends are silently skipped
//   SITE_URL       — dashboard link in the team notification

// All submission notifications go to this shared inbox.
const NOTIFY_TO = "sceneone.info@gmail.com";
// Sender must be on a domain you've VERIFIED in Resend (Domains → Add Domain).
const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
// Used for the dashboard link in the team notification email.
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";

// Writer's self-declared level, for the team notification. Keys match
// WRITER_LEVELS in api/submissions.js; an unknown key falls through to itself
// rather than blanking the row.
const LEVEL_AR = {
  new: "كاتب جديد",
  emerging: "كاتب ناشئ",
  professional: "كاتب محترف",
  veteran: "كاتب متمرّس",
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Internal "new submission" email for the team. Same brand shell as the writer
// emails (background, white card, wordmark) but the body stays a scannable
// key/value table rather than centered prose — this is a working notification,
// so legibility of the fields matters more than styling. Ends with a CTA into
// the dashboard, where the script is actually picked up.
function notificationEmail(row, rows) {
  var esc = escapeHtml;
  var title = row.title_ar || row.title_en || "";
  var keyCell = "padding:9px 12px;border-bottom:1px solid #ece7df;font-size:13px;color:#8a8178;font-weight:700;white-space:nowrap;vertical-align:top;";
  var valCell = "padding:9px 12px;border-bottom:1px solid #ece7df;font-size:13.5px;color:#4a453f;line-height:1.7;";

  var body = rows.map(function (r) {
    var v = (r[1] == null || r[1] === "") ? "—" : r[1];
    return '<tr><td style="' + keyCell + '">' + esc(r[0]) + "</td>" +
           '<td style="' + valCell + '">' + esc(v) + "</td></tr>";
  }).join("");

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:40px 36px;">' +

            '<div style="text-align:center;font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 26px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;color:#15110f;font-weight:700;text-align:center;">نص جديد مدفوع</h1>' +
            '<p style="margin:0 0 26px;text-align:center;color:#8a8178;font-size:13px;">' +
              (title ? "العنوان: <strong style=\"color:#15110f;\">" + esc(title) + "</strong>" : "&nbsp;") +
            "</p>" +

            '<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">' +
              body +
            "</table>" +

            '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;"><tr>' +
              '<td style="border-radius:12px;background:#111111;">' +
                '<a href="' + esc(SITE_URL) + '/admin" style="display:inline-block;padding:14px 34px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:12px;">فتح لوحة التحكم</a>' +
              "</td></tr></table>" +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

async function sendNotification(row) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // notifications are optional

  const recipients = [NOTIFY_TO];

  const rows = [
    ["العنوان (عربي)", row.title_ar],
    ["العنوان (إنجليزي)", row.title_en],
    ["البريد الإلكتروني", row.email],
    ["الكاتب", row.writer],
    ["مستوى الكاتب", LEVEL_AR[row.writer_level] || row.writer_level],
    ["النوع", row.genre],
    ["نوع الفيلم", row.film_type],
    ["المسودة", row.draft],
    ["المدة", row.duration || "—"],
    ["الثيم", row.theme || "—"],
    ["Logline", row.logline || "—"],
    ["رؤية الكاتب", row.vision],
    ["الحقوق مسجّلة", row.ip_registered ? "نعم" : "لا"],
    ["الملف", row.file_name || "—"],
  ];

  const html = notificationEmail(row, rows);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: recipients,
        reply_to: row.email,
        subject: "New Paid Submission - Scene One",
        html: html,
      }),
    });
  } catch (err) {
    // Don't fail the webhook if the email fails — the payment is already recorded.
    console.error("Notification email failed:", err);
  }
}

// Bilingual "we received your script" email. Deliberately mirrors the report
// email in api/review-coverage.js — same warm background, centered white card,
// Scene One wordmark, Arabic block then an English block — so the two messages a
// writer gets look like one brand. No CTA button here: there's nothing to open
// yet (the report link only exists once staff approve the coverage).
function confirmationEmail(row) {
  var esc = escapeHtml;
  var title = row.title_ar || row.title_en || "";
  var name = (row.writer || "").toString().trim();

  var arHi = name ? "مرحبًا " + esc(name) + "،" : "مرحبًا،";
  var enHi = name ? "Hello " + esc(name) + "," : "Hello,";

  var titleLine = title
    ? '<p style="margin:0 0 24px;color:#8a8178;font-size:13px;">العنوان: ' +
      '<strong style="color:#15110f;">' + esc(title) + "</strong></p>"
    : "";

  var bodyStyle = "margin:0 auto;max-width:440px;font-size:15px;line-height:1.9;color:#4a453f;";

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:46px 44px;text-align:center;">' +

            '<div style="font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 30px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 14px;font-size:25px;line-height:1.3;color:#15110f;font-weight:700;">تم تأكيد الدفع واستلام نصك</h1>' +

            titleLine +

            '<p dir="rtl" style="' + bodyStyle + '">' +
              arHi +
              "<br>شكرًا لتقديم نصك إلى Scene One. تم تأكيد الدفع واستلام طلبك، وسيقوم أحد قرّائنا بمراجعته، ثم نرسل إليك تقرير التقييم عبر بريدك الإلكتروني." +
            "</p>" +

            '<hr style="border:0;border-top:1px solid #ece7df;width:78%;margin:26px auto;">' +

            '<p dir="ltr" style="' + bodyStyle + '">' +
              enHi +
              "<br>Thanks for submitting your script to Scene One. Your payment is confirmed and we've received it — one of our readers will review it, and we'll email you the coverage report when it's ready." +
            "</p>" +

            '<p style="margin:30px 0 0;color:#a49b90;font-size:12.5px;"> The Scene One team</p>' +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

// Sends a confirmation email to the writer who submitted the script.
async function sendConfirmation(row) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !row.email) return; // optional; requires a valid recipient

  const html = confirmationEmail(row);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [row.email],
        reply_to: NOTIFY_TO,
        subject: "تم تأكيد الدفع واستلام نصك - Scene One",
        html: html,
      }),
    });
  } catch (err) {
    // Don't fail the webhook if the confirmation email fails.
    console.error("Confirmation email failed:", err);
  }
}

// "Complete your payment" prompt, sent right after submission. This is the ONLY
// email that goes out before money clears, and it deliberately promises nothing
// about review — it exists so a writer who closes the checkout tab still has a
// way back to their invoice. Same shell as the other writer emails, plus a CTA.
function paymentEmail(row, paymentUrl) {
  var esc = escapeHtml;
  var title = row.title_ar || row.title_en || "";
  var name = (row.writer || "").toString().trim();

  var arHi = name ? "مرحبًا " + esc(name) + "،" : "مرحبًا،";
  var enHi = name ? "Hello " + esc(name) + "," : "Hello,";

  var titleLine = title
    ? '<p style="margin:0 0 24px;color:#8a8178;font-size:13px;">العنوان: ' +
      '<strong style="color:#15110f;">' + esc(title) + "</strong></p>"
    : "";

  var bodyStyle = "margin:0 auto;max-width:440px;font-size:15px;line-height:1.9;color:#4a453f;";

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:46px 44px;text-align:center;">' +

            '<div style="font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 30px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 14px;font-size:25px;line-height:1.3;color:#15110f;font-weight:700;">أكمل دفع رسوم التغطية</h1>' +

            titleLine +

            '<p dir="rtl" style="' + bodyStyle + '">' +
              arHi +
              "<br>تم استلام نصك. لإتمام الطلب وبدء عملية التغطية، يرجى إكمال الدفع عبر الرابط أدناه. سيدخل نصك قائمة المراجعة فور تأكيد الدفع." +
            "</p>" +

            '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;"><tr>' +
              '<td style="border-radius:12px;background:#111111;">' +
                '<a href="' + esc(paymentUrl) + '" style="display:inline-block;padding:14px 34px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:12px;">إتمام الدفع</a>' +
              "</td></tr></table>" +

            '<hr style="border:0;border-top:1px solid #ece7df;width:78%;margin:26px auto;">' +

            '<p dir="ltr" style="' + bodyStyle + '">' +
              enHi +
              "<br>We've received your script. To complete your order and start the coverage process, please finish your payment using the button above. Your script enters the review queue as soon as the payment is confirmed." +
            "</p>" +

            '<p style="margin:30px 0 0;color:#a49b90;font-size:12.5px;"> The Scene One team</p>' +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

// Emails the writer their checkout link. Never throws — a submission that is
// saved and has a valid invoice must not fail because Resend is down.
async function sendPaymentPrompt(row, paymentUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !row.email || !paymentUrl) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [row.email],
        reply_to: NOTIFY_TO,
        subject: "أكمل دفع رسوم تغطية نصك - Scene One",
        html: paymentEmail(row, paymentUrl),
      }),
    });
  } catch (err) {
    console.error("Payment prompt email failed:", err);
  }
}

// Broadcast to every reader (senior_reader + junior_reader) once a script is
// released into the claimable pool. Deliberately says nothing about the
// writer's level or whether the recipient is even eligible to claim it — the
// dashboard and /api/claim-script are what actually gate a claim (junior
// readers off professional/veteran writers, one active assignment per reader);
// this email is just "something landed, go look." Reuses the notification
// shell but keeps the writer's identity out of it (readers claim before they
// see who wrote it), unlike notificationEmail which is staff-only.
function readerNoticeEmail() {
  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:46px 44px;text-align:center;">' +

            '<div style="font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 30px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 14px;font-size:25px;line-height:1.3;color:#15110f;font-weight:700;">تكليف جديد متاح على Scene One</h1>' +

            '<p dir="rtl" style="margin:0 auto;max-width:440px;font-size:15px;line-height:1.9;color:#4a453f;">' +
              "تمت إضافة تكليف جديد على المنصة. يمكنك تسجيل الدخول للاطلاع على تفاصيل النص ومستوى الكاتب وقبول التكليف إذا كان مناسبًا لك." +
            "</p>" +

            '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;"><tr>' +
              '<td style="border-radius:12px;background:#111111;">' +
                '<a href="' + escapeHtml(SITE_URL) + '/admin" style="display:inline-block;padding:14px 34px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:12px;">فتح لوحة التحكم</a>' +
              "</td></tr></table>" +

            '<p style="margin:30px 0 0;color:#a49b90;font-size:12.5px;"> The Scene One team</p>' +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

// Looks up every active reader's email and sends them the notice above. Takes
// the Supabase URL/service-role key as arguments (rather than reading env vars
// itself) because the only caller already has them in scope from its own
// env-var check — no reason to re-read what the caller already validated.
//
// Never throws: a Resend or Supabase hiccup here must not turn a successful
// payment into a failed webhook response (Moyasar would retry and re-charge the
// idempotency logic, not the email). Logs and returns instead.
async function sendReaderNotice(supabaseUrl, serviceKey) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  let emails = [];
  try {
    const resp = await fetch(
      supabaseUrl + "/rest/v1/admins?role=in.(senior_reader,junior_reader)&select=email",
      { headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey } }
    );
    if (!resp.ok) {
      console.error("Reader notice: admins lookup failed:", resp.status, await resp.text());
      return;
    }
    const rows = await resp.json();
    emails = rows.map((r) => r.email).filter(Boolean);
  } catch (err) {
    console.error("Reader notice: admins lookup error:", err);
    return;
  }
  if (!emails.length) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        // One send, every reader BCC'd — a claimable script is visible to all of
        // them anyway (it's not private data), and this avoids one Resend call
        // per reader for what is otherwise identical mail.
        to: [NOTIFY_FROM],
        bcc: emails,
        reply_to: NOTIFY_TO,
        subject: "تكليف جديد متاح - Scene One",
        html: readerNoticeEmail(),
      }),
    });
  } catch (err) {
    console.error("Reader notice email failed:", err);
  }
}

// Internal "this script was refunded" alert. Staff-only: the writer already
// knows (they asked for the refund, or we issued it), so this exists purely so
// nobody keeps working on a script that is no longer paid for.
//
// The headline is the disposition, because that's the only thing the reader of
// this email has to act on: a pulled script needs nothing, a script still with a
// reader needs a human decision. Deliberately reuses the notification shell.
function refundEmail(row, info) {
  var esc = escapeHtml;
  var title = row.title_ar || row.title_en || "";
  var keyCell = "padding:9px 12px;border-bottom:1px solid #ece7df;font-size:13px;color:#8a8178;font-weight:700;white-space:nowrap;vertical-align:top;";
  var valCell = "padding:9px 12px;border-bottom:1px solid #ece7df;font-size:13.5px;color:#4a453f;line-height:1.7;";

  var headline = info.pulled
    ? "تم سحب النص من قائمة المراجعة"
    : "النص ما زال مع أحد القرّاء — يحتاج قرارًا";
  var note = info.pulled
    ? "لم يكن النص مسندًا لأي قارئ، فتم إخراجه من القائمة تلقائيًا. لا يلزم اتخاذ أي إجراء."
    : "تم استرداد المبلغ بينما النص قيد المراجعة. لم يُغيَّر الإسناد تلقائيًا — يرجى مراجعة الحالة يدويًا.";

  var rows = [
    ["العنوان (عربي)", row.title_ar],
    ["العنوان (إنجليزي)", row.title_en],
    ["البريد الإلكتروني", row.email],
    ["الكاتب", row.writer],
    ["حالة النص الآن", info.pulled ? "refunded (خارج القائمة)" : row.status],
    ["المبلغ المدفوع", info.paidAmount],
    ["المبلغ المسترد", info.refundedAmount],
    ["رقم العملية", info.paymentId],
  ];

  var body = rows.map(function (r) {
    var v = (r[1] == null || r[1] === "") ? "—" : r[1];
    return '<tr><td style="' + keyCell + '">' + esc(r[0]) + "</td>" +
           '<td style="' + valCell + '">' + esc(v) + "</td></tr>";
  }).join("");

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:40px 36px;">' +

            '<div style="text-align:center;font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 26px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;color:#15110f;font-weight:700;text-align:center;">' + esc(headline) + "</h1>" +
            '<p style="margin:0 0 20px;text-align:center;color:#8a8178;font-size:13px;">' +
              (title ? "العنوان: <strong style=\"color:#15110f;\">" + esc(title) + "</strong>" : "&nbsp;") +
            "</p>" +

            '<p dir="rtl" style="margin:0 0 24px;padding:13px 16px;background:#faf7f1;border-radius:12px;font-size:13.5px;line-height:1.8;color:#4a453f;">' +
              esc(note) +
            "</p>" +

            '<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">' +
              body +
            "</table>" +

            '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;"><tr>' +
              '<td style="border-radius:12px;background:#111111;">' +
                '<a href="' + esc(SITE_URL) + '/admin" style="display:inline-block;padding:14px 34px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:12px;">فتح لوحة التحكم</a>' +
              "</td></tr></table>" +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

// The webhook could not reconcile a Moyasar event against a submission. Every
// case below means Moyasar and our database disagree about money, and because
// the webhook answers 200 (retrying would never fix any of them) this email is
// the ONLY signal a human gets. Same shell as the refund alert; there is no row
// to render, so it reports the payment instead.
var UNRECONCILED = {
  amount_mismatch: {
    headline: "مبلغ مدفوع لا يطابق المبلغ المطلوب",
    note: "وصل إشعار دفع بمبلغ يختلف عن المبلغ المسجَّل للنص، فلم تُغيَّر حالته. راجع العملية في لوحة ميسر وقرر: إكمال الدفع أو استرداده.",
  },
  status_mismatch: {
    headline: "إشعار دفع بحالة غير متوقعة",
    note: "أعادت ميسر حالة للعملية تختلف عمّا يعلنه الإشعار، فلم يُتخذ أي إجراء. راجع العملية في لوحة ميسر.",
  },
  unmatched: {
    headline: "عملية دفع بلا نص مرتبط",
    note: "لم يُعثر على أي نص مرتبط بهذه العملية، فلم يُتخذ أي إجراء. الأرجح أن ربط الفاتورة بالنص لم يُحفظ وقت الإرسال — ابحث عن النص بالبريد الإلكتروني للكاتب واربطه يدويًا.",
  },
};

function unreconciledEmail(info) {
  var esc = escapeHtml;
  var reason = UNRECONCILED[info.reason] || UNRECONCILED.status_mismatch;
  var keyCell = "padding:9px 12px;border-bottom:1px solid #ece7df;font-size:13px;color:#8a8178;font-weight:700;white-space:nowrap;vertical-align:top;";
  var valCell = "padding:9px 12px;border-bottom:1px solid #ece7df;font-size:13.5px;color:#4a453f;line-height:1.7;";

  var rows = [
    ["نوع الإشعار", info.eventType],
    ["رقم العملية", info.paymentId],
    ["حالة العملية لدى ميسر", info.paymentStatus],
    ["المبلغ المدفوع", info.paidAmount],
    ["المبلغ المطلوب", info.quotedAmount],
    ["رقم الفاتورة", info.invoiceId],
    ["النص", info.submissionId],
  ];

  var body = rows.map(function (r) {
    var v = (r[1] == null || r[1] === "") ? "—" : r[1];
    return '<tr><td style="' + keyCell + '">' + esc(r[0]) + "</td>" +
           '<td style="' + valCell + '">' + esc(v) + "</td></tr>";
  }).join("");

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:40px 36px;">' +

            '<div style="text-align:center;font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 26px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#15110f;font-weight:700;text-align:center;">' + esc(reason.headline) + "</h1>" +

            '<p dir="rtl" style="margin:0 0 24px;padding:13px 16px;background:#faf7f1;border-radius:12px;font-size:13.5px;line-height:1.8;color:#4a453f;">' +
              esc(reason.note) +
            "</p>" +

            '<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">' +
              body +
            "</table>" +

            '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;"><tr>' +
              '<td style="border-radius:12px;background:#111111;">' +
                '<a href="' + esc(SITE_URL) + '/admin" style="display:inline-block;padding:14px 34px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:12px;">فتح لوحة التحكم</a>' +
              "</td></tr></table>" +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

// Never throws — the webhook has already decided to answer 200, and turning a
// Resend outage into a 502 would replay the whole delivery.
async function sendUnreconciledAlert(info) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        subject: "Payment needs review - ACTION NEEDED - Scene One",
        html: unreconciledEmail(info),
      }),
    });
  } catch (err) {
    console.error("Unreconciled payment alert failed:", err);
  }
}

// Alerts the team that a submission was refunded. Never throws — the refund is
// already recorded in the database by the time this runs.
async function sendRefundAlert(row, info) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // notifications are optional

  // An unattended refund on a script someone is actively reading is the case
  // that costs money, so it says so in the subject line.
  const subject = info.pulled
    ? "Refunded - script pulled from the queue - Scene One"
    : "Refunded - ACTION NEEDED, script still assigned - Scene One";

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        subject: subject,
        html: refundEmail(row, info),
      }),
    });
  } catch (err) {
    console.error("Refund alert email failed:", err);
  }
}

module.exports = {
  sendNotification, sendConfirmation, sendPaymentPrompt, sendRefundAlert,
  sendUnreconciledAlert, sendReaderNotice,
};
