const ALLOWED_EMAILS = [
  "0943237594benny@gmail.com",
  "benny0401@gmail.com"
];

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL || "https://course-manager-xi.vercel.app";
  const redirectUri = `${baseUrl}/api/auth?action=callback`;

  // 產生 Google 登入網址
  if (action === "login") {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  // Google 登入後的 callback
  if (action === "callback") {
    const { code } = req.query;
    if (!code) return res.redirect("/?error=no_code");

    try {
      // 用 code 換取 token
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) return res.redirect("/?error=token_failed");

      // 取得使用者資訊
      const userRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const user = await userRes.json();

      // 檢查是否在允許名單
      if (!ALLOWED_EMAILS.includes(user.email)) {
        return res.redirect("/?error=unauthorized");
      }

      // 設定 session cookie
      const session = Buffer.from(JSON.stringify({
        email: user.email,
        name: user.name,
        picture: user.picture,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天
      })).toString("base64");

      res.setHeader("Set-Cookie", `session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
      return res.redirect("/");
    } catch (e) {
      return res.redirect("/?error=auth_failed");
    }
  }

  // 取得目前登入狀態
  if (action === "me" && req.method === "GET") {
    const cookie = req.headers.cookie || "";
    const sessionCookie = cookie.split(";").find(c => c.trim().startsWith("session="));
    if (!sessionCookie) return res.status(401).json({ error: "Not logged in" });

    try {
      const session = JSON.parse(Buffer.from(sessionCookie.split("=")[1].trim(), "base64").toString());
      if (session.exp < Date.now()) return res.status(401).json({ error: "Session expired" });
      return res.status(200).json({ email: session.email, name: session.name, picture: session.picture });
    } catch {
      return res.status(401).json({ error: "Invalid session" });
    }
  }

  // 登出
  if (action === "logout") {
    res.setHeader("Set-Cookie", "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    return res.redirect("/");
  }

  return res.status(400).json({ error: "Unknown action" });
}
