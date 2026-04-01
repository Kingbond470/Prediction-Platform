-- Migration 006: Fix leaderboard view to compute live from predictions table
-- Old view read from users.total_predictions counter which was never updated.
-- New view joins predictions directly, so it updates on every vote.

CREATE OR REPLACE VIEW public.leaderboard_humans AS
SELECT
  u.id,
  u.username,
  COUNT(p.id)::int AS total_predictions,
  COUNT(p.id) FILTER (WHERE p.is_correct = true)::int AS total_correct,
  COALESCE(SUM(p.points_earned), 0)::int AS total_points,
  ROUND(
    (COUNT(p.id) FILTER (WHERE p.is_correct = true)::float
     / NULLIF(COUNT(p.id), 0) * 100)::numeric, 2
  ) AS win_percentage,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(SUM(p.points_earned), 0) DESC, COUNT(p.id) DESC
  )::int AS rank
FROM public.users u
JOIN public.predictions p ON p.user_id = u.id
GROUP BY u.id, u.username;
