-- ============================================
-- WEEKLY VOUCHER REWARD SYSTEM
-- ============================================

-- Add week_number to predictions (IST week 1-10 of IPL season)
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- Index for fast weekly pool queries
CREATE INDEX IF NOT EXISTS idx_predictions_week_number
  ON public.predictions(week_number);

CREATE INDEX IF NOT EXISTS idx_predictions_week_correct
  ON public.predictions(week_number, is_correct);

-- ============================================
-- WEEKLY DRAW POOL
-- Tracks pool size and draw status per week
-- ============================================
CREATE TABLE IF NOT EXISTS public.weekly_draw_pool (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number             INTEGER NOT NULL UNIQUE,
  total_correct_predictors INTEGER DEFAULT 0,
  draw_status             VARCHAR(20) DEFAULT 'pending',
  -- pending | in_progress | completed
  draw_executed_at        TIMESTAMP,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_weekly_draw_pool_week
  ON public.weekly_draw_pool(week_number);

-- ============================================
-- WEEKLY VOUCHER WINNERS
-- Stores the 10 winners per week
-- ============================================
CREATE TABLE IF NOT EXISTS public.weekly_voucher_winners (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  username         VARCHAR(50) NOT NULL,
  week_number      INTEGER NOT NULL,
  voucher_platform VARCHAR(20),
  -- 'swiggy' | 'zomato'
  voucher_code     VARCHAR(100),
  -- filled in manually by ops
  announced_at     TIMESTAMP,
  is_notified      BOOLEAN DEFAULT false,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, week_number)
  -- one win per user per week
);

CREATE INDEX IF NOT EXISTS idx_weekly_winners_week
  ON public.weekly_voucher_winners(week_number);

CREATE INDEX IF NOT EXISTS idx_weekly_winners_user
  ON public.weekly_voucher_winners(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.weekly_draw_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_voucher_winners ENABLE ROW LEVEL SECURITY;

-- Anyone can read pool stats (for live counter)
CREATE POLICY "Weekly draw pool is public"
  ON public.weekly_draw_pool FOR SELECT USING (true);

-- Anyone can read winners (for announcement display)
CREATE POLICY "Weekly winners are public"
  ON public.weekly_voucher_winners FOR SELECT USING (true);

-- Service role can do everything (used by admin API routes)
CREATE POLICY "Service role manages draw pool"
  ON public.weekly_draw_pool FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages winners"
  ON public.weekly_voucher_winners FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
