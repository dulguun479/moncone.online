-- 1. Админ эрх олгох (dolgoonoo473@gmail.com)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'dolgoonoo473@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Profiles хүснэгтийн багануудыг шалгаж нэмэх (telegram_chat_id, payment_code, гэх мэт)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS payment_code TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 3. Payment code байхгүй хэрэглэгчдэд шинээр код үүсгэх
UPDATE public.profiles 
SET payment_code = 'MN-' || lpad(floor(random() * 100000)::text, 5, '0')
WHERE payment_code IS NULL;

-- 4. app_settings хүснэгтэд тохиргооны мөр үүсгэх
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

