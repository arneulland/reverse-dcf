// Saves Academy content from the editor. Admin session only.
// On Vercel it commits the JSON file to GitHub, and Vercel redeploys in a minute or two.
// Needs GITHUB_TOKEN (fine-grained, Contents: read and write on the repo).
// Optional: GITHUB_REPO (default arneulland/reverse-dcf), GITHUB_BRANCH (default main).
// Locally, ACADEMY_LOCAL_WRITE=1 writes the file to disk instead.
import { readSession, cookieValue, revokedList, isAdminSession } from "../lib/access.js";
import { validateModule, validateCourse, SLUGS } from "../lib/academy.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const env = process.env;
  const s = await readSession(env.ACCESS_SECRET, cookieValue(req.headers?.cookie), Date.now(), revokedList(env.REVOKED_EMAILS));
  if (!isAdminSession(s, env)) return res.status(401).json({ error: "admin_only", message: "Sign in as admin to edit the course." });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const key = body?.key;
  if (key !== "course" && !SLUGS.includes(key)) return res.status(400).json({ error: "bad_key", message: "Unknown part of the course." });
  const r = key === "course" ? validateCourse(body.content) : validateModule(body.content, key);
  if (r.errors.length) return res.status(422).json({ error: "invalid", message: "Fix these first:", errors: r.errors });
  const file = `public/academy/content/${key}.json`;
  const text = JSON.stringify(r.value, null, 1) + "\n";

  if (env.ACADEMY_LOCAL_WRITE) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(new URL("../" + file, import.meta.url), text);
    return res.status(200).json({ ok: true, live: "now", message: "Saved locally." });
  }
  if (!env.GITHUB_TOKEN) return res.status(503).json({ error: "not_configured", message: "Saving isn't set up yet. Add GITHUB_TOKEN in Vercel (see the README)." });
  const repo = env.GITHUB_REPO || "arneulland/reverse-dcf", branch = env.GITHUB_BRANCH || "main";
  const api = `https://api.github.com/repos/${repo}/contents/${file}`;
  const h = { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "torghatten-academy" };
  try {
    const cur = await fetch(`${api}?ref=${branch}`, { headers: h });
    const sha = cur.ok ? (await cur.json()).sha : undefined;
    const put = await fetch(api, {
      method: "PUT", headers: { ...h, "content-type": "application/json" },
      body: JSON.stringify({ message: `Academy: edit ${key} from the admin editor`, content: Buffer.from(text, "utf8").toString("base64"), branch, sha, committer: { name: "Torghatten Academy editor", email: s.email } }),
    });
    if (!put.ok) {
      const t = await put.text();
      return res.status(502).json({ error: "github", message: put.status === 409 ? "Someone else saved in the meantime. Reload the editor and try again." : put.status === 401 || put.status === 403 ? "GitHub refused the token. Check GITHUB_TOKEN in Vercel." : "GitHub refused the save.", detail: t.slice(0, 300) });
    }
    const out = await put.json();
    return res.status(200).json({ ok: true, live: "soon", message: "Saved. Vercel publishes it in a minute or two.", commit: out.commit?.html_url });
  } catch (e) {
    return res.status(502).json({ error: "github", message: "Couldn't reach GitHub. Try again." });
  }
}
