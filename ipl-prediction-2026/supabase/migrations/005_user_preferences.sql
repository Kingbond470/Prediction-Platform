-- Migration 005: User Preferences — city + favorite team
-- These power the personalized team theme and future city-based features.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS favorite_team VARCHAR(10);

-- Index for future city-based leaderboards / analytics
CREATE INDEX IF NOT EXISTS idx_users_favorite_team ON public.users(favorite_team);
CREATE INDEX IF NOT EXISTS idx_users_city ON public.users(city);
