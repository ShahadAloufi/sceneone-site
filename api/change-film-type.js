// Vercel serverless function — staff correct a submission's film type.
//
//   POST /api/change-film-type  { submission_id, to }
//
// Writers pick the product themselves, and they sometimes pick wrong — choosing
// feature coverage and uploading a 12-page short, say. The type drives the report
// header, the deadline, and the coverage SCHEMA, so leaving it wrong makes the
// delivered report say something untrue about the work.
//
// Deliberately NOT a free-form edit:
//
//   • staff only (admin / super_admin) — readers cannot reclassify their own work
//   • WITHIN THE SAME FAMILY only. A script type may become the other script type;
//     a treatment may become the other treatment. Crossing between them would
//     change which schema the coverage renders under (8 script points vs 9
//     treatment ones), so a reader's saved evaluation would still be in the
//     database but would no longer appear in the report — silently. If that
//     conversion is ever genuinely needed it has to move the coverage data too,
//     which is a migration, not a dropdown.
//   • `payment_amount` is NEVER touched. It records what the writer was actually
//     charged and must keep matching the real Moyasar invoice; a correction here
//     is about describing the work, not re-pricing it. Refunding or topping up a
//     difference is a human decision made in the Moyasar dashboard.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const SCRIPT_TYPES = ["short", "feature"];
const TREATMENT_TYPES = ["treatment_short", "treatment_feature"];

function familyOf(t) {
  if (SCRIPT_TYPES.indexOf(t) !== -1) return "script";
  if (TREATMENT_TYPES.indexOf(t) !== -1) return "treatment";
  return null;                       // retired types (short_under_30) included
}

async function requireStaff(req, url, key) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: 401, message: "غير مصرّح" };
  const userResp = await fetch(url + "/auth/v1/user", {
    headers: { apikey: key, Authorization: "Bearer " + token },
  });
  if (!userResp.ok) return { error: 401, message: "جلسة غير صالحة" };
  const user = await userResp.json();
  if (!user || !user.id) return { error: 401, message: "جلسة غير صالحة" };
  const rowResp = await fetch(
    url + "/rest/v1/admins?id=eq." + encodeURIComponent(user.id) + "&select=id,role",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const rows = rowResp.ok ? await rowResp.json() : [];
  if (!rows.length) return { error: 403, message: "غير مصرّح" };
  const role = rows[0].role;
  if (role !== "admin" && role !== "super_admin") {
    return { error: 403, message: "تغيير نوع العمل مخصص للمشرفين" };
  }
  return { me: rows[0] };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("change-film-type: env vars are not configured");
    return res.status(500).json({ message: "الخادم غير مهيأ" });
  }

  const gate = await requireStaff(req, url, key);
  if (gate.error) return res.status(gate.error).json({ message: gate.message });

  const b = req.body || {};
  const subId = (b.submission_id || "").toString().trim();
  const to = (b.to || "").toString().trim();
  if (!subId || !to) return res.status(400).json({ message: "بيانات ناقصة" });

  const headers = { apikey: key, Authorization: "Bearer " + key };
  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId) +
    "&select=id,film_type,payment_amount",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "النص غير موجود" });
  const from = subs[0].film_type;

  if (to === from) return res.status(200).json({ ok: true, film_type: to });

  const fromFamily = familyOf(from);
  const toFamily = familyOf(to);
  if (!toFamily) return res.status(400).json({ message: "نوع غير معروف" });
  if (fromFamily !== toFamily) {
    // The one conversion this endpoint refuses — see the note at the top.
    return res.status(409).json({
      message: "لا يمكن التحويل بين تغطية النص وتغطية المعالجة، لاختلاف بنية التقييم.",
    });
  }

  const patch = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId) +
    // Filtered on the value we read, so two staff correcting the same row at once
    // cannot overwrite each other's decision.
    "&film_type=eq." + encodeURIComponent(from),
    {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json", Prefer: "return=representation" }, headers),
      body: JSON.stringify({ film_type: to }),
    }
  );
  if (!patch.ok) {
    console.error("change-film-type failed:", patch.status, await patch.text());
    return res.status(502).json({ message: "تعذّر تغيير نوع العمل" });
  }
  const updated = await patch.json();
  if (!updated.length) {
    return res.status(409).json({ message: "تغيّر نوع العمل قبل حفظ التعديل، حدّث الصفحة" });
  }

  // The amount charged is deliberately left alone; log the pair so a later
  // question about "why is this a short at 1200 SAR" has an answer.
  console.log("change-film-type: " + subId + " " + from + " → " + to +
              " by " + gate.me.id + " (payment_amount unchanged: " + subs[0].payment_amount + ")");

  return res.status(200).json({ ok: true, film_type: to, from: from });
};
