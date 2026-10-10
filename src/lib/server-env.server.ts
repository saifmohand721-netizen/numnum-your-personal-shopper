// Resolves backend settings from the host's runtime variables (Cloudflare Worker vars),
// accepting both SUPABASE_* and VITE_SUPABASE_* names.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function getSupabaseUrl() {
  return process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
}
export function getSupabasePublishableKey() {
  return (
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    ""
  );
}

export function apikeyFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export function createAdminClient() {
  const url = getSupabaseUrl();
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"] || "";
  const missing = [...(!url ? ["SUPABASE_URL"] : []), ...(!key ? ["SUPABASE_SERVICE_ROLE_KEY"] : [])];
  if (missing.length) throw new Error(`Missing server variable(s): ${missing.join(", ")}`);
  return createClient<Database>(url, key, {
    global: { fetch: apikeyFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export function createUserClient(token: string) {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  const missing = [...(!url ? ["SUPABASE_URL"] : []), ...(!key ? ["SUPABASE_PUBLISHABLE_KEY"] : [])];
  if (missing.length) throw new Error(`Missing server variable(s): ${missing.join(", ")}`);
  return createClient<Database>(url, key, {
    global: { fetch: apikeyFetch(key), headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
