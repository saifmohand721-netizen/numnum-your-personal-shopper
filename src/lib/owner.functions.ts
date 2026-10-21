import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ password: z.string().min(1).max(128) });

async function verifyOwner(password: string) {
  const expected = process.env["OWNER_PASSWORD"] ?? "";
  let diff = !expected || password.length !== expected.length ? 1 : 0;
  for (let i = 0; i < password.length; i++) diff |= password.charCodeAt(i) ^ (expected.charCodeAt(i % (expected.length || 1)) || 0);
  if (diff !== 0) {
    await new Promise((r) => setTimeout(r, 800));
    throw new Error("Unauthorized");
  }
}

// Owner-only overview: every registered account and every order with full details.
export const getOwnerOverview = createServerFn({ method: "POST" })
  .inputValidator((value) => input.parse(value))
  .handler(async ({ data }) => {
    await verifyOwner(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const users: { id: string; email: string | null; phone: string | null; provider: string; created_at: string; last_sign_in_at: string | null; banned: boolean }[] = [];
    for (let page = 1; page <= 10; page++) {
      const { data: res, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const u of res.users) {
        users.push({
          id: u.id,
          email: u.email ?? null,
          phone: u.phone ?? null,
          provider: String(u.app_metadata?.provider ?? "email"),
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          banned: Boolean((u as { banned_until?: string | null }).banned_until) && new Date((u as { banned_until?: string }).banned_until!).getTime() > Date.now(),
        });
      }
      if (res.users.length < 200) break;
    }

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const withAudio = await Promise.all(
      orders.map(async (o) => {
        if (!o.voice_note_url) return o;
        const { data: signed } = await supabaseAdmin.storage.from("voice-notes").createSignedUrl(o.voice_note_url, 3600);
        return { ...o, voice_note_url: signed?.signedUrl ?? null };
      }),
    );

    return { users, orders: withAudio };
  });

// Driver accounts: profile fields plus per-driver completed deliveries and
// earned delivery fees. Financial sums count completed orders only.
export const getDriversOverview = createServerFn({ method: "POST" })
  .inputValidator((value) => input.parse(value))
  .handler(async ({ data }) => {
    await verifyOwner(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: drivers, error } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,phone,email,is_verified,is_online,created_at")
      .eq("role", "driver")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("driver_id,status,delivery_fee")
      .not("driver_id", "is", null);
    if (ordersError) throw new Error(ordersError.message);
    const stats = new Map<string, { completed: number; fees: number }>();
    for (const o of orders ?? []) {
      if (!o.driver_id || o.status !== "completed") continue;
      const s = stats.get(o.driver_id) ?? { completed: 0, fees: 0 };
      s.completed += 1;
      s.fees += Number(o.delivery_fee ?? 0);
      stats.set(o.driver_id, s);
    }
    return (drivers ?? []).map((d) => ({
      ...d,
      completed: stats.get(d.id)?.completed ?? 0,
      fees: stats.get(d.id)?.fees ?? 0,
    }));
  });

// Ban or unban an account. Banned users cannot sign in or use their session.
export const setUserBanned = createServerFn({ method: "POST" })
  .inputValidator((value) => z.object({ password: z.string().min(1).max(128), userId: z.string().uuid(), banned: z.boolean() }).parse(value))
  .handler(async ({ data }) => {
    await verifyOwner(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.banned ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Auto-cleanup settings: completed orders older than N days are deleted daily.
export const getCleanupSettings = createServerFn({ method: "POST" })
  .inputValidator((value) => input.parse(value))
  .handler(async ({ data }) => {
    await verifyOwner(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s, error } = await supabaseAdmin.from("app_settings").select("*").eq("id", 1).single();
    if (error) throw new Error(error.message);
    return { enabled: s.cleanup_enabled, days: s.cleanup_days, lastAt: s.last_cleanup_at, lastCount: s.last_cleanup_count };
  });

export const saveCleanupSettings = createServerFn({ method: "POST" })
  .inputValidator((value) => z.object({ password: z.string().min(1).max(128), enabled: z.boolean(), days: z.number().int().min(1).max(3650), runNow: z.boolean().optional() }).parse(value))
  .handler(async ({ data }) => {
    await verifyOwner(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").update({ cleanup_enabled: data.enabled, cleanup_days: data.days }).eq("id", 1);
    if (error) throw new Error(error.message);
    let deleted = 0;
    if (data.runNow) {
      const { data: n, error: e } = await supabaseAdmin.rpc("cleanup_old_orders");
      if (e) throw new Error(e.message);
      deleted = Number(n ?? 0);
    }
    return { ok: true, deleted };
  });
