"use client";

import { useEffect, useState } from "react";
import { getCurrentWeekNumber, weekLabel } from "@/lib/weekUtils";

interface WeekWinners {
  weekNumber: number;
  totalCorrectPredictors: number;
  winners: string[];
}

interface Props {
  onClose: () => void;
}

export default function PastWinners({ onClose }: Props) {
  const [weeks, setWeeks] = useState<WeekWinners[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentWeek = getCurrentWeekNumber() ?? 1;
    // Fetch all completed weeks in parallel
    const weekNumbers = Array.from(
      { length: Math.max(currentWeek - 1, 0) },
      (_, i) => i + 1
    );

    if (weekNumbers.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(
      weekNumbers.map((w) =>
        fetch(`/api/winners?week=${w}`)
          .then((r) => r.json())
          .then((d) =>
            d.success && d.drawStatus === "completed"
              ? ({
                  weekNumber: w,
                  totalCorrectPredictors: d.totalCorrectPredictors,
                  winners: d.winners,
                } as WeekWinners)
              : null
          )
          .catch(() => null)
      )
    ).then((results) => {
      setWeeks(results.filter(Boolean).reverse() as WeekWinners[]);
      setLoading(false);
    });
  }, []);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="glass-strong w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-lg">
            🏆 Weekly Winners Archive
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-sm px-2 py-1"
          >
            Close
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shimmer-bg rounded-xl h-24" />
            ))}
          </div>
        )}

        {!loading && weeks.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">
            No completed draws yet. Check back after the first Sunday!
          </p>
        )}

        {!loading &&
          weeks.map((week) => (
            <div
              key={week.weekNumber}
              className="glass rounded-xl p-4 mb-3 border border-white/8"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-amber-400 text-sm">
                  {weekLabel(week.weekNumber)}
                </span>
                <span className="text-gray-500 text-xs">
                  {week.totalCorrectPredictors.toLocaleString("en-IN")} in pool
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {week.winners.map((username) => (
                  <span
                    key={username}
                    className="text-xs text-gray-300 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5"
                  >
                    {username}
                  </span>
                ))}
              </div>
            </div>
          ))}

        <p className="text-center text-gray-600 text-xs mt-4 pb-1">
          Weekly voucher rewards — not a lottery or prize competition.
        </p>
      </div>
    </div>
  );
}
