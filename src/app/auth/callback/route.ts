import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
function safeNextPath(value: string | null, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  if (!code && !tokenHash) return NextResponse.redirect(new URL("/login?error=auth", request.url));
  const supabase = await createSupabaseServerClient();
  if (tokenHash) {
    const isRecovery = type === "recovery";
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: isRecovery ? "recovery" : "email" });
    if (error) return NextResponse.redirect(new URL("/login?error=auth", request.url));
    return NextResponse.redirect(new URL(isRecovery ? "/reset-password" : safeNextPath(next, "/onboarding"), request.url));
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code ?? "");
  if (error) return NextResponse.redirect(new URL("/login?error=auth", request.url));
  return NextResponse.redirect(new URL(safeNextPath(next, "/onboarding"), request.url));
}