import type { Metadata } from "next";
import { Suspense } from "react";
import LeaderboardContent from "./LeaderboardContent";

export const metadata: Metadata = {
  title: "IPL Prediction Leaderboard 2026 — Top Fan Predictors",
  description: "See who's leading the IPL 2026 prediction contest. Full rankings of all fans competing against the AI. Can you climb to #1?",
  keywords: [
    "IPL prediction leaderboard 2026", "IPL fan prediction ranking",
    "cricket prediction contest leaderboard", "top IPL predictors",
    "beat the AI cricket leaderboard", "IPL 2026 fan competition",
  ],
  alternates: { canonical: "https://iplprediction2026.in/leaderboard" },
  openGraph: {
    title: "IPL Prediction Leaderboard 2026 — Top Fan Predictors",
    description: "See who's leading the IPL 2026 prediction contest. Full rankings of all fans competing against the AI. Can you climb to #1?",
    url: "https://iplprediction2026.in/leaderboard",
    siteName: "IPL Prediction 2026",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "IPL Prediction 2026 Leaderboard" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IPL Prediction Leaderboard 2026 — Top Fan Predictors",
    description: "See who's leading the IPL 2026 fan prediction contest. Join free and climb the rankings.",
    images: ["/og-image.png"],
  },
};

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" /></div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
