# Production database setup

1. Open Supabase Dashboard → SQL Editor for the AgriLink project.
2. Run `complete-setup.sql` in full. It creates the public onboarding,
   identity, review, aggregation and audit tables (and their RLS policies).
3. Run `schema.sql` in full for the private `agrilink` workflow schema used by
   orders, sourcing, collection, routing and settlement. Both scripts are
   idempotent and safe to rerun. Do not expose the `agrilink` schema through
   the anon client.
4. In Vercel → Project → Settings → Environment Variables, set
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
   SUPABASE_SERVICE_ROLE_KEY for Production, Preview, and Development.
   Also set DATABASE_URL to the Supabase Postgres transaction-pooler URL
   (port 6543, with sslmode=require). This powers orders, crop matching,
   collection, routing, delivery, and settlement; PGlite is not supported
   on Vercel's read-only function filesystem.
5. Redeploy, then open `/api/health`. It must return `ok: true`,
   `supabase: "ready"`, and `workflow_database: "configured"`. If
   `DATABASE_URL` is missing, workflow APIs intentionally fail instead of
   silently writing to a temporary serverless filesystem.

The service-role key is server-only. Do not use the anon key in its place.
