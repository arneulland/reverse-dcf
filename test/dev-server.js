// Local server: static files from public/ plus the functions in api/.
// MOCK=1 swaps the network for the fixtures in test/fixtures.js.
// Paths resolve like Vercel with cleanUrls: /attention -> public/attention/index.html.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pub = path.join(root, "public");
if (process.env.MOCK) globalThis.fetch = (await import("./fixtures.js")).mockFetch;
const port = Number(process.env.PORT || 3000);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json" };

async function resolveFile(p) {
  const safe = path.normalize(decodeURIComponent(p)).replace(/^(\.\.[/\\])+/, "");
  const base = path.join(pub, safe);
  if (!base.startsWith(pub)) return null;
  for (const f of [base, base + ".html", path.join(base, "index.html")]) {
    try { if ((await stat(f)).isFile()) return f; } catch {}
  }
  return null;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const m = url.pathname.match(/^\/api\/(\w+)$/);
  if (m) {
    try {
      const { default: handler } = await import(`../api/${m[1]}.js`);
      req.query = Object.fromEntries(url.searchParams);
      res.status = (c) => ((res.statusCode = c), res);
      res.json = (b) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(b)); };
      return await handler(req, res);
    } catch (e) { res.statusCode = 500; return res.end(String(e)); }
  }
  const file = await resolveFile(url.pathname);
  if (!file) { res.statusCode = 404; return res.end("not found"); }
  res.setHeader("content-type", TYPES[path.extname(file)] || "application/octet-stream");
  res.end(await readFile(file));
}).listen(port, () => console.log(`http://localhost:${port}${process.env.MOCK ? " (mock data)" : ""}`));
