import { createClient } from "@supabase/supabase-js";
import type { ApiClient } from "@/lib/supabase/server";

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function serviceApi(): ApiClient | null {
  const client = createServiceRoleClient();
  if (!client) return null;
  return client.schema("api") as unknown as ApiClient;
}