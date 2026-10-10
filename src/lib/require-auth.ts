import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

// Verifies the caller's session token against the app's own backend (runtime vars).
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const auth = getRequest()?.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) throw new Error("Unauthorized: please sign in again");
  const token = auth.slice(7);
  if (token.split(".").length !== 3) throw new Error("Unauthorized: invalid token");
  const { createUserClient } = await import("@/lib/server-env.server");
  const supabase = createUserClient(token);
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized: invalid token");
  return next({ context: { supabase, userId: data.claims.sub as string, claims: data.claims } });
});
