import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("match_id");
  if (!matchId) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ counts: { team_1: 0, team_2: 0, total: 0 } });
  }

  const { data: match } = await supabase
    .from("matches")
    .select("team_1, team_2")
    .eq("id", matchId)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const [{ count: t1 }, { count: t2 }] = await Promise.all([
    supabase.from("predictions").select("*", { count: "exact", head: true }).eq("match_id", matchId).eq("predicted_team", match.team_1),
    supabase.from("predictions").select("*", { count: "exact", head: true }).eq("match_id", matchId).eq("predicted_team", match.team_2),
  ]);

  return NextResponse.json({
    counts: {
      team_1: t1 || 0,
      team_2: t2 || 0,
      total: (t1 || 0) + (t2 || 0),
    },
  });
}
