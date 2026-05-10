const ALLOWED_EMAILS = [
  "0943237594benny@gmail.com",
  "benny0401@gmail.com"
];

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export default async function handler(req, res) {
  const { code, error } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL || "https://course-manager-xi.vercel.app";
  const redirectUri = `${baseUrl}/api/callback`;

  if (error || !code) return res.redirect("/?error=no_code");

  try {
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

    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    if (!ALLOWED_EMAILS.includes(user.email)) {
      return res.redirect("/?error=unauthorized");
    }

    const session = Buffer.from(JSON.stringify({
      email: user.email,
      name: user.name,
      picture: user.picture,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })).toString("base64");

    res.setHeader("Set-Cookie", `session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
    return res.redirect("/");
  } catch (e) {
    return res.redirect("/?error=auth_failed");
  }
}
