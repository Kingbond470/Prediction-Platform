-- ────────────────────────────────────────────────────────────────────────────
-- 009_realistic_seed_counts.sql
--
-- Sets initial_count_team_1 / initial_count_team_2 for all matches to
-- realistic IPL-fan-scale numbers.
--
-- Formula:
--   total_votes = (popularity_team1 + popularity_team2) * 100
--   team1_votes = total_votes * (team_1_probability / 100) * slight_variation
--   team2_votes = total_votes * (team_2_probability / 100) * slight_variation
--
-- Popularity tiers (based on IPL fan base size):
--   Tier A (120): CSK, MI
--   Tier B (100): RCB, KKR
--   Tier C (80):  DC, SRH, RR, PBKS
--   Tier D (60):  GT, LSG
--
-- Examples after update:
--   CSK vs MI  (55/45%): ~13,200 / 10,800 = 24,000 total
--   RCB vs KKR (60/40%): ~12,000 / 8,000  = 20,000 total
--   DC  vs SRH (52/48%): ~8,320  / 7,680  = 16,000 total
--   GT  vs LSG (55/45%): ~6,600  / 5,400  = 12,000 total
-- ────────────────────────────────────────────────────────────────────────────

UPDATE matches
SET
  initial_count_team_1 = GREATEST(1000, FLOOR(
    (
      CASE team_1
        WHEN 'CSK'  THEN 120
        WHEN 'MI'   THEN 120
        WHEN 'RCB'  THEN 100
        WHEN 'KKR'  THEN 100
        WHEN 'DC'   THEN 80
        WHEN 'SRH'  THEN 80
        WHEN 'RR'   THEN 80
        WHEN 'PBKS' THEN 80
        WHEN 'GT'   THEN 60
        WHEN 'LSG'  THEN 60
        ELSE             70
      END
      +
      CASE team_2
        WHEN 'CSK'  THEN 120
        WHEN 'MI'   THEN 120
        WHEN 'RCB'  THEN 100
        WHEN 'KKR'  THEN 100
        WHEN 'DC'   THEN 80
        WHEN 'SRH'  THEN 80
        WHEN 'RR'   THEN 80
        WHEN 'PBKS' THEN 80
        WHEN 'GT'   THEN 60
        WHEN 'LSG'  THEN 60
        ELSE             70
      END
    )
    * 100.0
    * team_1_probability / 100.0
    * (1.0 + ((match_number % 5) - 2) * 0.05)   -- ±10% natural variation
  )),

  initial_count_team_2 = GREATEST(1000, FLOOR(
    (
      CASE team_1
        WHEN 'CSK'  THEN 120
        WHEN 'MI'   THEN 120
        WHEN 'RCB'  THEN 100
        WHEN 'KKR'  THEN 100
        WHEN 'DC'   THEN 80
        WHEN 'SRH'  THEN 80
        WHEN 'RR'   THEN 80
        WHEN 'PBKS' THEN 80
        WHEN 'GT'   THEN 60
        WHEN 'LSG'  THEN 60
        ELSE             70
      END
      +
      CASE team_2
        WHEN 'CSK'  THEN 120
        WHEN 'MI'   THEN 120
        WHEN 'RCB'  THEN 100
        WHEN 'KKR'  THEN 100
        WHEN 'DC'   THEN 80
        WHEN 'SRH'  THEN 80
        WHEN 'RR'   THEN 80
        WHEN 'PBKS' THEN 80
        WHEN 'GT'   THEN 60
        WHEN 'LSG'  THEN 60
        ELSE             70
      END
    )
    * 100.0
    * team_2_probability / 100.0
    * (1.0 + ((match_number % 7) - 3) * 0.04)   -- slightly different seed → different pattern
  ));
