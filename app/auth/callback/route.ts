import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// Google OAuth (PKCE) redirect target: exchange the code for a session, set auth cookies,
// then return to wherever the user was headed.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
