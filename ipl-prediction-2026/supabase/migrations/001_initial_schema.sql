-- ============================================
-- ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100),
  username VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_points INT DEFAULT 0,
  total_predictions INT DEFAULT 0,
  total_correct INT DEFAULT 0,
  current_rank INT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_total_points ON users(total_points DESC);

-- ============================================
-- MATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_number INT NOT NULL UNIQUE,
  team_1 VARCHAR(50) NOT NULL,
  team_2 VARCHAR(50) NOT NULL,
  venue VARCHAR(100) NOT NULL,
  city VARCHAR(50) NOT NULL,
  match_date TIMESTAMP NOT NULL,
  vote_start_time TIMESTAMP NOT NULL,
  vote_end_time TIMESTAMP NOT NULL,
  team_1_probability DECIMAL(5, 2) NOT NULL,
  team_2_probability DECIMAL(5, 2) NOT NULL,
  winner VARCHAR(50),
  status VARCHAR(20) DEFAULT 'upcoming',
  initial_count_team_1 INT DEFAULT 104000,
  initial_count_team_2 INT DEFAULT 60000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_matches_match_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);

-- ============================================
-- PREDICTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  predicted_team VARCHAR(50) NOT NULL,
  ai_predicted_team VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_correct BOOLEAN,
  is_correct_vs_ai BOOLEAN,
  points_earned INT DEFAULT 0,
  bonus_points INT DEFAULT 0,
  UNIQUE(user_id, match_id)
);

CREATE INDEX idx_predictions_user_id ON predictions(user_id);
CREATE INDEX idx_predictions_match_id ON predictions(match_id);

-- ============================================
-- INSERT SAMPLE MATCH DATA (For MVP)
-- ============================================
INSERT INTO matches (
  match_number, team_1, team_2, venue, city, match_date,
  vote_start_time, vote_end_time, team_1_probability, team_2_probability
) VALUES
(1, 'CSK', 'RCB', 'MA Chidambaram Stadium', 'Chennai',
 NOW() + INTERVAL '1 day', NOW(), NOW() + INTERVAL '5 minutes', 70.00, 30.00),
(2, 'MI', 'DC', 'Arun Jaitley Stadium', 'Delhi',
 NOW() + INTERVAL '2 days', NOW(), NOW() + INTERVAL '5 minutes', 65.00, 35.00),
(3, 'KKR', 'SRH', 'Eden Gardens', 'Kolkata',
 NOW() + INTERVAL '3 days', NOW(), NOW() + INTERVAL '5 minutes', 55.00, 45.00);

-- ============================================
-- LEADERBOARD VIEW
-- ============================================
CREATE OR REPLACE VIEW public.leaderboard_humans AS
SELECT
  u.id,
  u.username,
  u.total_points,
  u.total_predictions,
  u.total_correct,
  ROUND((u.total_correct::FLOAT / NULLIF(u.total_predictions, 0) * 100)::NUMERIC, 2) as win_percentage,
  ROW_NUMBER() OVER (ORDER BY u.total_points DESC) as rank
FROM public.users u
WHERE u.total_predictions > 0
ORDER BY u.total_points DESC;

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Allow public read on matches
CREATE POLICY "Matches are public" ON public.matches
  FOR SELECT USING (true);

-- Allow read own predictions
CREATE POLICY "Users can read own predictions" ON public.predictions
  FOR SELECT USING (auth.uid() = user_id);

-- Allow insert own predictions
CREATE POLICY "Users can create own predictions" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow read own user data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);
