
-- 1. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS payment_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 2. Payments table
CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed', 'expired', 'cancelled');

CREATE TABLE public.payments (
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

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_code ON public.payments(payment_code);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_own ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY payments_insert_own ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payments_admin_all ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. App settings (single row)
CREATE TABLE public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bank_name TEXT NOT NULL DEFAULT 'Capitron Bank',
  bank_account_number TEXT NOT NULL DEFAULT '',
  bank_account_name TEXT NOT NULL DEFAULT '',
  premium_price INTEGER NOT NULL DEFAULT 10000,
  telegram_bot_username TEXT NOT NULL DEFAULT 'moncone_bot',
  admin_telegram_chat_id BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (1);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_read_authed ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_read_anon ON public.app_settings FOR SELECT TO anon USING (true);
CREATE POLICY settings_admin_write ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Payment code generator
CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_count INT;
BEGIN
  LOOP
    code := 'MN-' || lpad(floor(random() * 100000)::text, 5, '0');
    SELECT count(*) INTO exists_count FROM public.profiles WHERE payment_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$;

-- 5. Backfill payment codes for existing profiles
UPDATE public.profiles SET payment_code = public.generate_payment_code() WHERE payment_code IS NULL;

-- 6. Replace handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := public.generate_payment_code();

  INSERT INTO public.profiles (id, display_name, payment_code, subscription_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    new_code,
    'free'
  );

  -- Auto-grant admin to known admin email
  IF NEW.email = 'dolgoonoo473@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

-- Ensure trigger is in place
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Helper to confirm payment (admin only) — activates 30-day premium
CREATE OR REPLACE FUNCTION public.confirm_payment(_payment_id UUID)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pmt public.payments;
  new_expiry TIMESTAMPTZ;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can confirm payments';
  END IF;

  SELECT * INTO pmt FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF pmt.status = 'confirmed' THEN RETURN pmt; END IF;

  -- Extend from greater of (now, current expiry) by 30 days
  SELECT GREATEST(COALESCE(p.subscription_expires_at, now()), now()) + INTERVAL '30 days'
    INTO new_expiry FROM public.profiles p WHERE p.id = pmt.user_id;

  UPDATE public.payments
    SET status = 'confirmed', confirmed_at = now(), confirmed_by = auth.uid()
    WHERE id = _payment_id RETURNING * INTO pmt;

  UPDATE public.profiles
    SET subscription_status = 'premium', subscription_expires_at = new_expiry
    WHERE id = pmt.user_id;

  UPDATE public.subscriptions
    SET tier = 'premium', current_period_end = new_expiry, updated_at = now()
    WHERE user_id = pmt.user_id;

  RETURN pmt;
END;
$$;

-- 8. Cancel subscription helper (admin)
CREATE OR REPLACE FUNCTION public.cancel_subscription(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can cancel';
  END IF;
  UPDATE public.profiles SET subscription_status = 'free', subscription_expires_at = NULL WHERE id = _user_id;
  UPDATE public.subscriptions SET tier = 'free', current_period_end = NULL, updated_at = now() WHERE user_id = _user_id;
END;
$$;

-- 9. Daily expiry sweep (callable by cron)
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS TABLE(expired_user_id UUID, telegram_chat_id BIGINT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    UPDATE public.profiles p
      SET subscription_status = 'free', subscription_expires_at = NULL
      WHERE p.subscription_status = 'premium'
        AND p.subscription_expires_at IS NOT NULL
        AND p.subscription_expires_at < now()
      RETURNING p.id, p.telegram_chat_id
  ),
  _sync AS (
    UPDATE public.subscriptions s
      SET tier = 'free', current_period_end = NULL, updated_at = now()
      FROM expired e WHERE s.user_id = e.id
      RETURNING s.user_id
  )
  SELECT e.id, e.telegram_chat_id, u.email::text
    FROM expired e LEFT JOIN auth.users u ON u.id = e.id;
END;
$$;
