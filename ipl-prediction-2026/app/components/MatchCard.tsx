"use client";

import { Match } from "@/lib/supabase";
import { Button } from "./Button";
import { TeamBadge } from "./TeamBadge";
import { CountdownTimer } from "./CountdownTimer";
import { getTeamConfig } from "@/app/lib/teams";

interface MatchCardProps {
  match: Match;
  onPredict: (match: Match) => void;
}

export function MatchCard({ match, onPredict }: MatchCardProps) {
  const votingOpen =
    match.status === "upcoming" && new Date() < new Date(match.match_date);

  const team1 = getTeamConfig(match.team_1);
  const team2 = getTeamConfig(match.team_2);

  const isHot =
    match.team_1_probability >= 40 && match.team_1_probability <= 60;

  const totalSeeded =
    match.initial_count_team_1 + match.initial_count_team_2;
  const t1Pct = ((match.initial_count_team_1 / totalSeeded) * 100).toFixed(0);
  const t2Pct = ((match.initial_count_team_2 / totalSeeded) * 100).toFixed(0);

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-5 transition-all duration-300 hover:-translate-y-1 group"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Top glow accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${team1.color}60, ${team2.color}60, transparent)`,
        }}
      />

      {/* Background gradient from both team colors */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 20% 50%, ${team1.color}08 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, ${team2.color}08 0%, transparent 60%)`,
        }}
      />

      <div className="relative p-5">
        {/* Header row */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">
              Match #{match.match_number}
            </span>
            {isHot && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400">
                🔥 HOT
              </span>
            )}
          </div>

          {votingOpen ? (
            <CountdownTimer targetDate={match.match_date} />
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-500/15 border border-gray-500/20 text-gray-500">
              ⏸ Voting Closed
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between mb-5">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-2 w-[38%]">
            <TeamBadge team={match.team_1} size="lg" showName />
            <div
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                background: `${team1.color}18`,
                color: team1.color,
                border: `1px solid ${team1.color}30`,
              }}
            >
              AI: {match.team_1_probability}%
            </div>
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full flex items-center justify-center glass">
              <span className="text-sm font-black text-gray-500">VS</span>
            </div>
            <span className="text-xs text-gray-600 font-medium">⚔️</span>
          </div>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-2 w-[38%]">
            <TeamBadge team={match.team_2} size="lg" showName />
            <div
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                background: `${team2.color}18`,
                color: team2.color,
                border: `1px solid ${team2.color}30`,
              }}
            >
              AI: {match.team_2_probability}%
            </div>
          </div>
        </div>

        {/* Community vote bar */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Community Pulse</span>
            <span className="text-xs text-gray-600">
              {(match.initial_count_team_1 + match.initial_count_team_2).toLocaleString("en-IN")} voted
            </span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden bg-white/[0.06] flex">
            <div
              className="h-full rounded-l-full transition-all duration-1000"
              style={{
                width: `${t1Pct}%`,
                background: `linear-gradient(90deg, ${team1.color}, ${team1.color}CC)`,
              }}
            />
            <div
              className="h-full flex-1 rounded-r-full"
              style={{
                background: `linear-gradient(90deg, ${team2.color}CC, ${team2.color})`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-bold" style={{ color: team1.color }}>
              {match.team_1} {t1Pct}%
            </span>
            <span className="text-xs font-bold" style={{ color: team2.color }}>
              {t2Pct}% {match.team_2}
            </span>
          </div>
        </div>

        {/* Venue & Date */}
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-0.5 text-xs text-gray-500 mb-4 px-1">
          <span className="truncate">📍 {match.venue}, {match.city}</span>
          <span className="shrink-0 text-gray-600">
            🗓 {new Date(match.match_date).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* CTA */}
        {votingOpen ? (
          <Button
            onClick={() => onPredict(match)}
            size="lg"
            className="w-full text-base tracking-wide font-bold"
          >
            🏏 BEAT THE AI
          </Button>
        ) : (
          <div className="text-center py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-gray-500 text-sm font-medium">Voting closed for this match</p>
          </div>
        )}
      </div>
    </div>
  );
}
