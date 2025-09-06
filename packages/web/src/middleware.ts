import { NextResponse, type NextRequest } from "next/server";

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const WORKER_ORIGIN =
  process.env.NEXT_PUBLIC_WORKER_ORIGIN || "https://rtg-api.<your-subdomain>.workers.dev";

export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");

  const csp = [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "style-src 'self'",
    "script-src 'self'",
    `connect-src 'self' ${WORKER_ORIGIN} ${SUPABASE}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);

  // HSTS (production only; safe on HTTPS domains like *.pages.dev)
  res.headers.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains; preload");
  return res;
}