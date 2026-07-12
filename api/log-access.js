// Vercel serverless function — records a dashboard access event for the signed-in
// admin/reader, so a super-admin can spot accounts used from many IPs (shared
// access). Called by the client right after a successful sign-in.
//
//   POST /api/log-access   (Authorization: Bearer <access_token>)
//
// The client IP is read server-side from the proxy headers (never trusted from
// the browser). The row is written with the service-role key; reads are gated by
// RLS to super-admins only.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

// The real client IP as seen by Vercel's edge (first hop of x-forwarded-for).
function clientIp(req) {
  var xff = (req.headers["x-forwarded-for"] || "").toString();
  if (xff) return xff.split(",")[0].trim();
  return (req.headers["x-real-ip"] || "").toString().trim() || null;
}

// Resolve the caller from their bearer token and confirm they are an admin/reader.
async function requireAdmin(req) {
  const { url, key } = svc();
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: 401 };
  const userResp = await fetch(url + "/auth/v1/user", {
    headers: { apikey: key, Authorization: "Bearer " + token },
  });
  if (!userResp.ok) return { error: 401 };
  const user = await userResp.json();
  if (!user || !user.id) return { error: 401 };
  const roleResp = await fetch(
    url + "/rest/v1/admins?id=eq." + user.id + "&select=id",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const rows = roleResp.ok ? await roleResp.json() : [];
  if (!rows.length) return { error: 403 };
  return { user };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { url, key } = svc();
  if (!url || !key) {
    console.error("Supabase env vars are not configured");
    return res.status(500).json({ message: "Server not configured" });
  }

  const gate = await requireAdmin(req);
  if (gate.error) return res.status(gate.error).json({ ok: false });

  const ua = (req.headers["user-agent"] || "").toString().slice(0, 400);
  const row = { admin_id: gate.user.id, ip: clientIp(req), user_agent: ua };

  try {
    const r = await fetch(url + "/rest/v1/access_log", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("access_log insert failed:", r.status, detail);
      // Non-fatal: never block sign-in on a logging failure.
      return res.status(200).json({ ok: false });
    }
  } catch (err) {
    console.error("log-access error:", err);
    return res.status(200).json({ ok: false });
  }

  return res.status(200).json({ ok: true });
};
