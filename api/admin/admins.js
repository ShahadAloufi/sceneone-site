// Vercel serverless function — admin management (super-admin only).
//
//   POST   /api/admin/admins   { name, email, password, role }  -> create admin
//   DELETE /api/admin/admins?id=<uuid>                          -> remove admin
//
// The caller must send their Supabase session access token as
// `Authorization: Bearer <token>`. We verify that token maps to a user whose
// role is `super_admin` before doing anything. All privileged operations use
// the service-role key, which is server-side only.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

function svc() {
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

// Resolve the caller from their bearer token, then confirm super_admin role.
async function requireSuperAdmin(req) {
  const { url, key } = svc();
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: 401, message: "غير مصرّح" };

  // Who is this token?
  const userResp = await fetch(url + "/auth/v1/user", {
    headers: { apikey: key, Authorization: "Bearer " + token },
  });
  if (!userResp.ok) return { error: 401, message: "جلسة غير صالحة" };
  const user = await userResp.json();
  if (!user || !user.id) return { error: 401, message: "جلسة غير صالحة" };

  // Are they a super_admin?
  const roleResp = await fetch(
    url + "/rest/v1/admins?id=eq." + user.id + "&select=role",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const rows = roleResp.ok ? await roleResp.json() : [];
  if (!rows.length || rows[0].role !== "super_admin") {
    return { error: 403, message: "هذه العملية مخصّصة للمشرف الأعلى فقط" };
  }
  return { user };
}

module.exports = async (req, res) => {
  const { url, key } = svc();
  if (!url || !key) {
    console.error("Supabase env vars are not configured");
    return res.status(500).json({ message: "الخادم غير مهيأ" });
  }

  const gate = await requireSuperAdmin(req);
  if (gate.error) return res.status(gate.error).json({ message: gate.message });

  // -------- CREATE --------
  if (req.method === "POST") {
    const b = req.body || {};
    const name = (b.name || "").toString().trim();
    const email = (b.email || "").toString().trim().toLowerCase();
    const password = (b.password || "").toString();
    const ALLOWED_ROLES = ["admin", "super_admin", "senior_reader", "junior_reader"];
    const role = ALLOWED_ROLES.indexOf(b.role) !== -1 ? b.role : "admin";

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (name.length < 2 || !emailRe.test(email) || password.length < 8) {
      return res.status(400).json({
        message: "الاسم والبريد مطلوبان وكلمة المرور 8 أحرف على الأقل",
      });
    }

    // 1) Create the auth user (auto-confirmed so they can log in immediately).
    const createResp = await fetch(url + "/auth/v1/admin/users", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email, password: password, email_confirm: true }),
    });
    if (!createResp.ok) {
      const detail = await createResp.text();
      console.error("Auth create failed:", createResp.status, detail);
      const msg = /already|exists|registered/i.test(detail)
        ? "هذا البريد مسجّل بالفعل"
        : "تعذّر إنشاء الحساب";
      return res.status(400).json({ message: msg });
    }
    const created = await createResp.json();
    const newId = created.id || (created.user && created.user.id);

    // 2) Insert the matching admins row.
    const insertResp = await fetch(url + "/rest/v1/admins", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ id: newId, email: email, name: name, role: role }),
    });
    if (!insertResp.ok) {
      const detail = await insertResp.text();
      console.error("Admins insert failed:", insertResp.status, detail);
      // Roll back the auth user so we don't leave an orphaned account.
      await fetch(url + "/auth/v1/admin/users/" + newId, {
        method: "DELETE",
        headers: { apikey: key, Authorization: "Bearer " + key },
      }).catch(function () {});
      return res.status(502).json({ message: "تعذّر إنشاء المشرف" });
    }

    return res.status(201).json({ ok: true, id: newId });
  }

  // -------- DELETE --------
  if (req.method === "DELETE") {
    const id = (req.query && req.query.id ? req.query.id : "").toString();
    if (!id) return res.status(400).json({ message: "معرّف مطلوب" });
    if (id === gate.user.id) {
      return res.status(400).json({ message: "لا يمكنك حذف حسابك الخاص" });
    }
    // Deleting the auth user cascades the admins row (FK on delete cascade).
    const delResp = await fetch(url + "/auth/v1/admin/users/" + id, {
      method: "DELETE",
      headers: { apikey: key, Authorization: "Bearer " + key },
    });
    if (!delResp.ok) {
      const detail = await delResp.text();
      console.error("Auth delete failed:", delResp.status, detail);
      return res.status(502).json({ message: "تعذّر حذف المشرف" });
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "POST, DELETE");
  return res.status(405).json({ message: "Method not allowed" });
};
