CREATE OR REPLACE FUNCTION public.enforce_signup_region()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _region text;
BEGIN
  _region := NEW.raw_user_meta_data ->> 'region';
  -- OAuth signups (Google) carry no region; allow them.
  IF _region IS NULL THEN
    RETURN NEW;
  END IF;
  IF _region <> 'المسيب' THEN
    RAISE EXCEPTION 'ستتوفر الخدمة قريباً في منطقتك';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_signup_region_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_signup_region();