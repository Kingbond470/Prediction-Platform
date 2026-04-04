-- Migration 011: Include trivia_points in leaderboard total
-- trivia_points live on users table (awarded by increment_trivia_points RPC).
-- Adding them to total_points here means the leaderboard reflects the full
-- player score without touching any other API or UI code.

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
  (COALESCE(SUM(p.points_earned), 0) + COALESCE(u.trivia_points, 0))::int       AS total_points,
  ROUND(
    (COUNT(p.id) FILTER (WHERE p.is_correct = true)::float
     / NULLIF(COUNT(p.id), 0) * 100)::numeric, 1
  )                                                                               AS win_percentage,
  ROW_NUMBER() OVER (
    ORDER BY (COALESCE(SUM(p.points_earned), 0) + COALESCE(u.trivia_points, 0)) DESC,
             COUNT(p.id) FILTER (WHERE p.is_correct = true) DESC,
             COUNT(p.id) DESC
  )::int                                                                          AS rank
FROM public.users u
JOIN public.predictions p ON p.user_id = u.id
GROUP BY u.id, u.username, u.trivia_points;
