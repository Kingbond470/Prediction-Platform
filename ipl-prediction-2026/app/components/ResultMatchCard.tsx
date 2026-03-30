"use client";

import { useEffect, useState } from "react";
import { Match } from "@/lib/supabase";
import { TeamBadge } from "./TeamBadge";
import { getTeamConfig } from "@/app/lib/teams";

interface ResultMatchCardProps {
  match: Match;
  userId: string | null;
}

interface MatchCounts {
  team_1: number;
  team_2: number;
  total: number;
}

export function ResultMatchCard({ match, userId }: ResultMatchCardProps) {
  const [counts, setCounts] = useState<MatchCounts | null>(null);
  const [userPrediction, setUserPrediction] = useState<string | null>(null);

  const team1 = getTeamConfig(match.team_1);
  const team2 = getTeamConfig(match.team_2);
  const winnerTeam = match.winner ? getTeamConfig(match.winner) : null;

  useEffect(() => {
    // Fetch prediction counts for this match
    fetch(`/api/predictions/counts?match_id=${match.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.counts) setCounts(d.counts); })
      .catch(() => {});

    // Check user's own prediction
    if (userId) {
      fetch(`/api/predictions?user_id=${userId}`)
        .then((r) => r.json())
        .then((d) => {
          const pred = d.predictions?.find((p: { match_id: string; predicted_team: string }) => p.match_id === match.id);
          if (pred) setUserPrediction(pred.predicted_team);
        })
        .catch(() => {});
    }
  }, [match.id, userId]);

  const totalVotes = counts
    ? counts.total
    : match.initial_count_team_1 + match.initial_count_team_2;

  const t1Count = counts
    ? match.initial_count_team_1 + counts.team_1
    : match.initial_count_team_1;
  const t2Count = counts
    ? match.initial_count_team_2 + counts.team_2
    : match.initial_count_team_2;
  const total = t1Count + t2Count;
  const t1Pct = total > 0 ? Math.round((t1Count / total) * 100) : 50;
  const t2Pct = 100 - t1Pct;

  const humanWinner = t1Pct >= 50 ? match.team_1 : match.team_2;
  const humanWon = humanWinner === match.winner;

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: winnerTeam
            ? `linear-gradient(90deg, transparent, ${winnerTeam.color}80, transparent)`
            : "rgba(255,255,255,0.1)",
        }}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">
            Match #{match.match_number}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/25 text-green-400">
            ✅ Completed
          </span>
        </div>

        {/* Teams + Winner */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex flex-col items-center gap-2 w-[38%] ${match.winner === match.team_1 ? "opacity-100" : "opacity-40"}`}>
            <TeamBadge team={match.team_1} size="lg" showName />
            {match.winner === match.team_1 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400">🏆 Winner</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full flex items-center justify-center glass">
              <span className="text-sm font-black text-gray-500">VS</span>
            </div>
          </div>

          <div className={`flex flex-col items-center gap-2 w-[38%] ${match.winner === match.team_2 ? "opacity-100" : "opacity-40"}`}>
            <TeamBadge team={match.team_2} size="lg" showName />
            {match.winner === match.team_2 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400">🏆 Winner</span>
            )}
          </div>
        </div>

        {/* Human vs AI result */}
        <div
          className="rounded-xl p-3 mb-4 flex items-center justify-between gap-3"
          style={{
            background: humanWon ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${humanWon ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}
        >
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-0.5">Crowd Picked</p>
            <p className="text-sm font-bold text-white">{humanWinner}</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-black ${humanWon ? "text-green-400" : "text-red-400"}`}>
              {humanWon ? "🧠 Humans Win!" : "🤖 AI Wins"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-0.5">AI Predicted</p>
            <p className="text-sm font-bold text-white">
              {match.team_1_probability >= match.team_2_probability ? match.team_1 : match.team_2}
            </p>
          </div>
        </div>

        {/* Community vote bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Community Pulse</span>
            <span className="text-xs text-gray-600">{totalVotes.toLocaleString("en-IN")} voted</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden bg-white/[0.06] flex">
            <div
              className="h-full rounded-l-full"
              style={{ width: `${t1Pct}%`, background: `linear-gradient(90deg, ${team1.color}, ${team1.color}CC)` }}
            />
            <div
              className="h-full flex-1 rounded-r-full"
              style={{ background: `linear-gradient(90deg, ${team2.color}CC, ${team2.color})` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-bold" style={{ color: team1.color }}>{match.team_1} {t1Pct}%</span>
            <span className="text-xs font-bold" style={{ color: team2.color }}>{t2Pct}% {match.team_2}</span>
          </div>
        </div>

        {/* User's own prediction */}
        {userPrediction && (
          <div className={`text-center py-2 px-3 rounded-lg text-xs font-semibold ${
            userPrediction === match.winner
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-gray-500/10 border border-gray-500/20 text-gray-500"
          }`}>
            {userPrediction === match.winner
              ? `🎯 You picked ${userPrediction} — Correct! +${userPrediction !== (match.team_1_probability >= match.team_2_probability ? match.team_1 : match.team_2) ? "1,500" : "1,000"} pts`
              : `You picked ${userPrediction} — Better luck next time`}
          </div>
        )}
      </div>
    </div>
  );
}
