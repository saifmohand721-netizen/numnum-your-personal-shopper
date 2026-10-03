ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS voice_note_url text;
CREATE POLICY "Users upload own voice notes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Voice notes readable" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'voice-notes');