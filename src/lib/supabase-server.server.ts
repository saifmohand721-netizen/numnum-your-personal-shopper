// Server Supabase client bound to the incoming request's cookies (@supabase/ssr).
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

export function createRequestSupabase(request: Request, responseHeaders: Headers) {
  // Netlify Functions may not receive build-only env vars, so fall back to the
  // public URL/key inlined at build time (both are safe to expose).
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
  return createServerClient<Database>(url, key, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("cookie") ?? "").map((c) => ({ name: c.name, value: c.value ?? "" }));
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          responseHeaders.append("Set-Cookie", serializeCookieHeader(name, value, options));
        }
      },
    },
  });
}
