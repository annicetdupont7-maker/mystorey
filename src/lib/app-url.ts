/**
 * The public address of MYSTOREY. Production sets NEXT_PUBLIC_APP_URL; the fallback is
 * the live Vercel address — it used to be "mystorey.app", a domain that does not
 * resolve, so any environment without the variable sent confirmation emails and
 * social previews to a dead host.
 */
export const DEFAULT_APP_URL = "https://mystorey.vercel.app";

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL).replace(/\/+$/, "");
}

/**
 * The origin the visitor is actually on, for links that must come back to the same
 * deployment (email confirmation, password reset). Supabase still checks the result
 * against its allow-list and falls back to its Site URL, so a forged header cannot
 * redirect anyone anywhere.
 */
export function originFromHeaders(headers: Headers): string {
  const origin = headers.get("origin");
  if (origin && /^https?:\/\/[^/\s]+$/.test(origin)) return origin;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (host && /^[a-z0-9.-]+(:\d+)?$/i.test(host)) {
    const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return appUrl();
}
