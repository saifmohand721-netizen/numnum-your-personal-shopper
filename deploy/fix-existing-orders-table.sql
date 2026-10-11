-- NumNum — bring an EXISTING (hand-made) orders table in line with the app code.
-- Safe: deletes no rows, drops no tables or columns, touches no auth settings or keys.
-- Run once in Supabase -> SQL Editor.

-- 1) Columns the server writes/reads
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS budget_limit numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS voice_note_url text;
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

-- 2) orders: the public key gets nothing; signed-in customers read ONLY their own rows.
--    All inserts/updates happen on the server with the service role (bypasses RLS).
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

-- 3) order_events: a content-free "something changed" ping for the driver panel.
--    It holds NO order id, phone, address or price — only a timestamp — so it is safe
--    for the PIN-only driver screen to listen to. The driver then fetches real data
--    through the PIN-checked server function.
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.order_events FROM anon, authenticated;
GRANT SELECT ON public.order_events TO anon, authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_events' LOOP
    EXECUTE format('DROP POLICY %I ON public.order_events', p.policyname);
  END LOOP;
END $$;
-- Only events from the last 10 minutes are visible (enough for live alerts).
CREATE POLICY "Recent change pings" ON public.order_events
  FOR SELECT TO anon, authenticated USING (created_at > now() - interval '10 minutes');

CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.order_events DEFAULT VALUES;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_order_event() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS orders_realtime_event ON public.orders;
CREATE TRIGGER orders_realtime_event AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();

-- Live updates: customers' tracking screen (orders, RLS-filtered) + driver pings.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;
  END IF;
END $$;

-- 4) Voice notes: private bucket; each signed-in user uploads/reads only their own folder.
--    The driver hears notes via 1-hour signed links made by the server.
UPDATE storage.buckets SET public = false WHERE id = 'voice-notes';
DO $$
DECLARE p record;
BEGIN
  -- remove any older policy that mentions this bucket (e.g. a wide-open one)
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'storage' AND tablename = 'objects'
             AND (coalesce(qual,'') ILIKE '%voice-notes%' OR coalesce(with_check,'') ILIKE '%voice-notes%') LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Users upload own voice notes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own voice notes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5) Refresh the API schema cache
NOTIFY pgrst, 'reload schema';

-- ===== Verification (run after the above; read-only) =====
-- a) Columns present:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='orders' AND column_name IN ('user_id','budget_limit','voice_note_url');
-- b) Policies (expect exactly one on orders, one on order_events):
--    SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname='public' AND tablename IN ('orders','order_events');
-- c) Any remaining storage policy WITHOUT a bucket filter would still open every bucket — review these:
--    SELECT policyname, cmd, roles, qual, with_check FROM pg_policies
--    WHERE schemaname='storage' AND tablename='objects' AND coalesce(qual,'')||coalesce(with_check,'') NOT ILIKE '%bucket_id%';
