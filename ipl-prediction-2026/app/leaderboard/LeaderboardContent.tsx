"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTeamConfig } from "@/app/lib/teams";

interface LeaderboardEntry {
  id: string;
  username: string;
  total_points: number;
  total_predictions: number;
  total_correct: number;
  win_percentage: number;
  rank: number;
}

export default function LeaderboardContent() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const userId   = typeof window !== "undefined" ? localStorage.getItem("userId")   : null;
  const username = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const favTeam  = typeof window !== "undefined" ? localStorage.getItem("favoriteTeam") : null;
  const teamCfg  = favTeam ? getTeamConfig(favTeam) : null;

  useEffect(() => {
    fetch(`/api/leaderboard${userId ? `?user_id=${userId}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        setLeaderboard(d.top_10 || []);
        setUserRank(d.user_rank || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        <p className="text-gray-500 text-sm">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5 animate-slide-up">

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center text-3xl mb-4"
          style={{
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            boxShadow: "0 0 32px rgba(245,158,11,0.4)",
          }}>
          🏆
        </div>
        <h1 className="font-display font-black text-3xl text-white">IPL 2026 Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-1">Top fans competing against the AI</p>
      </div>

      {/* User's own rank card — shown at top if ranked */}
      {userRank && (
        <div className="rounded-2xl p-4"
          style={{
            background: `linear-gradient(135deg, rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.15), rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.05))`,
            border: `1px solid rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.3)`,
          }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--tc,#EF4444)" }}>
            {teamCfg ? `${teamCfg.emoji} ` : ""}Your Standing
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-display font-black text-4xl text-white">#{userRank.rank}</span>
              <div>
                <p className="font-semibold text-white">{userRank.username}</p>
                <p className="text-xs text-gray-400">{userRank.total_predictions} predictions · {userRank.win_percentage}% accuracy</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display font-black text-3xl text-gradient">{userRank.total_points}</p>
              <p className="text-xs text-gray-500">points</p>
            </div>
          </div>
        </div>
      )}

      {/* Full rankings */}
      <div className="rounded-2xl glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-white">Full Rankings</h2>
          <span className="text-xs text-gray-500">{leaderboard.length} players ranked</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3 animate-float inline-block">🏆</div>
            <p className="text-white font-semibold mb-1">No rankings yet</p>
            <p className="text-gray-500 text-sm">Make your first prediction to appear here!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((user, idx) => {
              const isMe = user.username === username;
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3.5 rounded-xl transition-smooth border"
                  style={{
                    background: isMe
                      ? `linear-gradient(135deg, rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.1), rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.04))`
                      : "rgba(255,255,255,0.03)",
                    borderColor: isMe
                      ? `rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.3)`
                      : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-7 shrink-0 text-center ${medal ? "text-base" : "text-xs font-bold text-gray-500"}`}>
                      {medal ?? `#${idx + 1}`}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate"
                        style={isMe ? { color: "var(--tc,#EF4444)" } : { color: "white" }}>
                        {user.username}
                        {isMe && <span className="text-xs text-gray-500 ml-1">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.total_correct}/{user.total_predictions} correct · {user.win_percentage}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-black text-base text-white">
                      {user.total_points}
                      <span className="text-xs text-gray-500 ml-0.5">pts</span>
                    </p>
                    <p className="text-xs text-gray-600">{user.total_predictions} pred</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push("/")}
        className="w-full py-3 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20 transition-smooth text-sm font-semibold"
      >
        ← Back to Matches
      </button>
    </div>
  );
}
