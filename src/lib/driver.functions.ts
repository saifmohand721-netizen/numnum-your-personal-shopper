import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { ORDER_STATUSES } from "@/lib/order-status";

type Client = SupabaseClient<Database>;

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Constant-time compare so timing does not reveal correct digits.
async function verifyPin(pin: string) {
  const expectedPin = process.env["DRIVER_PIN"] ?? "";
  let diff = !expectedPin || pin.length !== expectedPin.length ? 1 : 0;
  for (let i = 0; i < pin.length; i++) diff |= pin.charCodeAt(i) ^ (expectedPin.charCodeAt(i % (expectedPin.length || 1)) || 0);
  if (diff !== 0) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    throw new Error("رمز التفعيل غير صحيح");
  }
}

async function getProfile(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role,is_verified,is_online,full_name,phone")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

// Driver capabilities require a verified driver profile. The role and
// is_verified columns are server-only (column-level grants), so a driver
// cannot promote himself from the client.
async function requireVerifiedDriver(supabase: Client, userId: string) {
  const profile = await getProfile(supabase, userId);
  if (!profile || profile.role !== "driver") throw new Error("هذا الحساب ليس حساب سائق");
  if (!profile.is_verified) throw new Error("حسابك قيد التفعيل");
  return profile;
}

export const getDriverState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getProfile(context.supabase, context.userId));

// Activation gate: a registered driver stays locked out until he enters the
// driver activation PIN, which only the owner hands out.
export const activateDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value) => z.object({ pin: z.string().min(4).max(64) }).parse(value))
  .handler(async ({ data, context }) => {
    const profile = await getProfile(context.supabase, context.userId);
    if (!profile || profile.role !== "driver") throw new Error("هذا الحساب ليس حساب سائق");
    if (profile.is_verified) return { ok: true };
    await verifyPin(data.pin);
    const admin = await getAdmin();
    const { error } = await admin
      .from("profiles")
      .update({ is_verified: true })
      .eq("id", context.userId)
      .eq("role", "driver");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDriverOnline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value) => z.object({ online: z.boolean() }).parse(value))
  .handler(async ({ data, context }) => {
    await requireVerifiedDriver(context.supabase, context.userId);
    // Column grants let a driver flip only his own is_online flag.
    const { error } = await context.supabase
      .from("profiles")
      .update({ is_online: data.online })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDriverOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireVerifiedDriver(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: orders, error } = await admin
      .from("orders")
      .select("*")
      // Pending orders are open to every verified driver; claimed orders only to their driver.
      .or(`status.eq.pending,driver_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    // Bucket is private: hand the driver short-lived signed links only.
    return Promise.all(orders.map(async (order) => {
      if (!order.voice_note_url) return order;
      const { data: signed } = await admin.storage.from("voice-notes").createSignedUrl(order.voice_note_url, 3600);
      return { ...order, voice_note_url: signed?.signedUrl ?? null };
    }));
  });

export const updateDriverOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(ORDER_STATUSES),
      purchasePrice: z.number().min(0),
      deliveryFee: z.number().min(0),
    }).parse(value),
  )
  .handler(async ({ data, context }) => {
    await requireVerifiedDriver(context.supabase, context.userId);
    const admin = await getAdmin();
    const { data: order, error } = await admin
      .from("orders")
      .update({
        status: data.status,
        purchase_price: data.purchasePrice,
        delivery_fee: data.deliveryFee,
        // Moving past pending claims the order for this driver; back to pending releases it.
        driver_id: data.status === "pending" ? null : context.userId,
      })
      .eq("id", data.id)
      .or(`driver_id.is.null,driver_id.eq.${context.userId}`)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("هذا الطلب استلمه سائق آخر");
    return order;
  });
