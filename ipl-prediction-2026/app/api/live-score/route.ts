// GET /api/live-score?team1=CSK&team2=RCB
// Returns live CricAPI data for a specific IPL match (if currently live).
// Called by LiveScoreBanner every 30s during active matches.

import { NextRequest, NextResponse } from "next/server";
import { fetchCricApiMatches } from "@/lib/cricApi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const team1 = request.nextUrl.searchParams.get("team1");
  const team2 = request.nextUrl.searchParams.get("team2");

  if (!team1 || !team2) {
    return NextResponse.json({ error: "team1 and team2 required" }, { status: 400 });
  }

  if (!process.env.CRICAPI_KEY) {
    return NextResponse.json({ match: null, reason: "CRICAPI_KEY not set" });
  }

  try {
    const matches = await fetchCricApiMatches();
    const match = matches.find(
      (m) =>
        (m.team1 === team1 && m.team2 === team2) ||
        (m.team1 === team2 && m.team2 === team1)
    );

    if (!match) {
      return NextResponse.json({ match: null });
    }

    const res = NextResponse.json({ match });
    // Short cache — live scores change frequently
    res.headers.set("Cache-Control", "s-maxage=25, stale-while-revalidate=5");
    return res;
  } catch (err) {
    console.error("[live-score]", err);
    return NextResponse.json({ match: null, error: "CricAPI unavailable" });
  }
}
