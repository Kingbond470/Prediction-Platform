// GET /api/cric-sync
// Called by Vercel Cron every 15 minutes during match hours.
// 1. Fetches completed IPL matches from CricAPI
// 2. Finds matching "live" rows in Supabase (by team pair)
// 3. Auto-scores them via scoreMatch() — same as the admin does manually
// 4. Fires push notifications to subscribers
//
// Protected by CRON_SECRET (set in Vercel env → checked via Authorization header).
// Can also be triggered manually: curl -H "Authorization: Bearer $CRON_SECRET" /api/cric-sync

import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { scoreMatch } from "@/lib/scoreMatch";
import { fetchCompletedIPLMatches } from "@/lib/cricApi";
import { sendMatchResultPush } from "@/lib/sendPushNotifications";
import { timingSafeEqual } from "crypto";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  // If no secret is set, allow in dev (NEXT_PUBLIC_SUPABASE_URL not set)
  if (!cronSecret) return !process.env.NEXT_PUBLIC_SUPABASE_URL;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.CRICAPI_KEY) {
    return NextResponse.json({ skipped: true, reason: "CRICAPI_KEY not set" });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ skipped: true, reason: "No Supabase in dev mode" });
  }

  try {
    const completedMatches = await fetchCompletedIPLMatches();

    if (completedMatches.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No completed matches found" });
    }

    const results: Array<{ match: string; winner: string; scored: number; alreadyDone: boolean }> = [];

    for (const cm of completedMatches) {
      // Find the DB row — try both team orderings
      const { data: fwd } = await supabase
        .from("matches")
        .select("id, team_1, team_2, status")
        .eq("team_1", cm.team1)
        .eq("team_2", cm.team2)
        .maybeSingle();
      const { data: rev } = await supabase
        .from("matches")
        .select("id, team_1, team_2, status")
        .eq("team_1", cm.team2)
        .eq("team_2", cm.team1)
        .maybeSingle();
      const match = fwd || rev;

      if (!match) continue; // not in our DB yet — skip

      if (match.status === "completed") {
        results.push({ match: `${cm.team1} vs ${cm.team2}`, winner: cm.winner ?? "No Result", scored: 0, alreadyDone: true });
        continue;
      }

      // No result (rain/abandoned) — mark completed but skip scoring
      if (cm.noResult) {
        await supabase
          .from("matches")
          .update({ status: "completed", winner: null })
          .eq("id", match.id);
        results.push({ match: `${cm.team1} vs ${cm.team2}`, winner: "No Result", scored: 0, alreadyDone: false });
        continue;
      }

      const scored = await scoreMatch(match.id, cm.winner!);
      results.push({ match: `${cm.team1} vs ${cm.team2}`, winner: cm.winner!, scored, alreadyDone: false });

      // Push notifications — fire-and-forget
      const winnerName = cm.winner!;
      const loser = match.team_1 === winnerName ? match.team_2 : match.team_1;
      sendMatchResultPush(match.id, {
        title: `${winnerName} beat ${loser}! 🏏`,
        body: `Result is in — check how you did vs the AI!`,
        url: `/results?match_id=${match.id}`,
        tag: `result-${match.id}`,
      }).catch(() => {});
    }

    const newlyScored = results.filter((r) => !r.alreadyDone);

    return NextResponse.json({
      success: true,
      processed: results.length,
      newlyScored: newlyScored.length,
      results,
    });
  } catch (err) {
    console.error("[cric-sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
