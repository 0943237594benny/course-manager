const NOTION_API = "https://api.notion.com/v1";
const NODE_DB_ID = "9b4f7790ab7846eab140d336b9ae4722";

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
  const { action, pageId, projectId } = req.query;

  try {
    // 取得某專案的所有節點
    if (req.method === "GET" && action === "list") {
      const r = await fetch(`${NOTION_API}/databases/${NODE_DB_ID}/query`, {
        method: "POST", headers,
        body: JSON.stringify({
          filter: projectId ? { property: "專案ID", rich_text: { equals: projectId } } : {},
          sorts: [{ property: "截止日期", direction: "ascending" }]
        }),
      });
      const data = await r.json();
      return res.status(200).json((data.results||[]).map(mapNode));
    }

    // 新增節點
    if (req.method === "POST" && action === "create") {
      const b = req.body;
      const r = await fetch(`${NOTION_API}/pages`, {
        method: "POST", headers,
        body: JSON.stringify({
          parent: { database_id: NODE_DB_ID },
          properties: buildNodeProps(b)
        }),
      });
      return res.status(200).json(mapNode(await r.json()));
    }

    // 更新節點（含勾選完成）
    if (req.method === "PATCH" && action === "update" && pageId) {
      const r = await fetch(`${NOTION_API}/pages/${pageId}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ properties: buildNodeProps(req.body) }),
      });
      return res.status(200).json(mapNode(await r.json()));
    }

    // 刪除節點
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

function mapNode(p) {
  const props = p.properties || {};
  return {
    id: p.id,
    name: props["節點名稱"]?.title?.[0]?.plain_text || "",
    date: props["截止日期"]?.date?.start || "",
    done: props["完成"]?.checkbox || false,
    note: props["備注"]?.rich_text?.[0]?.plain_text || "",
    projectId: props["專案ID"]?.rich_text?.[0]?.plain_text || "",
  };
}

function buildNodeProps(b) {
  const props = {
    節點名稱: { title: [{ text: { content: b.name || "" } }] },
    備注: { rich_text: [{ text: { content: b.note || "" } }] },
  };
  if (b.date) props["截止日期"] = { date: { start: b.date } };
  if (typeof b.done === "boolean") props["完成"] = { checkbox: b.done };
  if (b.projectId) props["專案ID"] = { rich_text: [{ text: { content: b.projectId } }] };
  return props;
}
