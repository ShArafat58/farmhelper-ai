-- Allow authenticated users to read images referenced by active market listings
CREATE POLICY "fh_images_read_active_listings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'farmhelper-images'
  AND EXISTS (
    SELECT 1 FROM public.market_listings ml
    WHERE ml.image_path = storage.objects.name
      AND ml.status = 'active'
  )
);

-- Document intentional service-role-only access for password_reset_attempts
COMMENT ON TABLE public.password_reset_attempts IS
  'Rate-limit tracking for password reset. Accessed exclusively by trusted server code via the service role (supabaseAdmin). RLS is enabled with no policies by design so no client role (anon/authenticated) can read or write directly.';
