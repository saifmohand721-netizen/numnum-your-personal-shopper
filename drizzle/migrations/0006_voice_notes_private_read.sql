DROP POLICY IF EXISTS "Voice notes readable" ON storage.objects;
CREATE POLICY "Users read own voice notes" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);