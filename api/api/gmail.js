const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

function getAccessToken(req) {
  const cookie = req.headers.cookie || "";
  const sessionCookie = cookie.split(";").find(c => c.trim().startsWith("session="));
  if (!sessionCookie) return null;
  try {
    const session = JSON.parse(Buffer.from(sessionCookie.split("=")[1].trim(), "base64").toString());
    if (session.exp < Date.now()) return null;
    return session.gmailToken || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action } = req.query;
  const token = getAccessToken(req);
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  // 取得最近信件列表
  if (action === "list") {
    try {
      const r = await fetch(`${GMAIL_API}/messages?maxResults=20&q=is:unread`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      if (!data.messages) return res.status(200).json([]);

      // 取得每封信件的摘要
      const messages = await Promise.all(
        data.messages.slice(0, 10).map(async m => {
          const mr = await fetch(`${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const md = await mr.json();
          const headers = md.payload?.headers || [];
          const subject = headers.find(h => h.name === "Subject")?.value || "(無主旨)";
          const from = headers.find(h => h.name === "From")?.value || "";
          const date = headers.find(h => h.name === "Date")?.value || "";
          return { id: m.id, subject, from, date };
        })
      );
      return res.status(200).json(messages);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 取得單封信件完整內容
  if (action === "get" && req.query.id) {
    try {
      const r = await fetch(`${GMAIL_API}/messages/${req.query.id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      
      // 解析信件內文
      let body = "";
      const parts = data.payload?.parts || [data.payload];
      for (const part of parts) {
        if (part?.mimeType === "text/plain" && part?.body?.data) {
          body += Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }
      
      const headers = data.payload?.headers || [];
      const subject = headers.find(h => h.name === "Subject")?.value || "";
      const from = headers.find(h => h.name === "From")?.value || "";
      const date = headers.find(h => h.name === "Date")?.value || "";
      
      return res.status(200).json({ id: data.id, subject, from, date, body });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: "Unknown action" });
}
