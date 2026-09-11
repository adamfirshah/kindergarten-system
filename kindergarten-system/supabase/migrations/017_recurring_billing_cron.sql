-- Run after 016 in hosted Supabase. Runs at 09:00 Malaysia time / 01:00 UTC.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('papa-recurring-billing-daily','0 1 * * *',
  $$SELECT public.run_recurring_billing();$$);
-- Inspect executions in Supabase → Integrations → Cron.
