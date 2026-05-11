const NOTION_API = "https://api.notion.com/v1";
const DB_ID = "ee4077f18c004713822b9970be352cea";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
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
    if (req.method === "GET" && action === "list") {
      const r = await fetch(`${NOTION_API}/databases/${DB_ID}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sorts: [{ property: "日期", direction: "ascending" }], page_size: 100 }),
      });
      const data = await r.json();
      const courses = (data.results || []).map(mapPage);
      return res.status(200).json(courses);
    }

    if (req.method === "POST" && action === "create") {
      const r = await fetch(`${NOTION_API}/pages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ parent: { database_id: DB_ID }, properties: buildProps(req.body) }),
      });
      const data = await r.json();
      return res.status(200).json(mapPage(data));
    }

    if (req.method === "PATCH" && action === "update" && pageId) {
      const r = await fetch(`${NOTION_API}/pages/${pageId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ properties: buildProps(req.body) }),
      });
      const data = await r.json();
      return res.status(200).json(mapPage(data));
    }

    if (req.method === "DELETE" && action === "delete" && pageId) {
      await fetch(`${NOTION_API}/pages/${pageId}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ archived: true }),
      });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function mapPage(p) {
  const props = p.properties || {};
  const dateStart = props["日期"]?.date?.start || "";
  const dateEnd = props["日期"]?.date?.end || "";
  return {
    id: p.id,
    title: props["課程名稱"]?.title?.[0]?.plain_text || "",
    tag: props["標籤"]?.select?.name || "",
    unit: props["單位"]?.select?.name || "",
    type: props["課程類型"]?.select?.name || "",
    category: props["類別"]?.select?.name || "課程",
    date: dateStart,
    endDate: dateEnd,
    startTime: props["開始時間"]?.rich_text?.[0]?.plain_text || "",
    endTime: props["結束時間"]?.rich_text?.[0]?.plain_text || "",
    location: props["地點"]?.rich_text?.[0]?.plain_text || "",
    note: props["備注"]?.rich_text?.[0]?.plain_text || "",
  };
}

function buildProps(b) {
  const title = b.title || (b.tag ? `[${b.tag}/${b.unit||''}] ${b.type||''}` : '未命名');
  const props = {
    課程名稱: { title: [{ text: { content: title } }] },
    開始時間: { rich_text: [{ text: { content: b.startTime || "" } }] },
    結束時間: { rich_text: [{ text: { content: b.endTime || "" } }] },
    地點: { rich_text: [{ text: { content: b.location || "" } }] },
    備注: { rich_text: [{ text: { content: b.note || "" } }] },
  };
  // 日期（支援跨日）
  if (b.date) {
    props["日期"] = { date: { start: b.date, end: b.endDate || null } };
  }
  if (b.tag) props["標籤"] = { select: { name: b.tag } };
  if (b.unit) props["單位"] = { select: { name: b.unit } };
  if (b.type) props["課程類型"] = { select: { name: b.type } };
  if (b.category) props["類別"] = { select: { name: b.category } };
  return props;
}
