-- ================================================================
-- CINE MONGOLIA — БҮРЭН SETUP SQL
-- Supabase SQL Editor-т БҮТНЭЭР нь paste хийгээд Run дар
-- https://supabase.com/dashboard/project/voyvmtztvqttrtbughpb/sql
-- ================================================================

-- MIGRATION 1: Үндсэн хүснэгтүүд
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE public.subscription_tier AS ENUM ('free', 'premium');
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_select_own') THEN
    CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_update_own') THEN
    CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles_insert_own') THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_roles' AND policyname='roles_select_own') THEN
    CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_roles' AND policyname='roles_admin_all') THEN
    CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='subs_select_own') THEN
    CREATE POLICY "subs_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='subs_admin_all') THEN
    CREATE POLICY "subs_admin_all" ON public.subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  description_en TEXT,
  genre TEXT NOT NULL,
  year INT NOT NULL,
  duration_min INT,
  cast_list TEXT,
  director TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  video_url TEXT,
  trailer_url TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movies' AND policyname='movies_select_all') THEN
    CREATE POLICY "movies_select_all" ON public.movies FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movies' AND policyname='movies_admin_all') THEN
    CREATE POLICY "movies_admin_all" ON public.movies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS movies_genre_idx ON public.movies (genre);
CREATE INDEX IF NOT EXISTS movies_featured_idx ON public.movies (is_featured) WHERE is_featured;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO anon, authenticated;

-- MIGRATION 2: Profiles өргөтгөх + Payments + App Settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS payment_code TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_payment_code_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_payment_code_key UNIQUE (payment_code);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed', 'expired', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payment_code TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 10000,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_code ON public.payments(payment_code);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='payments_select_own') THEN
    CREATE POLICY payments_select_own ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='payments_insert_own') THEN
    CREATE POLICY payments_insert_own ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payments' AND policyname='payments_admin_all') THEN
    CREATE POLICY payments_admin_all ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bank_name TEXT NOT NULL DEFAULT 'Capitron Bank',
  bank_account_number TEXT NOT NULL DEFAULT '',
  bank_account_name TEXT NOT NULL DEFAULT '',
  premium_price INTEGER NOT NULL DEFAULT 10000,
  telegram_bot_username TEXT NOT NULL DEFAULT 'moncone_bot',
  admin_telegram_chat_id BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='settings_read_authed') THEN
    CREATE POLICY settings_read_authed ON public.app_settings FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='settings_read_anon') THEN
    CREATE POLICY settings_read_anon ON public.app_settings FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='settings_admin_write') THEN
    CREATE POLICY settings_admin_write ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE code TEXT; exists_count INT;
BEGIN
  LOOP
    code := 'MN-' || lpad(floor(random() * 100000)::text, 5, '0');
    SELECT count(*) INTO exists_count FROM public.profiles WHERE payment_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$;

UPDATE public.profiles SET payment_code = public.generate_payment_code() WHERE payment_code IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_code TEXT;
BEGIN
  new_code := public.generate_payment_code();
  INSERT INTO public.profiles (id, display_name, payment_code, subscription_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), new_code, 'free');
  IF NEW.email = 'dolgoonoo473@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.confirm_payment(_payment_id UUID)
RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pmt public.payments; new_expiry TIMESTAMPTZ;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can confirm payments'; END IF;
  SELECT * INTO pmt FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF pmt.status = 'confirmed' THEN RETURN pmt; END IF;
  SELECT GREATEST(COALESCE(p.subscription_expires_at, now()), now()) + INTERVAL '30 days'
    INTO new_expiry FROM public.profiles p WHERE p.id = pmt.user_id;
  UPDATE public.payments SET status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid() WHERE id = _payment_id RETURNING * INTO pmt;
  UPDATE public.profiles SET subscription_status = 'premium', subscription_expires_at = new_expiry WHERE id = pmt.user_id;
  UPDATE public.subscriptions SET tier = 'premium', current_period_end = new_expiry, updated_at = now() WHERE user_id = pmt.user_id;
  RETURN pmt;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_subscription(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can cancel'; END IF;
  UPDATE public.profiles SET subscription_status = 'free', subscription_expires_at = NULL WHERE id = _user_id;
  UPDATE public.subscriptions SET tier = 'free', current_period_end = NULL, updated_at = now() WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS TABLE(expired_user_id UUID, telegram_chat_id BIGINT, email TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    UPDATE public.profiles p SET subscription_status = 'free', subscription_expires_at = NULL
    WHERE p.subscription_status = 'premium' AND p.subscription_expires_at IS NOT NULL AND p.subscription_expires_at < now()
    RETURNING p.id, p.telegram_chat_id
  ), _sync AS (
    UPDATE public.subscriptions s SET tier = 'free', current_period_end = NULL, updated_at = now()
    FROM expired e WHERE s.user_id = e.id RETURNING s.user_id
  )
  SELECT e.id, e.telegram_chat_id, u.email::text FROM expired e LEFT JOIN auth.users u ON u.id = e.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_payment_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_payment(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_subscription(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_subscriptions() FROM PUBLIC, anon, authenticated;

-- MIGRATION 3: Movies өргөтгөх + Ads + Broadcasts
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS r2_key text,
  ADD COLUMN IF NOT EXISTS broadcast_sent boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text NOT NULL,
  placements text[] NOT NULL DEFAULT ARRAY['home']::text[],
  is_active boolean NOT NULL DEFAULT true,
  click_count integer NOT NULL DEFAULT 0,
  impression_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ads' AND policyname='ads_select_public') THEN
    CREATE POLICY ads_select_public ON public.ads FOR SELECT TO anon, authenticated USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ads' AND policyname='ads_admin_all') THEN
    CREATE POLICY ads_admin_all ON public.ads FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid,
  page text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_clicks_ad_id_idx ON public.ad_clicks(ad_id);
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ad_clicks' AND policyname='ad_clicks_admin_read') THEN
    CREATE POLICY ad_clicks_admin_read ON public.ad_clicks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid,
  message text NOT NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='broadcasts' AND policyname='broadcasts_admin_all') THEN
    CREATE POLICY broadcasts_admin_all ON public.broadcasts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public._bump_ad_click()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.ads SET click_count = click_count + 1 WHERE id = NEW.ad_id; RETURN NEW; END;
$$;
REVOKE ALL ON FUNCTION public._bump_ad_click() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ad_clicks_bump ON public.ad_clicks;
CREATE TRIGGER ad_clicks_bump AFTER INSERT ON public.ad_clicks FOR EACH ROW EXECUTE FUNCTION public._bump_ad_click();

DROP POLICY IF EXISTS ad_clicks_insert_any ON public.ad_clicks;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ad_clicks' AND policyname='ad_clicks_insert_active') THEN
    CREATE POLICY ad_clicks_insert_active ON public.ad_clicks FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_id AND a.is_active));
  END IF;
END $$;

-- ХАМГИЙН ЧУХАЛ: Admin role нэмэх
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'dolgoonoo473@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Backfill: handle_new_user trigger-гүйгээр бүртгэгдсэн хэрэглэгчдэд user role нэмэх
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user' FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT DO NOTHING;

-- Backfill: profile байхгүй хэрэглэгчдэд нэмэх
INSERT INTO public.profiles (id, display_name, payment_code, subscription_status)
SELECT id, split_part(email, '@', 1), public.generate_payment_code(), 'free'
FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT DO NOTHING;

-- ШАЛГАХ: Admin role нэмэгдсэн эсэх
SELECT u.email, r.role FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id WHERE u.email = 'dolgoonoo473@gmail.com';
-- Доор "dolgoonoo473@gmail.com | admin" харагдвал бүгд амжилттай!
