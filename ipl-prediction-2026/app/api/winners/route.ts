import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentWeekNumber } from "@/lib/weekUtils";

const MIGRATION_ERROR_CODES = new Set(["42P01", "PGRST205", "PGRST204"]);

/**
 * GET /api/winners?week=3&user_id=xxx
 *
 * Returns winners for a given week (defaults to last completed week).
 * Gracefully returns empty if migration tables don't exist yet.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const weekParam = searchParams.get("week");

  const currentWeek = getCurrentWeekNumber() ?? 1;
  const weekNumber = weekParam ? parseInt(weekParam, 10) : Math.max(currentWeek - 1, 1);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      success: true,
      weekNumber,
      drawStatus: "completed",
      totalCorrectPredictors: 14293,
      winners: [
        "@cricket_king_mumbai", "@rcb_forever_99", "@dhoni_believer",
        "@ipl_gyaani", "@six_machine_fan", "@stumped_by_none",
        "@boundary_seeker", "@yorker_master", "@cover_drive_king",
        "@csk_yellow_army",
      ],
      userWon: false,
      isMock: true,
    });
  }

  try {
    const { data: winners, error } = await supabase
      .from("weekly_voucher_winners")
      .select("username, user_id, announced_at")
      .eq("week_number", weekNumber)
      .order("created_at", { ascending: true });

    if (error) {
      // Table not yet created — return empty result, not an error
      if (MIGRATION_ERROR_CODES.has(error.code)) {
        return NextResponse.json({
          success: true,
          weekNumber,
          drawStatus: "pending",
          totalCorrectPredictors: 0,
          winners: [],
          userWon: false,
        });
      }
      throw error;
    }

    // weekly_draw_pool may not exist yet — silently ignore
    let poolData: { draw_status: string; total_correct_predictors: number } | null = null;
    try {
      const { data } = await supabase
        .from("weekly_draw_pool")
        .select("draw_status, total_correct_predictors")
        .eq("week_number", weekNumber)
        .single();
      poolData = data;
    } catch {
      // table missing pre-migration — fine
    }

    const userWon = userId
      ? (winners ?? []).some((w) => w.user_id === userId)
      : false;

    return NextResponse.json({
      success: true,
      weekNumber,
      drawStatus: poolData?.draw_status ?? "pending",
      totalCorrectPredictors: poolData?.total_correct_predictors ?? 0,
      winners: (winners ?? []).map((w) => `@${w.username}`),
      userWon,
    });
  } catch (err) {
    console.error("[winners] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch winners" },
      { status: 500 }
    );
  }
}
