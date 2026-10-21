import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CUSTOMER_COLUMNS = "id,status,store_type,items_list,purchase_price,delivery_fee,total_price,created_at";

const trackingInput = z.object({ id: z.string().uuid() });

// تم تعديل شرط رقم الهاتف ليكون مرناً وقبول الأرقام العراقية بكافة صيغها (07x أو 964x أو +964x)
const createOrderInput = z.object({
  phone: z.string().min(8, "رقم الهاتف قصير جداً").max(20),
  storeType: z.string().min(1).max(100),
  itemsList: z.string().min(1).max(5000),
  deliveryAddress: z.string().min(1).max(500),
  budgetLimit: z.number().min(0).nullable().optional(),
  voiceNotePath: z.string().max(500).nullable().optional(),
});

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Owner is always taken from the verified session, never from request data.
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value) => createOrderInput.parse(value))
  .handler(async ({ data, context }) => {
    // Only accept a voice note stored in the caller's own folder, so nobody can
    // attach another customer's recording and have the driver panel sign it.
    const rawPath = data.voiceNotePath || null;
    if (rawPath && (!rawPath.startsWith(`${context.userId}/`) || rawPath.includes(".."))) {
      throw new Error("Invalid voice note");
    }
    const voicePath = rawPath;
    const admin = await getAdmin();
    
    const { data: order, error } = await admin
      .from("orders")
      .insert({
        voice_note_url: voicePath,
        user_id: context.userId,
        customer_phone: data.phone,
        store_type: data.storeType,
        items_list: data.itemsList,
        delivery_address: data.deliveryAddress,
        budget_limit: data.budgetLimit ?? null,
      })
      .select(CUSTOMER_COLUMNS)
      .single();

    if (error) {
      console.error("Supabase Order Insert Error:", error);
      throw new Error(error.message);
    }
    return order;
  });

// RLS (auth.uid() = user_id) guarantees customers only ever see their own orders.
export const trackOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value) => trackingInput.parse(value))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select(CUSTOMER_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) { console.error("[createOrder] insert failed:", error); throw new Error(`DB: ${error.message}`); }
    return order;
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: orders, error } = await context.supabase
      .from("orders")
      .select(CUSTOMER_COLUMNS)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return orders;
  });

// Driver-facing order functions live in src/lib/driver.functions.ts and are
// gated by the verified-driver profile check.
