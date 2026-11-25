// A tiny private key-value store for the admin's member list, using an Upstash Redis
// database connected in Vercel (Storage > Upstash for Redis). Vercel adds the variables
// itself: KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN).
// The member list never goes in the repo, because the repo is public.
export function storeConfig(env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}
export async function redis(cfg, cmd) {
  const r = await fetch(cfg.url, { method: "POST", headers: { Authorization: `Bearer ${cfg.token}`, "content-type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || "store " + r.status);
  return j.result;
}
export const KEY = "tc:members";
export async function listMembers(cfg) {
  const flat = (await redis(cfg, ["HGETALL", KEY])) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) { try { out.push(JSON.parse(flat[i + 1])); } catch {} }
  return out;
}
export const saveMember = (cfg, m) => redis(cfg, ["HSET", KEY, m.email, JSON.stringify(m)]);
export const deleteMember = (cfg, email) => redis(cfg, ["HDEL", KEY, email]);
