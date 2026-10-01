REVOKE INSERT ON public.orders FROM anon;
DROP POLICY "Anyone can create an order" ON public.orders;
COMMENT ON TABLE public.orders IS 'NumNum customer orders. All customer and driver access is verified by server functions.';