
CREATE POLICY "post_media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'post-media');
CREATE POLICY "post_media_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "post_media_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
