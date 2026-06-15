
-- Restore table-level GRANTs for authenticated role (Data API access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_listings TO authenticated;
GRANT ALL ON public.market_listings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_plots TO authenticated;
GRANT ALL ON public.farm_plots TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_tasks TO authenticated;
GRANT ALL ON public.calendar_tasks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnoses TO authenticated;
GRANT ALL ON public.diagnoses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_plans TO authenticated;
GRANT ALL ON public.crop_plans TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_replies TO authenticated;
GRANT ALL ON public.community_replies TO service_role;

GRANT SELECT ON public.market_prices TO authenticated;
GRANT ALL ON public.market_prices TO service_role;

GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_answers TO authenticated;
GRANT ALL ON public.security_answers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_reveals TO authenticated;
GRANT ALL ON public.contact_reveals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.ai_usage_daily TO authenticated;
GRANT ALL ON public.ai_usage_daily TO service_role;

GRANT ALL ON public.password_reset_attempts TO service_role;

-- Ensure RLS still enabled on market_listings
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;
