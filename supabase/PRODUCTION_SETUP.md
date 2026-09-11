# Production database setup

1. Open Supabase Dashboard → SQL Editor for the AgriLink project.
2. Run auth-workflow.sql in full. It is safe to rerun and upgrades the
   earlier strict profile schema to support mobile-first onboarding.
3. Run identity.sql, then create the private identity-documents Storage bucket.
4. In Vercel → Project → Settings → Environment Variables, set
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
   SUPABASE_SERVICE_ROLE_KEY for Production, Preview, and Development.
   Also set DATABASE_URL to the Supabase Postgres transaction-pooler URL
   (port 6543, with sslmode=require). This powers orders, crop matching,
   collection, routing, delivery, and settlement; PGlite is not supported
   on Vercel's read-only function filesystem.
5. Redeploy, then open /api/health. It must return an ok true, supabase ready
   JSON response.

The service-role key is server-only. Do not use the anon key in its place.
