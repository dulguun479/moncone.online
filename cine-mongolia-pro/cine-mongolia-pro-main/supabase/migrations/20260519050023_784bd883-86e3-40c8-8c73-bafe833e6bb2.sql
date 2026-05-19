-- Drop exposed SECURITY DEFINER function
DROP FUNCTION IF EXISTS public.increment_ad_click(uuid);

-- Trigger to bump click_count automatically
CREATE OR REPLACE FUNCTION public._bump_ad_click()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ads SET click_count = click_count + 1 WHERE id = NEW.ad_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._bump_ad_click() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ad_clicks_bump ON public.ad_clicks;
CREATE TRIGGER ad_clicks_bump AFTER INSERT ON public.ad_clicks
  FOR EACH ROW EXECUTE FUNCTION public._bump_ad_click();

-- Tighten click insert: must target an active ad
DROP POLICY IF EXISTS ad_clicks_insert_any ON public.ad_clicks;
CREATE POLICY ad_clicks_insert_active ON public.ad_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ads a WHERE a.id = ad_id AND a.is_active));