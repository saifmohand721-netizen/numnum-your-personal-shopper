import { createServerFn } from "@tanstack/react-start";

// Reads the PUBLIC auth URL/key from the host's runtime variables (Cloudflare Worker env),
// so the browser never depends on values baked in at build time from a stale .env.
export const getPublicSupabaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getEnv } = await import("@/lib/server-env.server");
  const url = getEnv("VITE_SUPABASE_URL") || getEnv("SUPABASE_URL") || import.meta.env["VITE_SUPABASE_URL"] || "";
  const key =
    getEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    getEnv("SUPABASE_PUBLISHABLE_KEY") ||
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    "";
  return { url: String(url), key: String(key) };
});
