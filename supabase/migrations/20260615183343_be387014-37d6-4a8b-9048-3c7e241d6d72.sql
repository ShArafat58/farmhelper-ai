CREATE POLICY "Owner inserts usage" ON public.ai_usage_daily
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates usage" ON public.ai_usage_daily
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);