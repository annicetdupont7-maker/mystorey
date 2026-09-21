import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { destinationFor } from "@/features/auth/destination";
export const dynamic = "force-dynamic";
function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"));
  if (!code && !tokenHash) return NextResponse.redirect(new URL("/login?error=auth", request.url));
  const supabase = await createSupabaseServerClient();
  if (tokenHash) {
    const isRecovery = type === "recovery";
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: isRecovery ? "recovery" : "email" });
    if (error) return NextResponse.redirect(new URL("/login?error=auth", request.url));
    if (isRecovery) return NextResponse.redirect(new URL("/reset-password", request.url));
  } else {
    const { error } = await supabase.auth.exchangeCodeForSession(code ?? "");
    if (error) return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }
  if (next) return NextResponse.redirect(new URL(next, request.url));
  // A confirmed email lands where the person belongs: back-office, dashboard or shop creation.
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.redirect(new URL(user ? await destinationFor(supabase, user) : "/login", request.url));
}
