-- 008_user_streaks.sql
-- Add streak tracking columns to users table.
-- current_streak: consecutive correct predictions (resets to 0 on a wrong pick)
-- max_streak:     highest streak ever achieved by the user

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_streak     INT NOT NULL DEFAULT 0;
