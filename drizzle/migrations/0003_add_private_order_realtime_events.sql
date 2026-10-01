CREATE TABLE public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_events TO anon, authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order event alerts are public" ON public.order_events FOR SELECT TO anon, authenticated USING (true);
CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_events (order_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_realtime_event
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;
COMMENT ON TABLE public.order_events IS 'Payload-free realtime signals; customer order details remain private.';