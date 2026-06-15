REVOKE SELECT ON public.market_listings FROM authenticated;
GRANT SELECT (id, user_id, country, region, crop_name, qty, unit, price, currency, image_path, status, moderated_by, moderated_at, created_at)
  ON public.market_listings TO authenticated;
GRANT ALL ON public.market_listings TO service_role;