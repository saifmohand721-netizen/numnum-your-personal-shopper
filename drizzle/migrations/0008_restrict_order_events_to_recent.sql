DROP POLICY IF EXISTS "Order event alerts are public" ON public.order_events;

CREATE POLICY "Recent order event pings only"
ON public.order_events
FOR SELECT
TO anon, authenticated
USING (created_at > now() - interval '10 minutes');