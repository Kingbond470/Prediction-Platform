"use client";

import { useEffect, useState } from "react";
import { getCurrentWeekNumber, isWinnerAnnouncementWindow } from "@/lib/weekUtils";

interface WinnersData {
  weekNumber: number;
  drawStatus: string;
  totalCorrectPredictors: number;
  winners: string[];
  userWon: boolean;
}

interface Props {
  userId: string | null;
  onSeeWinners?: () => void;
}

export default function WeeklyWinnersBanner({ userId, onSeeWinners }: Props) {
  const [data, setData] = useState<WinnersData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only show Mon–Wed and when there's a completed draw to show
    if (!isWinnerAnnouncementWindow()) {
      setLoading(false);
      return;
    }

    const currentWeek = getCurrentWeekNumber();
    if (!currentWeek || currentWeek <= 1) {
      setLoading(false);
      return;
    }

    const lastWeek = currentWeek - 1;
    const url = userId
      ? `/api/winners?week=${lastWeek}&user_id=${userId}`
      : `/api/winners?week=${lastWeek}`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.drawStatus === "completed") setData(d);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || !data) return null;

  const count = data.totalCorrectPredictors.toLocaleString("en-IN");
  const nextWeek = data.weekNumber + 1;

  return (
    <div
      className="glass-strong rounded-2xl p-4 border mb-4"
      style={{ borderColor: "rgba(245, 158, 11, 0.3)", background: "rgba(245,158,11,0.05)" }}
    >
      {data.userWon ? (
        // User won — celebrate!
        <div className="text-center">
          <div className="text-3xl mb-1">🏆</div>
          <p className="font-bold text-amber-400 text-base">
            You won Week {data.weekNumber}!
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            Check your DMs for your ₹100 voucher code.
          </p>
        </div>
      ) : (
        // General announcement
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-400 text-sm leading-tight">
              Week {data.weekNumber} Winners Announced!
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              10 fans from {count} correct predictors won vouchers
            </p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {onSeeWinners && (
              <button
                onClick={onSeeWinners}
                className="text-xs text-amber-400 border border-amber-500/30 rounded-lg px-2.5 py-1 hover:bg-amber-500/10 transition-colors whitespace-nowrap"
              >
                See Winners
              </button>
            )}
            <a
              href="/"
              className="text-xs text-center text-gray-400 border border-white/10 rounded-lg px-2.5 py-1 hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              Week {nextWeek} Draw →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
