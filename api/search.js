import { search } from "../lib/yahoo.js";

export default async function handler(req, res) {
  const q = String(req.query?.q ?? "").trim().slice(0, 60);
  if (q.length < 1) return res.status(200).json({ results: [] });
  try {
    const results = await search(q.replace(/^\$/, ""));
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({ results });
  } catch (e) {
    res.status(502).json({ error: "search_unavailable", detail: String(e.message || e) });
  }
}
