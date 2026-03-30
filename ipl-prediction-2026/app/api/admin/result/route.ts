import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { POINTS_CORRECT, POINTS_UNDERDOG, POINTS_BEAT_AI } from "@/app/lib/scoring";

// Simple secret check — set ADMIN_SECRET env var on Vercel
function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get("x-admin-secret");
  const envSecret = process.env.ADMIN_SECRET;
  if (!envSecret) return true; // no secret configured → allow (dev mode)
  return secret === envSecret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { match_id, winner } = await request.json();

    if (!match_id || !winner) {
      return NextResponse.json({ error: "match_id and winner are required" }, { status: 400 });
    }

    // 1. Get match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Determine favourite (higher probability team)
    const favourite = match.team_1_probability >= match.team_2_probability ? match.team_1 : match.team_2;
    const isUnderdogWon = winner !== favourite;

    // 2. Update match winner and status
    await supabase
      .from("matches")
      .update({ winner, status: "completed" })
      .eq("id", match_id);

    // 3. Get all predictions for this match
    const { data: predictions } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_id", match_id);

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({ success: true, scored: 0, message: "No predictions to score" });
    }

    // 4. Score each prediction
    let scored = 0;
    for (const pred of predictions) {
      const isCorrect = pred.predicted_team === winner;
      const aiIsCorrect = pred.ai_predicted_team === winner;
      const beatAI = isCorrect && !aiIsCorrect;
      const pickedUnderdog = isUnderdogWon && isCorrect;

      let points = 0;
      if (isCorrect) {
        points += pickedUnderdog ? POINTS_UNDERDOG : POINTS_CORRECT;
        if (beatAI) points += POINTS_BEAT_AI;
      }

      await supabase
        .from("predictions")
        .update({
          is_correct: isCorrect,
          points_earned: points,
        })
        .eq("id", pred.id);

      scored++;
    }

    // 5. Update leaderboard totals in users table
    // Group points by user
    const userPoints: Record<string, { correct: number; total: number; points: number }> = {};
    for (const pred of predictions) {
      const isCorrect = pred.predicted_team === winner;
      const aiIsCorrect = pred.ai_predicted_team === winner;
      const beatAI = isCorrect && !aiIsCorrect;
      const pickedUnderdog = isUnderdogWon && isCorrect;

      let points = 0;
      if (isCorrect) {
        points += pickedUnderdog ? POINTS_UNDERDOG : POINTS_CORRECT;
        if (beatAI) points += POINTS_BEAT_AI;
      }

      if (!userPoints[pred.user_id]) {
        userPoints[pred.user_id] = { correct: 0, total: 0, points: 0 };
      }
      userPoints[pred.user_id].total++;
      if (isCorrect) userPoints[pred.user_id].correct++;
      userPoints[pred.user_id].points += points;
    }

    // Update each user's totals
    for (const [userId, stats] of Object.entries(userPoints)) {
      const { data: user } = await supabase
        .from("users")
        .select("total_points, total_predictions, total_correct")
        .eq("id", userId)
        .single();

      if (user) {
        await supabase
          .from("users")
          .update({
            total_points: (user.total_points || 0) + stats.points,
            total_predictions: (user.total_predictions || 0) + stats.total,
            total_correct: (user.total_correct || 0) + stats.correct,
          })
          .eq("id", userId);
      }
    }

    return NextResponse.json({
      success: true,
      match_id,
      winner,
      scored,
      message: `Scored ${scored} predictions. Leaderboard updated.`,
    });
  } catch (err) {
    console.error("[admin/result]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
