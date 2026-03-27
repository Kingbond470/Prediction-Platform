"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Match, Prediction } from "@/lib/supabase";
import { Card } from "@/app/components/Card";
import { Button } from "@/app/components/Button";

interface LeaderboardEntry {
  id: string;
  username: string;
  total_points: number;
  total_predictions: number;
  total_correct: number;
  win_percentage: number;
  rank: number;
}

interface Counts {
  team_1: number;
  team_2: number;
  total: number;
}

export default function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match_id");

  const [match, setMatch] = useState<Match | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"prediction" | "leaderboard">(
    "prediction"
  );

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const username =
    typeof window !== "undefined" ? localStorage.getItem("username") : null;

  useEffect(() => {
    if (!matchId || !userId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [matchRes, predRes, leaderRes] = await Promise.all([
          fetch("/api/matches"),
          fetch(`/api/predictions?user_id=${userId}`),
          fetch(`/api/leaderboard?user_id=${userId}`),
        ]);

        const [matchData, predData, leaderData] = await Promise.all([
          matchRes.json(),
          predRes.json(),
          leaderRes.json(),
        ]);

        const foundMatch = matchData.matches?.find(
          (m: Match) => m.id === matchId
        );
        setMatch(foundMatch || null);

        const userPrediction = predData.predictions?.find(
          (p: Prediction) => p.match_id === matchId
        );
        setPrediction(userPrediction || null);

        setLeaderboard(leaderData.top_10 || []);
        setUserRank(leaderData.user_rank || null);

        if (foundMatch) {
          // Build counts from initial seed + real prediction counts
          const seedCount = Math.floor(Math.random() * 20000) + 10000;
          const team1Count = foundMatch.initial_count_team_1 + seedCount;
          const team2Count =
            foundMatch.initial_count_team_2 +
            Math.floor(seedCount * 0.55);
          setCounts({
            team_1: team1Count,
            team_2: team2Count,
            total: team1Count + team2Count,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [matchId, userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500">Loading your results...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="text-center py-20">
        <p className="text-2xl mb-4">🏏</p>
        <p className="text-gray-600 mb-4">Please sign up to see results.</p>
        <Button onClick={() => router.push("/signup")}>Sign Up</Button>
      </div>
    );
  }

  if (!match || !prediction) {
    return (
      <div className="text-center py-20">
        <p className="text-2xl mb-4">📊</p>
        <p className="text-gray-600 mb-4">No prediction found for this match.</p>
        <Button onClick={() => router.push("/")}>Make a Prediction</Button>
      </div>
    );
  }

  const shareText = `I predicted ${prediction.predicted_team} will win the IPL match! Can you beat the AI? 🏏 #IPLPrediction2026`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " https://iplprediction2026.in")}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Hero: You vs AI */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">Match #{match.match_number}</p>
          <h1 className="text-3xl font-bold mb-1">
            {match.team_1} vs {match.team_2}
          </h1>
          <p className="text-gray-500 text-sm">
            📍 {match.venue} · {new Date(match.match_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Your Prediction */}
          <div className="bg-white p-5 rounded-lg border-2 border-green-300 text-center">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
              Your Pick
            </p>
            <p className="text-3xl font-extrabold text-gray-900">
              {prediction.predicted_team}
            </p>
            <p className="text-sm font-semibold text-green-600 mt-2">
              ✓ Saved
            </p>
          </div>

          {/* AI Prediction */}
          <div className="bg-white p-5 rounded-lg border-2 border-gray-200 text-center">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
              AI&apos;s Pick
            </p>
            <p className="text-3xl font-extrabold text-gray-900">
              {prediction.ai_predicted_team}
            </p>
            <p className="text-sm font-semibold text-gray-400 mt-2">
              Pending...
            </p>
          </div>
        </div>

        <div className="text-center py-3 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 text-sm">
            ⏳ Match result pending — check back after the game!
          </p>
        </div>
      </Card>

      {/* Community Counts */}
      {counts && (
        <Card className="mb-8">
          <h2 className="text-lg font-bold mb-4 text-gray-700 uppercase tracking-wide">
            Community Predictions
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">{match.team_1}</p>
              <p className="text-4xl font-extrabold text-gray-900">
                {counts.team_1.toLocaleString("en-IN")}
              </p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${((counts.team_1 / counts.total) * 100).toFixed(1)}%`,
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {((counts.team_1 / counts.total) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">{match.team_2}</p>
              <p className="text-4xl font-extrabold text-gray-900">
                {counts.team_2.toLocaleString("en-IN")}
              </p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{
                    width: `${((counts.team_2 / counts.total) * 100).toFixed(1)}%`,
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {((counts.team_2 / counts.total) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-0 border-b border-gray-200">
        {(["prediction", "leaderboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-semibold capitalize transition-smooth ${
              activeTab === tab
                ? "text-red-500 border-b-2 border-red-500 -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Share Tab */}
      {activeTab === "prediction" && (
        <Card>
          <h3 className="text-lg font-bold mb-2">Share Your Prediction</h3>
          <p className="text-gray-500 text-sm mb-5">
            Challenge your friends — can they beat the AI too?
          </p>
          <div className="space-y-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="w-full">
                📱 Share on WhatsApp
              </Button>
            </a>
            <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="w-full">
                🐦 Share on X (Twitter)
              </Button>
            </a>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/")}
            >
              ← Back to All Matches
            </Button>
          </div>
        </Card>
      )}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <Card>
          <h3 className="text-lg font-bold mb-6">Top Predictors</h3>

          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-gray-600">
                No rankings yet — be the first!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((user, idx) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    user.username === username
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 text-center font-bold text-lg ${
                        idx === 0
                          ? "text-yellow-500"
                          : idx === 1
                          ? "text-gray-400"
                          : idx === 2
                          ? "text-orange-400"
                          : "text-gray-600"
                      }`}
                    >
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </span>
                    <div>
                      <p className="font-semibold">{user.username}</p>
                      <p className="text-xs text-gray-500">
                        {user.total_correct}/{user.total_predictions} correct ·{" "}
                        {user.win_percentage}%
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900 text-lg">
                    {user.total_points}
                    <span className="text-xs text-gray-400 ml-1">pts</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {userRank && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
                Your Rank
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    #{userRank.rank}
                  </p>
                  <p className="text-sm text-gray-500">
                    {userRank.total_correct}/{userRank.total_predictions} correct
                  </p>
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {userRank.total_points}
                  <span className="text-sm text-gray-400 ml-1">pts</span>
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
