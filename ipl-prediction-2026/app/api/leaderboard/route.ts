import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    // Get top 10
    const { data: top10 } = await supabase
      .from("leaderboard_humans")
      .select("*")
      .order("rank", { ascending: true })
      .limit(10);

    // Get user's rank
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
      top_10: top10 || [],
      user_rank: userRank,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
