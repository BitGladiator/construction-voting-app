# Supabase Setup

## Quick setup for production

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **SQL Editor**.
3. Run the base schema first (if you haven't already): `supabase/schema.sql`
4. Run the votes setup: `supabase/production_setup.sql`
5. Deploy your Next.js app.

That's it. The votes table and security policies will be in place.
