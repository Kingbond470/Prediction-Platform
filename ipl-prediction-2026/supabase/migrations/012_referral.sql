-- Migration 012: Referral program
-- referred_by: the user who shared the invite link
-- referral_bonus_awarded: prevents double-awarding points

ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_bonus_awarded BOOLEAN NOT NULL DEFAULT FALSE;

-- Atomic function: award 500 pts to both referrer and referee at signup
CREATE OR REPLACE FUNCTION award_referral_bonus(referrer_id UUID, referee_id UUID)
RETURNS VOID LANGUAGE sql AS $$
  UPDATE users
  SET    trivia_points = trivia_points + 500,
         referral_bonus_awarded = TRUE
  WHERE  id IN (referrer_id, referee_id);
$$;
