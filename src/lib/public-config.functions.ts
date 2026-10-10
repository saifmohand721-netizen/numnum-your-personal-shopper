import { createServerFn } from "@tanstack/react-start";

// Reads the PUBLIC auth URL/key from the host's runtime variables (e.g. Cloudflare Worker vars),
// so the browser never depends on values baked in at build time from a stale .env.
export const getPublicSupabaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  const url =
    process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"] || "";
  const key =
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    "";
  return { url: String(url), key: String(key) };
});
