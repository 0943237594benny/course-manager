const NOTION_API = "https://api.notion.com/v1";
const SCHEDULE_DB_ID = "f4ad2a39bba14ed69c0fe766bbdbce75";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const key = process.env.NOTION_API_KEY;
  if (!key) return res.status(500).json({ error: "Missing NOTION_API_KEY" });

  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
  };

  const { action, pageId } = req.query;

  try {
    // 取得所有調整
    if (req.method === "GET" && action === "list") {
      const r = await fetch(`${NOTION_API}/databases/${SCHEDULE_DB_ID}/query`, {
        method: "POST", headers,
        body: JSON.stringify({ sorts: [{ property: "日期", direction: "ascending" }], page_size: 200 }),
      });
      const data = await r.json();
      if (data.object === 'error') return res.status(400).json({ error: data.message });
      return res.status(200).json((data.results || []).map(mapPage));
    }

    // 新增調整
    if (req.method === "POST" && action === "create") {
      const b = req.body;
      const r = await fetch(`${NOTION_API}/pages`, {
        method: "POST", headers,
        body: JSON.stringify({
          parent: { database_id: SCHEDULE_DB_ID },
          properties: {
            Name: { title: [{ text: { content: b.date || "" } }] },
            日期: { date: { start: b.date } },
            班別: { select: { name: b.type } },
            備注: { rich_text: [{ text: { content: b.note || "" } }] },
          }
        }),
      });
      const data = await r.json();
      if (data.object === 'error') return res.status(400).json({ error: data.message });
      return res.status(200).json(mapPage(data));
    }

    // 刪除調整
    if (req.method === "DELETE" && action === "delete" && pageId) {
      await fetch(`${NOTION_API}/pages/${pageId}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ archived: true }),
      });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}

function mapPage(p) {
  const props = p.properties || {};
  return {
    id: p.id,
    date: props["日期"]?.date?.start || "",
    type: props["班別"]?.select?.name || "",
    note: props["備注"]?.rich_text?.[0]?.plain_text || "",
  };
}
