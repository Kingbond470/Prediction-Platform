import type { Metadata } from "next";
import { Suspense } from "react";
import ResultsContent from "./ResultsContent";

export const metadata: Metadata = {
  title: "IPL Match Prediction with AI — Beat AI Cricket Prediction | IPL 2026",
  description: "See your IPL match prediction vs the AI. Did you beat AI cricket prediction? Check results, IPL prediction leaderboard, and community votes for every IPL 2026 match.",
  keywords: [
    "IPL match prediction with AI", "beat AI cricket prediction",
    "IPL prediction leaderboard", "IPL 2026 match results",
    "cricket AI prediction", "IPL prediction results",
  ],
  openGraph: {
    title: "IPL Match Prediction with AI — Did You Beat the AI?",
    description: "Compare your IPL prediction against AI. See community votes, leaderboard rankings, and match results for IPL 2026.",
    url: "https://iplprediction2026.in/results",
  },
  alternates: { canonical: "https://iplprediction2026.in/results" },
  // noindex: query-string based (?match_id=...), user-specific content, not a useful crawl target
  robots: { index: false, follow: true },
};

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
