import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie-bound anon client for Server Components, Server Actions and Route Handlers.
// Reads the Supabase Auth session from cookies (written by proxy.ts / the OAuth callback)
// so auth.uid() is available server-side and Storage RLS can be enforced.
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (read-only cookie store); proxy.ts refreshes.
          }
        },
      },
    }
  );
}
