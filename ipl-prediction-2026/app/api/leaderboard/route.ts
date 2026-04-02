import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

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
    if (userId) {
      const { data: user } = await supabase
        .from("leaderboard_humans")
        .select("*")
        .eq("id", userId)
        .single();
      userRank = user;
    }

    return NextResponse.json({
      success: true,
      top_10: rankings,       // keeping key name for backward compat
      user_rank: userRank,
      total_players: totalPlayers,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
