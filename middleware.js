// Locks member pages and APIs (see GATED in lib/access.js) behind a session
// cookie. Runs on Vercel before the cache, so locked files are never served.
import { next } from "@vercel/functions";
import { gate } from "./lib/access.js";

export const config = {
  matcher: ["/academy", "/academy/:path*", "/api/academy", "/admin", "/admin/:path*", "/api/admin", "/reverse-dcf", "/reverse-dcf/:path*", "/api/company", "/api/search", "/attention", "/attention/:path*", "/compounding", "/compounding/:path*", "/diversification", "/diversification/:path*", "/held", "/held/:path*", "/moat", "/moat/:path*", "/api/history", "/api/moat", "/api/attention"],
};

export default async function middleware(request) {
  return (await gate(request, process.env)) ?? next();
}
