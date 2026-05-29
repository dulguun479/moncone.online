-- 1. Add admin_email column to app_settings if it doesn't exist
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS admin_email TEXT NOT NULL DEFAULT 'dolgoonoo473@gmail.com';

-- 2. Re-create the handle_new_user trigger function to use the dynamic settings email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  cfg_admin_email TEXT;
BEGIN
  new_code := public.generate_payment_code();

  INSERT INTO public.profiles (id, display_name, payment_code, subscription_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    new_code,
    'free'
  );

  -- Fetch dynamic admin email from settings, fallback to 'dolgoonoo473@gmail.com'
  SELECT admin_email INTO cfg_admin_email FROM public.app_settings WHERE id = 1;
  IF cfg_admin_email IS NULL THEN
    cfg_admin_email := 'dolgoonoo473@gmail.com';
  END IF;

  -- Auto-grant admin to matching email
  IF NEW.email = LOWER(cfg_admin_email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

-- 3. Re-link trigger to trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill admin role dynamically for existing user matching settings email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users 
WHERE email = (SELECT admin_email FROM public.app_settings WHERE id = 1)
ON CONFLICT (user_id, role) DO NOTHING;
