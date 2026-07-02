import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ponytail: service-role client, server-only. Add RLS + anon/auth clients when auth lands.
// Lazily constructed via Proxy so importing this module never touches env — otherwise
// `next build` page-data collection throws "supabaseUrl is required" before any request.
let instance: SupabaseClient | null = null;
function client(): SupabaseClient {
  return (instance ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  ));
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = client()[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client()) : value;
  },
});
