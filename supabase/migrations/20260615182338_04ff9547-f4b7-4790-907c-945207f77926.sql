
CREATE TABLE IF NOT EXISTS public.listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.market_listings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, reporter_id)
);
GRANT SELECT, INSERT ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_listing_reports_listing ON public.listing_reports(listing_id);

DROP POLICY IF EXISTS "Reporter inserts" ON public.listing_reports;
CREATE POLICY "Reporter inserts" ON public.listing_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Reporter reads own" ON public.listing_reports;
CREATE POLICY "Reporter reads own" ON public.listing_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin'));
