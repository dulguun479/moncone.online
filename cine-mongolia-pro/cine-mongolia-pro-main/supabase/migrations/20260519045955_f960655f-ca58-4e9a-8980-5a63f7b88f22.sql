-- Add R2 key + broadcast flag to movies
ALTER TABLE public.movies
  ADD COLUMN IF NOT EXISTS r2_key text,
  ADD COLUMN IF NOT EXISTS broadcast_sent boolean NOT NULL DEFAULT false;

-- Ads table
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

DROP POLICY IF EXISTS ads_select_public ON public.ads;
CREATE POLICY ads_select_public ON public.ads FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS ads_admin_all ON public.ads;
CREATE POLICY ads_admin_all ON public.ads FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Ad clicks (basic log; counter denormalized on ads)
CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid,
  page text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_clicks_ad_id_idx ON public.ad_clicks(ad_id);
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ad_clicks_insert_any ON public.ad_clicks;
CREATE POLICY ad_clicks_insert_any ON public.ad_clicks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS ad_clicks_admin_read ON public.ad_clicks;
CREATE POLICY ad_clicks_admin_read ON public.ad_clicks FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Broadcasts log
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid,
  message text NOT NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS broadcasts_admin_all ON public.broadcasts;
CREATE POLICY broadcasts_admin_all ON public.broadcasts FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Helper: increment ad click count
CREATE OR REPLACE FUNCTION public.increment_ad_click(_ad_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ads SET click_count = click_count + 1 WHERE id = _ad_id;
$$;