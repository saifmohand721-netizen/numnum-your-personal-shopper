import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CUSTOMER_COLUMNS = "id,status,store_type,items_list,purchase_price,delivery_fee,total_price,created_at";

const trackingInput = z.object({ id: z.string().uuid() });

const driverInput = z.object({ pin: z.string().min(4).max(64) });

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

function verifyPin(pin: string) {
  const expectedPin = process.env["DRIVER_PIN"]!;
  if (pin !== expectedPin) throw new Response("Unauthorized", { status: 401 });
}

// Owner is always taken from the verified session, never from request data.
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value) => createOrderInput.parse(value))
  .handler(async ({ data, context }) => {
    // قبول مسار البصمة الصوتية مباشرة دون تقييده باشتراط البادئة
    const voicePath = data.voiceNotePath || null;
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
    if (error) throw new Error(error.message);
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

export const getDriverOrders = createServerFn({ method: "GET" })
  .inputValidator((value) => driverInput.parse(value))
  .handler(async ({ data }) => {
    verifyPin(data.pin);
    const admin = await getAdmin();
    const { data: orders, error } = await admin
      .from("orders")
      .select("*")
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
  .inputValidator((value) =>
    driverInput
      .extend({
        id: z.string().uuid(),
        status: z.enum(["pending", "buying", "delivering", "completed"]),
        purchasePrice: z.number().min(0),
        deliveryFee: z.number().min(0),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    verifyPin(data.pin);
    const admin = await getAdmin();
    const { data: order, error } = await admin
      .from("orders")
      .update({
        status: data.status,
        purchase_price: data.purchasePrice,
        delivery_fee: data.deliveryFee,
      })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return order;
  });
