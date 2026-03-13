-- Add currency_preference_confirmed_at to Company for first-time currency setup
ALTER TABLE "Company" ADD COLUMN "currency_preference_confirmed_at" TIMESTAMP(3);

-- Backfill: existing companies are treated as already confirmed
UPDATE "Company" SET "currency_preference_confirmed_at" = NOW() WHERE "currency_preference_confirmed_at" IS NULL;
