# NumNum on your own Supabase + Netlify

1. Supabase -> SQL Editor: run `deploy/supabase-schema.sql`.
2. Supabase -> Authentication -> Providers: enable **Email** and **Google** (paste your Google Client ID/Secret).
   In Google Cloud Console add redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`.
3. Supabase -> Authentication -> URL Configuration:
   - Site URL: `https://effulgent-hummingbird-37b3f0.netlify.app`
   - Redirect URLs: `https://effulgent-hummingbird-37b3f0.netlify.app/**`
4. Netlify -> Site settings -> Environment variables:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = anon / publishable key
   - `SUPABASE_URL` = same project URL (server side)
   - `SUPABASE_PUBLISHABLE_KEY` = same anon / publishable key (server side)
   - `SUPABASE_SERVICE_ROLE_KEY` = service role key (server only — never prefix with VITE_)
   - `DRIVER_PIN` = 6-digit driver code
5. Redeploy.
