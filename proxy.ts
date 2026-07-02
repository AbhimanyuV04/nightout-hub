import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next 16 renamed `middleware.ts` -> `proxy.ts` (middleware is deprecated). This gates the
// app: any unauthenticated request (except the landing page itself) is redirected to `/`.
// It also refreshes the Supabase session cookies on every request.
//
// Note: Server Actions POST to their own route, and a matcher change can silently drop that
// coverage, so each action re-checks auth via getAuthUser() rather than trusting this gate.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except static assets, image optimizer, files with an extension, and
  // the OAuth callback (which must run while still unauthenticated).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.).*)"],
};
