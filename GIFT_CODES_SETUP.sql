-- ================================================================
-- GIFT CODES TABLE
-- Supabase SQL Editor-т paste хийж Run дарна уу
-- ================================================================

CREATE TABLE IF NOT EXISTS public.gift_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  days INTEGER NOT NULL DEFAULT 30,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can read/manage gift codes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gift_codes' AND policyname='gift_codes_admin_all') THEN
    CREATE POLICY gift_codes_admin_all ON public.gift_codes
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Service role can validate and update codes (for the gift API endpoint)
GRANT ALL ON public.gift_codes TO service_role;

-- Sample gift codes for testing (30-day VIP)
INSERT INTO public.gift_codes (code, days, note) VALUES
  ('MONCONE30', 30, 'Test: 30 хоног VIP'),
  ('VIP2026', 30, 'Test: 2026 VIP код'),
  ('WELCOME7', 7, 'Test: 7 хоног шинэ хэрэглэгч'),
  ('PROMO2026', 30, 'Сурталчилгааны код')
ON CONFLICT (code) DO NOTHING;

-- Verify
SELECT code, days, is_used, note FROM public.gift_codes;
