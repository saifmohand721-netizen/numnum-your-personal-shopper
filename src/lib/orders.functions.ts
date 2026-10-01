import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const trackingInput = z.object({
  id: z.string().uuid(),
  phone: z.string().min(8).max(20),
});

const driverInput = z.object({ pin: z.string().min(4).max(64) });

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function verifyPin(pin: string) {
  const expectedPin = process.env["DRIVER_PIN"]!;
  if (pin !== expectedPin) throw new Response("Unauthorized", { status: 401 });
}

export const trackOrder = createServerFn({ method: "GET" })
  .inputValidator((value) => trackingInput.parse(value))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const { data: order, error } = await admin
      .from("orders")
      .select("id,status,store_type,items_list,purchase_price,delivery_fee,total_price,created_at")
      .eq("id", data.id)
      .eq("customer_phone", data.phone)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return order;
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
    return orders;
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