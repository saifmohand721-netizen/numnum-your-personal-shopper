GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m jsonb := NEW.raw_user_meta_data;
BEGIN
  IF coalesce(m->>'username','') = '' THEN RETURN NEW; END IF;
  INSERT INTO public.profiles (id, full_name, username, phone, region)
  VALUES (NEW.id, coalesce(m->>'full_name',''), lower(m->>'username'), coalesce(m->>'phone',''), coalesce(m->>'region',''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_profile ON auth.users;
CREATE TRIGGER on_auth_user_profile AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

CREATE OR REPLACE FUNCTION public.username_available(_username text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = lower(_username));
$$;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_id uuid;
CREATE INDEX IF NOT EXISTS orders_driver_id_idx ON public.orders(driver_id);