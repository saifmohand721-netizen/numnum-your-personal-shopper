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

    const users: { id: string; email: string | null; phone: string | null; provider: string; created_at: string; last_sign_in_at: string | null }[] = [];
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
