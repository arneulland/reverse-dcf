import { clearCookie } from "../lib/access.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", clearCookie());
  res.statusCode = 302;
  res.setHeader("Location", "/");
  res.end();
}
