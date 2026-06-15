
DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('open','resolved','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.listing_reports
  ADD COLUMN IF NOT EXISTS status public.report_status NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

DROP POLICY IF EXISTS "Admin reads reports" ON public.listing_reports;
CREATE POLICY "Admin reads reports" ON public.listing_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admin updates reports" ON public.listing_reports;
CREATE POLICY "Admin updates reports" ON public.listing_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
