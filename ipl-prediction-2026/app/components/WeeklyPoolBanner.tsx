"use client";

import { useEffect, useState } from "react";

interface PoolData {
  weekNumber: number | null;
  totalCorrectPredictors: number;
  userIsEligible: boolean;
  drawStatus: "pending" | "in_progress" | "completed";
}

interface Props {
  userId: string | null;
  matchId?: string;
}

export default function WeeklyPoolBanner({ userId, matchId }: Props) {
  const [pool, setPool] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetch(`/api/weekly-pool?user_id=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPool(data);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return null;
  if (!pool || pool.weekNumber === null) return null;
  // Don't show during/after the draw — WinnersBanner takes over
  if (pool.drawStatus === "completed") return null;

  const count = pool.totalCorrectPredictors.toLocaleString("en-IN");

  if (pool.userIsEligible) {
    return (
      <div className="glass rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎟️</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-emerald-400 text-sm">
              You&apos;re in this week&apos;s draw!
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {count} fans in the pool · Draw happens Sunday 11PM IST
            </p>
          </div>
          <button
            onClick={() => {
              const text = `I'm in this week's IPL prediction draw! ${count} fans in the pool. Join now 👇 https://iplprediction2026.in`;
              if (navigator.share) {
                navigator.share({ text });
              } else {
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(text)}`,
                  "_blank"
                );
              }
            }}
            className="flex-shrink-0 text-xs text-emerald-400 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 hover:bg-emerald-500/10 transition-colors"
          >
            Share 📤
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min((pool.totalCorrectPredictors / 50000) * 100, 100)}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-500">{count} in pool</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 border border-white/8">
      <div className="flex items-start gap-3">
        <span className="text-2xl">😔</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-300 text-sm">
            Not in this week&apos;s draw
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            Predict tomorrow&apos;s match correctly to enter next week&apos;s
            pool!
          </p>
        </div>
      </div>
    </div>
  );
}
