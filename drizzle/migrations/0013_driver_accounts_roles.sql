-- Driver accounts: role, verification gate, and online presence on profiles.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer', 'driver', 'admin'));

-- Privileged roles live in a separate table, never on profiles.
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Self-service profile writes are limited to safe columns: nobody can flip their
-- own role or is_verified, and self-inserts always land as verified customers.
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT INSERT (id, full_name, username, phone, region) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, region, is_online) ON public.profiles TO authenticated;

-- Deletion is service-role only: drivers and customers can never purge orders or profiles.
REVOKE DELETE ON public.orders FROM anon, authenticated;
REVOKE DELETE ON public.profiles FROM anon, authenticated;

-- Signup trigger: carry role/email into the profile; drivers start unverified.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  m jsonb := NEW.raw_user_meta_data;
  _role text := coalesce(m->>'role', 'customer');
  _username text := lower(coalesce(m->>'username', ''));
BEGIN
  IF _role NOT IN ('customer', 'driver') THEN _role := 'customer'; END IF;
  IF _username = '' THEN
    -- OAuth customers keep the existing behavior (no profile row).
    IF _role = 'customer' THEN RETURN NEW; END IF;
    _username := 'driver_' || substr(NEW.id::text, 1, 8);
  END IF;
  INSERT INTO public.profiles (id, full_name, username, phone, region, role, email, is_verified)
  VALUES (
    NEW.id,
    coalesce(m->>'full_name', ''),
    _username,
    coalesce(m->>'phone', ''),
    coalesce(m->>'region', ''),
    _role,
    NEW.email,
    _role <> 'driver'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;