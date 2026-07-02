import { createClient } from "@supabase/supabase-js";

// ponytail: service-role client, server-only. Add RLS + anon/auth clients when auth lands.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
