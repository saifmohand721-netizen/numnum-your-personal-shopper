REVOKE SELECT, UPDATE ON public.orders FROM anon;
DROP POLICY "Anyone can track orders" ON public.orders;
DROP POLICY "Drivers can update active orders" ON public.orders;

CREATE POLICY "Authenticated staff can read orders"
ON public.orders FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated staff can update orders"
ON public.orders FOR UPDATE TO authenticated
USING (true)
WITH CHECK (status IN ('pending', 'buying', 'delivering', 'completed'));

COMMENT ON TABLE public.orders IS 'NumNum customer orders. Public creation only; tracking and driver updates use protected server functions.';