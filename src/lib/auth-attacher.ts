import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";

// Attaches the cookie-backed session's access token to every server function call.
// Replaces the generated attacher (which read the old localStorage client).
export const attachAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
