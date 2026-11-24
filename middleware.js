// Locks member pages and APIs (see GATED in lib/access.js) behind a session
// cookie. Runs on Vercel before the cache, so locked files are never served.
import { next } from "@vercel/functions";
import { gate } from "./lib/access.js";

export const config = {
  matcher: ["/reverse-dcf", "/reverse-dcf/:path*", "/api/company", "/api/search", "/attention", "/attention/:path*", "/compounding", "/compounding/:path*", "/api/attention"],
};

export default async function middleware(request) {
  return (await gate(request, process.env)) ?? next();
}
