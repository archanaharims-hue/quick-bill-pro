
CREATE POLICY "product-images user read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "product-images user insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "product-images user update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "product-images user delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (auth.uid()::text = (storage.foldername(name))[1]));
