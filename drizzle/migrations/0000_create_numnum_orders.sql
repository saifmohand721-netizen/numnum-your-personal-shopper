CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  store_type TEXT NOT NULL,
  items_list TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  budget_limit NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'buying', 'delivering', 'completed')),
  purchase_price NUMERIC NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  delivery_fee NUMERIC NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total_price NUMERIC GENERATED ALWAYS AS (purchase_price + delivery_fee) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create an order"
ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending' AND purchase_price = 0 AND delivery_fee = 0);

CREATE POLICY "Anyone can track orders"
ON public.orders FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Drivers can update active orders"
ON public.orders FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (status IN ('pending', 'buying', 'delivering', 'completed'));

CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX orders_status_idx ON public.orders (status);

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;