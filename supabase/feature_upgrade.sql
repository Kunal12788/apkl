-- ============================================================================
-- FEATURE UPGRADE MIGRATION: EOD 3-PHOTO RECONCILIATION & WORK-SPECIFIC PINS
-- ============================================================================

-- 1. ADD EOD COLUMNS TO branch_daily_reports
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS pure_gold_photo_url TEXT;
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS impure_gold_photo_url TEXT;
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS cash_photo_url TEXT;
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS latitude TEXT;
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS longitude TEXT;
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS location_name TEXT;

ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS physical_closing_cash NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS physical_closing_gold NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS physical_closing_impure_gold NUMERIC(10,3) DEFAULT 0.000;

ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS cash_discrepancy NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS gold_discrepancy NUMERIC(10,3) DEFAULT 0.000;
ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS impure_gold_discrepancy NUMERIC(10,3) DEFAULT 0.000;

ALTER TABLE public.branch_daily_reports ADD COLUMN IF NOT EXISTS discrepancy_note TEXT;

-- 2. INITIALIZE WORK-SPECIFIC SECURITY PINS IN app_settings
INSERT INTO public.app_settings (key, value)
VALUES (
  'security_pins',
  '{
    "cash_payout_pin": "556677",
    "cash_threshold": 50000,
    "bullion_transfer_pin": "889900",
    "bullion_threshold_grams": 20,
    "deletion_clear_pin": "991122"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
