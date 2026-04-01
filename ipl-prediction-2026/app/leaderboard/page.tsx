import type { Metadata } from "next";
import { Suspense } from "react";
import LeaderboardContent from "./LeaderboardContent";

export const metadata: Metadata = {
  title: "IPL Prediction Leaderboard 2026 — Top Fan Predictors",
  description: "See who's leading the IPL 2026 prediction contest. Full rankings of all fans competing against the AI. Can you climb to #1?",
  alternates: { canonical: "https://iplprediction2026.in/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" /></div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
