// Browser Supabase client: cookie-based session + PKCE via @supabase/ssr.
// Cookies (not localStorage) let the server read the same session.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

let client: SupabaseClient<Database> | undefined;

function getClient(): SupabaseClient<Database> {
  if (!client) {
    // Prefer runtime config injected by the server (host variables) over build-time values.
    const rt = (globalThis as { __NUMNUM_SB__?: { url?: string; key?: string } }).__NUMNUM_SB__;
    const url = rt?.url || import.meta.env["VITE_SUPABASE_URL"];
    const key = rt?.key || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
    client = createBrowserClient<Database>(url, key, {
      auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

// Lazy proxy so importing this module during SSR never touches the browser.
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const c = getClient();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
