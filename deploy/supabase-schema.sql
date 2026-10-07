-- NumNum — full schema for a fresh, self-hosted Supabase project.
-- Run once in your Supabase project: SQL Editor -> paste -> Run.

-- 1) Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_phone text NOT NULL,
  store_type text NOT NULL,
  items_list text NOT NULL,
  delivery_address text NOT NULL,
  budget_limit numeric,
  voice_note_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','buying','delivering','completed')),
  purchase_price numeric NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  delivery_fee numeric NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total_price numeric GENERATED ALWAYS AS (purchase_price + delivery_fee) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);

-- Customers may only READ their own orders. Inserts/updates go through
-- server functions using the service role key (driver PIN + session checks).
REVOKE ALL ON public.orders FROM anon;
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers read own orders" ON public.orders;
CREATE POLICY "Customers read own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2) Payload-free realtime signals for the driver panel
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_events TO anon, authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order event alerts are public" ON public.order_events;
CREATE POLICY "Order event alerts are public" ON public.order_events
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.order_events (order_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS orders_realtime_event ON public.orders;
CREATE TRIGGER orders_realtime_event AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;

-- 3) Private storage bucket for voice notes (each user writes/reads own folder)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('voice-notes', 'voice-notes', false, 10485760)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own voice notes" ON storage.objects;
CREATE POLICY "Users upload own voice notes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users read own voice notes" ON storage.objects;
CREATE POLICY "Users read own voice notes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
