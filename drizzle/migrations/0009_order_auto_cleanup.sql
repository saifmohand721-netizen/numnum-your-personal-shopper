ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;
UPDATE public.orders SET completed_at = created_at WHERE status = 'completed' AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_order_completed_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_set_completed_at ON public.orders;
CREATE TRIGGER orders_set_completed_at BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_completed_at();

CREATE TABLE IF NOT EXISTS public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cleanup_enabled boolean NOT NULL DEFAULT true,
  cleanup_days int NOT NULL DEFAULT 30 CHECK (cleanup_days BETWEEN 1 AND 3650),
  last_cleanup_at timestamptz,
  last_cleanup_count int NOT NULL DEFAULT 0
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.cleanup_old_orders()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; n int := 0;
BEGIN
  SELECT * INTO s FROM public.app_settings WHERE id = 1;
  IF s.cleanup_enabled THEN
    DELETE FROM public.orders
    WHERE status = 'completed' AND completed_at IS NOT NULL
      AND completed_at < now() - make_interval(days => s.cleanup_days);
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  UPDATE public.app_settings SET last_cleanup_at = now(), last_cleanup_count = n WHERE id = 1;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_old_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_orders() TO service_role;