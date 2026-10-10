// Resolves backend settings from the host's runtime variables (Cloudflare Worker vars),
// accepting both SUPABASE_* and VITE_SUPABASE_* names.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Cloudflare Workers pass variables as the fetch() `env` (stashed by src/server.ts);
// Node/dev uses process.env. Check both.
export function getEnv(name: string): string {
  const rt = (globalThis as { __RUNTIME_ENV__?: Record<string, string> }).__RUNTIME_ENV__;
  let fromProcess: string | undefined;
  try {
    fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  } catch {
    fromProcess = undefined;
  }
  return rt?.[name] || fromProcess || "";
}

export function getSupabaseUrl() {
  // Public value: fall back to the one inlined at build time (same as the browser uses).
  return getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || import.meta.env["VITE_SUPABASE_URL"] || "";
}
export function getSupabasePublishableKey() {
  return (
    getEnv("SUPABASE_PUBLISHABLE_KEY") ||
    getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
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
