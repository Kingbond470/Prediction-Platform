-- Migration 007: Add beat_ai_count to leaderboard view
-- beat_ai_count = predictions where user was correct AND AI was wrong
-- This is the core metric for the "Human vs AI" product identity.
-- Also rounds win_percentage to 1 decimal (was 2).

DROP VIEW IF EXISTS public.leaderboard_humans;

CREATE VIEW public.leaderboard_humans AS
SELECT
  u.id,
  u.username,
  COUNT(p.id)::int                                                                AS total_predictions,
  COUNT(p.id) FILTER (WHERE p.is_correct = true)::int                            AS total_correct,
  COUNT(p.id) FILTER (
    WHERE p.is_correct = true
      AND p.ai_predicted_team IS NOT NULL
      AND p.ai_predicted_team <> p.predicted_team
  )::int                                                                          AS beat_ai_count,
  COALESCE(SUM(p.points_earned), 0)::int                                         AS total_points,
  ROUND(
    (COUNT(p.id) FILTER (WHERE p.is_correct = true)::float
     / NULLIF(COUNT(p.id), 0) * 100)::numeric, 1
  )                                                                               AS win_percentage,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(SUM(p.points_earned), 0) DESC,
             COUNT(p.id) FILTER (WHERE p.is_correct = true) DESC,
             COUNT(p.id) DESC
  )::int                                                                          AS rank
FROM public.users u
JOIN public.predictions p ON p.user_id = u.id
GROUP BY u.id, u.username;
