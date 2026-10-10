// Resolves backend settings from the host's runtime variables (Cloudflare Worker vars),
// accepting both SUPABASE_* and VITE_SUPABASE_* names.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// On Cloudflare Workers, variables/secrets arrive as the Worker `env`, not process.env.
// The Nitro Cloudflare handler stores it on globalThis.__env__ but calls our server
// entry with the Request only, so read __env__ directly. Node/dev uses process.env.
export function getEnv(name: string): string {
  const g = globalThis as { __env__?: Record<string, unknown>; __RUNTIME_ENV__?: Record<string, string> };
  const cf = g.__env__?.[name];
  if (typeof cf === "string" && cf) return cf;
  const rt = g.__RUNTIME_ENV__?.[name];
  if (rt) return rt;
  try {
    const v = typeof process !== "undefined" ? process.env?.[name] : undefined;
    return v || "";
  } catch {
    return "";
  }
}

// Collects every place the Worker env can live: the per-request env Nitro stores,
// our own copy, and the official `cloudflare:workers` module env.
async function envSources(): Promise<Record<string, unknown>[]> {
  const g = globalThis as { __env__?: Record<string, unknown>; __RUNTIME_ENV__?: Record<string, unknown> };
  const out: Record<string, unknown>[] = [];
  if (g.__env__ && typeof g.__env__ === "object") out.push(g.__env__);
  if (g.__RUNTIME_ENV__) out.push(g.__RUNTIME_ENV__);
  try {
    const spec = "cloudflare:workers";
    const mod = (await import(/* @vite-ignore */ spec)) as { env?: Record<string, unknown> };
    if (mod?.env && typeof mod.env === "object") out.push(mod.env);
  } catch {
    /* not running on Cloudflare (dev / Node) */
  }
  try {
    if (typeof process !== "undefined" && process.env) out.push(process.env as Record<string, unknown>);
  } catch {
    /* ignore */
  }
  return out;
}

// Async env lookup that also understands Cloudflare Secrets Store bindings
// (objects with an async get()) besides plain string variables/secrets.
export async function getEnvAsync(...names: string[]): Promise<string> {
  const sources = await envSources();
  for (const name of names) {
    for (const src of sources) {
      const v = src[name];
      if (typeof v === "string" && v.trim()) return v.trim();
      if (v && typeof v === "object" && typeof (v as { get?: unknown }).get === "function") {
        try {
          const s = await (v as { get: () => Promise<unknown> }).get();
          if (typeof s === "string" && s.trim()) return s.trim();
        } catch (err) {
          console.error(`[env] Secrets Store binding ${name} could not be read:`, (err as Error)?.message);
        }
      }
    }
  }
  return "";
}

// Names only (never values) of backend-related settings the server can see — for diagnosis.
async function visibleSettingNames(): Promise<string> {
  const names = new Set<string>();
  for (const src of await envSources()) {
    for (const k of Object.keys(src)) if (/SUPABASE|SECRET|SERVICE|DRIVER/i.test(k)) names.add(k);
  }
  return names.size ? [...names].sort().join(", ") : "none";
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

export async function createAdminClient() {
  const url = (await getEnvAsync("SUPABASE_URL", "VITE_SUPABASE_URL")) || getSupabaseUrl();
  // Reads the Worker env (plain secret, variable, or Secrets Store binding), not just process.env.
  // Accepts both the legacy service_role JWT and the new sb_secret_ key (see apikeyFetch).
  const key = await getEnvAsync("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  const missing = [...(!url ? ["SUPABASE_URL"] : []), ...(!key ? ["SUPABASE_SERVICE_ROLE_KEY"] : [])];
  if (missing.length) {
    const seen = await visibleSettingNames();
    console.error(`[env] missing ${missing.join(", ")}; server sees: ${seen}`);
    throw new Error(`Missing server variable(s): ${missing.join(", ")} — server sees: ${seen}`);
  }
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
