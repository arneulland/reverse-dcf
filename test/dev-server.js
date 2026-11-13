// Local server: static files from public/ plus the functions in api/.
// MOCK=1 swaps the network for the fixtures in test/fixtures.js.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if (process.env.MOCK) globalThis.fetch = (await import("./fixtures.js")).mockFetch;
const port = Number(process.env.PORT || 3000);

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
  try {
    const html = await readFile(path.join(root, "public", "index.html"));
    res.setHeader("content-type", "text/html; charset=utf-8"); res.end(html);
  } catch { res.statusCode = 404; res.end("not found"); }
}).listen(port, () => console.log(`http://localhost:${port}${process.env.MOCK ? " (mock data)" : ""}`));
