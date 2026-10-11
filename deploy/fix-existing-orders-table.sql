-- NumNum — bring an EXISTING (hand-made) orders table up to what the app expects.
-- Safe: adds missing columns/tables and tightens access. Deletes no rows, drops no tables or columns.
-- Run once in Supabase -> SQL Editor.

-- 1) Columns the app writes/reads
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS budget_limit numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS voice_note_url text;
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

-- 2) Lock the table: today anyone with the public key can read, add and delete orders.
--    Customers read only their own orders; writes go through the server (service role).
REVOKE ALL ON public.orders FROM anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' LOOP
    EXECUTE format('DROP POLICY %I ON public.orders', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Customers read own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3) Payload-free realtime signals for the driver panel
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;
  END IF;
END $$;

-- 4) Voice notes: private bucket, each user only touches their own folder
UPDATE storage.buckets SET public = false WHERE id = 'voice-notes';
DROP POLICY IF EXISTS "Users upload own voice notes" ON storage.objects;
CREATE POLICY "Users upload own voice notes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users read own voice notes" ON storage.objects;
CREATE POLICY "Users read own voice notes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5) Refresh the API's schema cache
NOTIFY pgrst, 'reload schema';
