import { supabase } from "@/lib/supabase";
import { POINTS_CORRECT, POINTS_UNDERDOG, POINTS_BEAT_AI, POINTS_STREAK_3, POINTS_STREAK_5 } from "@/app/lib/scoring";

/**
 * Mark a match as completed, score all predictions, and update leaderboard totals.
 * Safe to call from both the auto-sync and the admin panel — skips if already completed.
 * Returns the number of predictions scored, or -1 if match was already completed.
 */
export async function scoreMatch(matchId: string, winner: string): Promise<number> {
  // 1. Fetch match
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (matchError || !match) throw new Error(`Match ${matchId} not found`);
  if (match.status === "completed") return -1; // already done

  // Validate winner is one of the two teams
  if (winner !== match.team_1 && winner !== match.team_2) {
    throw new Error(`Winner "${winner}" is not a team in match ${matchId}`);
  }

  const favourite = match.team_1_probability >= match.team_2_probability
    ? match.team_1
    : match.team_2;
  const isUnderdogWon = winner !== favourite;

  // 2. Mark match completed
  await supabase
    .from("matches")
    .update({ winner, status: "completed" })
    .eq("id", matchId);

  // 3. Get predictions
  const { data: predictions } = await supabase
    .from("predictions")
    .select("*")
    .eq("match_id", matchId);

  if (!predictions || predictions.length === 0) return 0;

  // 4. Score each prediction + accumulate user totals
  const userPoints: Record<string, { correct: number; total: number; points: number; isCorrect: boolean }> = {};

  for (const pred of predictions) {
    const isCorrect      = pred.predicted_team === winner;
    const aiIsCorrect    = pred.ai_predicted_team === winner;
    const beatAI         = isCorrect && !aiIsCorrect;
    const pickedUnderdog = isUnderdogWon && isCorrect;

    let points = 0;
    if (isCorrect) {
      points += pickedUnderdog ? POINTS_UNDERDOG : POINTS_CORRECT;
      if (beatAI) points += POINTS_BEAT_AI;
    }

    await supabase
      .from("predictions")
      .update({ is_correct: isCorrect, points_earned: points })
      .eq("id", pred.id);

    if (!userPoints[pred.user_id]) {
      userPoints[pred.user_id] = { correct: 0, total: 0, points: 0, isCorrect: false };
    }
    userPoints[pred.user_id].total++;
    userPoints[pred.user_id].isCorrect = isCorrect;
    if (isCorrect) userPoints[pred.user_id].correct++;
    userPoints[pred.user_id].points += points;
  }

  // 5. Update leaderboard totals + streak tracking
  for (const [userId, stats] of Object.entries(userPoints)) {
    const { data: user } = await supabase
      .from("users")
      .select("total_points, total_predictions, total_correct, current_streak, max_streak")
      .eq("id", userId)
      .single();

    if (user) {
      const prevStreak = user.current_streak ?? 0;
      const newStreak  = stats.isCorrect ? prevStreak + 1 : 0;
      const newMax     = Math.max(user.max_streak ?? 0, newStreak);

      // Streak milestone bonuses (awarded only when streak first reaches the threshold)
      let streakBonus = 0;
      if (stats.isCorrect) {
        if (newStreak === 3) streakBonus = POINTS_STREAK_3;
        else if (newStreak === 5) streakBonus = POINTS_STREAK_5;
        else if (newStreak > 5 && newStreak % 5 === 0) streakBonus = POINTS_STREAK_5; // every 5th after that
      }
      stats.points += streakBonus;

      // Backfill streak bonus into prediction row
      if (streakBonus > 0) {
        const pred = predictions.find((p) => p.user_id === userId);
        if (pred) {
          await supabase
            .from("predictions")
            .update({ points_earned: (pred.points_earned ?? 0) + streakBonus })
            .eq("id", pred.id);
        }
      }

      await supabase
        .from("users")
        .update({
          total_points:      (user.total_points      ?? 0) + stats.points,
          total_predictions: (user.total_predictions ?? 0) + stats.total,
          total_correct:     (user.total_correct     ?? 0) + stats.correct,
          current_streak:    newStreak,
          max_streak:        newMax,
        })
        .eq("id", userId);
    }
  }

  return predictions.length;
}
