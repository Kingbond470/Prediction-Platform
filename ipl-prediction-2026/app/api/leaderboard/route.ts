import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    const period = request.nextUrl.searchParams.get("period");

    // ── Weekly leaderboard ────────────────────────────────────────────────────
    if (period === "weekly") {
      const now = new Date();
      const dayOfWeek = now.getUTCDay(); // 0=Sun
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
      weekStart.setUTCHours(0, 0, 0, 0);

      const { data: weekPreds } = await supabase
        .from("predictions")
        .select("user_id, points_earned, is_correct, ai_predicted_team, predicted_team")
        .gte("created_at", weekStart.toISOString())
        .not("points_earned", "is", null);

      const userMap = new Map<string, { points: number; total: number; correct: number; beatAi: number }>();
      for (const p of weekPreds || []) {
        const e = userMap.get(p.user_id) ?? { points: 0, total: 0, correct: 0, beatAi: 0 };
        e.points += p.points_earned ?? 0;
        e.total++;
        if (p.is_correct) {
          e.correct++;
          if (p.ai_predicted_team !== p.predicted_team) e.beatAi++;
        }
        userMap.set(p.user_id, e);
      }

      if (userMap.size === 0) {
        return NextResponse.json({ success: true, top_10: [], user_rank: null, total_players: 0 });
      }

      const sorted = Array.from(userMap.entries()).sort((a, b) => b[1].points - a[1].points);
      const top50Ids = sorted.slice(0, 50).map(([id]) => id);

      const { data: users } = await supabase.from("users").select("id, username").in("id", top50Ids);
      const usernameMap = new Map((users || []).map((u) => [u.id, u.username]));

      const rankings = top50Ids.map((id, idx) => {
        const e = userMap.get(id)!;
        return {
          id,
          username: usernameMap.get(id) || "Unknown",
          total_points: e.points,
          total_predictions: e.total,
          total_correct: e.correct,
          beat_ai_count: e.beatAi,
          win_percentage: e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0,
          rank: idx + 1,
        };
      });

      let userWeekRank = null;
      if (userId) {
        const userIdx = sorted.findIndex(([id]) => id === userId);
        if (userIdx >= 0) {
          const [uid, e] = sorted[userIdx];
          const { data: u } = await supabase
            .from("users")
            .select("username, current_streak, max_streak")
            .eq("id", uid)
            .single();
          userWeekRank = {
            id: uid,
            username: u?.username || "Unknown",
            total_points: e.points,
            total_predictions: e.total,
            total_correct: e.correct,
            beat_ai_count: e.beatAi,
            win_percentage: e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0,
            rank: userIdx + 1,
            current_streak: u?.current_streak ?? 0,
            max_streak:     u?.max_streak ?? 0,
          };
        }
      }

      return NextResponse.json({ success: true, top_10: rankings, user_rank: userWeekRank, total_players: userMap.size });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Run both queries in parallel
    const [rankingsRes, countRes] = await Promise.all([
      supabase
        .from("leaderboard_humans")
        .select("*")
        .order("rank", { ascending: true })
        .limit(50),
      supabase
        .from("leaderboard_humans")
        .select("id", { count: "exact", head: true }),
    ]);

    const rankings = rankingsRes.data || [];
    const totalPlayers = countRes.count ?? rankings.length;

    // Get the requesting user's own rank (may be outside top 50)
    let userRank = null;
    let rival = null;
    if (userId) {
      const [rankRes, streakRes] = await Promise.all([
        supabase.from("leaderboard_humans").select("*").eq("id", userId).single(),
        supabase.from("users").select("current_streak, max_streak").eq("id", userId).single(),
      ]);
      if (rankRes.data) {
        userRank = {
          ...rankRes.data,
          current_streak: streakRes.data?.current_streak ?? 0,
          max_streak:     streakRes.data?.max_streak ?? 0,
        };

        // Rival = person ranked just above (defender if rank 1)
        const rivalRank = userRank.rank === 1 ? 2 : userRank.rank - 1;
        // Check if already in the fetched top-50 list first
        const rivalInList = rankings.find((r) => r.rank === rivalRank);
        if (rivalInList) {
          rival = rivalInList;
        } else if (rivalRank > 0) {
          const { data: rivalData } = await supabase
            .from("leaderboard_humans")
            .select("*")
            .eq("rank", rivalRank)
            .maybeSingle();
          rival = rivalData ?? null;
        }
      }
    }

    return NextResponse.json({
      success: true,
      top_10: rankings,       // keeping key name for backward compat
      user_rank: userRank,
      rival,
      total_players: totalPlayers,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
