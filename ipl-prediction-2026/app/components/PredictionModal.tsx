"use client";

import { useState, useEffect } from "react";
import { Match } from "@/lib/supabase";
import { Button } from "./Button";
import { TeamBadge } from "./TeamBadge";
import { getTeamConfig } from "@/app/lib/teams";
import { computeHybridProb } from "@/lib/mlPredictions";

interface PredictionModalProps {
  isOpen: boolean;
  match: Match | null;
  onClose: () => void;
  onVote: (team: string) => Promise<void>;
}

export function PredictionModal({ isOpen, match, onClose, onVote }: PredictionModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTeam(null);
      setError(null);
      // Lock body scroll on mobile
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !match) return null;

  const team1 = getTeamConfig(match.team_1);
  const team2 = getTeamConfig(match.team_2);
  const selectedConfig = selectedTeam ? getTeamConfig(selectedTeam) : null;

  // ── AI Analysis data ──────────────────────────────────────────────────────
  // Primary signal: bookmaker consensus odds from The Odds API (stored on each match)
  const oddsProb1 = match.team_1_probability / 100;
  // Secondary signal: fan vote distribution from seeded initial counts
  const totalSeeded = match.initial_count_team_1 + match.initial_count_team_2;
  const crowdPct1 = totalSeeded > 0 ? match.initial_count_team_1 / totalSeeded : 0.5;
  const crowdPct2 = 1 - crowdPct1;
  // Hybrid: 60% bookmaker odds + 40% fan votes
  const hybridProb1 = computeHybridProb(oddsProb1, crowdPct1);
  const aiPick = hybridProb1 >= 0.5 ? match.team_1 : match.team_2;
  const aiPickConfig = getTeamConfig(aiPick);
  // Confidence derived from how far apart the bookmaker odds are
  const oddsGap = Math.abs(match.team_1_probability - match.team_2_probability);
  const confidenceTier = oddsGap >= 30 ? "high" : oddsGap >= 12 ? "medium" : "low";
  const confidenceLabel = confidenceTier === "high" ? "🎯 Clear Favourite" : confidenceTier === "medium" ? "📊 Likely" : "⚖️ Toss-up";

  const handleVote = async () => {
    if (!selectedTeam) return;
    setLoading(true);
    setError(null);
    try {
      await onVote(selectedTeam);
      setSelectedTeam(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          opacity: visible ? 1 : 0,
        }}
        onClick={onClose}
      />

      {/* Modal — uses .modal-container CSS class for responsive positioning */}
      <div
        className={`modal-container no-scrollbar ${visible ? "modal-visible" : "modal-hidden"}`}
        style={{
          background: "#0D1A2D",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          boxShadow: selectedConfig
            ? `0 -8px 60px rgba(0,0,0,0.7), 0 0 50px ${selectedConfig.color}18`
            : "0 -8px 60px rgba(0,0,0,0.7)",
          transition: "box-shadow 0.4s ease",
          // Mobile: only round top corners; desktop overrides via CSS
          borderRadius: "24px 24px 0 0",
        }}
      >
        {/* Drag handle (mobile only visual cue) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div
          className="px-5 py-4 flex justify-between items-start border-b border-white/[0.07]"
          style={{
            background: selectedConfig
              ? `linear-gradient(135deg, ${selectedConfig.color}12, transparent)`
              : "rgba(255,255,255,0.02)",
            transition: "background 0.4s ease",
          }}
        >
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
              Make Your Call
            </p>
            <h2 className="text-lg sm:text-xl font-display font-bold text-white mt-0.5 truncate">
              {match.team_1}{" "}
              <span className="text-gray-500 font-normal">vs</span>{" "}
              {match.team_2}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.16] transition-smooth shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-6">
          <p className="text-sm text-gray-400 text-center mb-3">
            Who wins? 🤔 Pick a side — then{" "}
            <span className="text-white font-semibold">outsmart the AI</span>
          </p>
          <div className="flex justify-center gap-3 mb-5 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-semibold">✓ Correct +1,000 pts</span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">🏆 Underdog +1,500 pts</span>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">🤖 Beat AI +500</span>
          </div>

          {/* Team Selection */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[match.team_1, match.team_2].map((team) => {
              const cfg = getTeamConfig(team);
              const isSelected = selectedTeam === team;
              return (
                <button
                  key={team}
                  onClick={() => { setSelectedTeam(team); setError(null); }}
                  className="relative p-4 rounded-xl overflow-hidden text-center active:scale-95 transition-all duration-200"
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}0A)`
                      : "rgba(255,255,255,0.04)",
                    border: isSelected
                      ? `2px solid ${cfg.color}80`
                      : "2px solid rgba(255,255,255,0.07)",
                    boxShadow: isSelected
                      ? `0 0 28px ${cfg.color}28, inset 0 1px 0 ${cfg.color}18`
                      : "none",
                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  {/* Checkmark */}
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: cfg.color, color: "#000" }}
                    >
                      ✓
                    </div>
                  )}

                  <div className="flex justify-center mb-2.5">
                    <TeamBadge team={team} size="md" />
                  </div>

                  <div
                    className="font-display font-black text-xl leading-none"
                    style={{ color: isSelected ? cfg.color : "#F9FAFB" }}
                  >
                    {team}
                  </div>

                  <div
                    className="text-xs mt-1.5"
                    style={{
                      color: isSelected
                        ? `${cfg.color}CC`
                        : "rgba(156,163,175,0.8)",
                    }}
                  >
                    AI:{" "}
                    {team === match.team_1
                      ? match.team_1_probability
                      : match.team_2_probability}
                    %
                  </div>

                  {/* Probability bar */}
                  <div className="mt-2.5 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${
                          team === match.team_1
                            ? match.team_1_probability
                            : match.team_2_probability
                        }%`,
                        background: cfg.color,
                        opacity: isSelected ? 1 : 0.35,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* AI Analysis */}
          <div className="mb-5 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/[0.05]">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">🤖 How the AI Decides</p>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: confidenceTier === "high" ? "rgba(16,185,129,0.12)" : confidenceTier === "medium" ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)",
                  color: confidenceTier === "high" ? "#10B981" : confidenceTier === "medium" ? "#F59E0B" : "#818CF8",
                  border: `1px solid ${confidenceTier === "high" ? "rgba(16,185,129,0.25)" : confidenceTier === "medium" ? "rgba(245,158,11,0.25)" : "rgba(99,102,241,0.25)"}`,
                }}
              >
                {confidenceLabel}
              </span>
            </div>

            <div className="px-4 py-3 space-y-2.5">
              {/* Bookmaker Odds bar (60% weight) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">📊 Bookmaker Odds <span className="text-gray-600">(60%)</span></span>
                  <span className="font-semibold" style={{ color: oddsProb1 >= 0.5 ? team1.color : team2.color }}>
                    {oddsProb1 >= 0.5 ? match.team_1 : match.team_2} {Math.max(match.team_1_probability, match.team_2_probability)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/[0.06] flex">
                  <div className="h-full rounded-l-full" style={{ width: `${oddsProb1 * 100}%`, background: team1.color, opacity: 0.85 }} />
                  <div className="h-full flex-1 rounded-r-full" style={{ background: team2.color, opacity: 0.85 }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] font-medium" style={{ color: team1.color }}>{match.team_1} {match.team_1_probability}%</span>
                  <span className="text-[10px] font-medium" style={{ color: team2.color }}>{match.team_2_probability}% {match.team_2}</span>
                </div>
              </div>

              {/* Community bar (40%) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">👥 Fan Predictions <span className="text-gray-600">(40%)</span></span>
                  <span className="font-semibold" style={{ color: crowdPct1 >= 0.5 ? team1.color : team2.color }}>
                    {crowdPct1 >= 0.5 ? match.team_1 : match.team_2} {Math.round(Math.max(crowdPct1, crowdPct2) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/[0.06] flex">
                  <div className="h-full rounded-l-full" style={{ width: `${crowdPct1 * 100}%`, background: team1.color, opacity: 0.85 }} />
                  <div className="h-full flex-1 rounded-r-full" style={{ background: team2.color, opacity: 0.85 }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] font-medium" style={{ color: team1.color }}>{match.team_1} {Math.round(crowdPct1 * 100)}%</span>
                  <span className="text-[10px] font-medium" style={{ color: team2.color }}>{Math.round(crowdPct2 * 100)}% {match.team_2}</span>
                </div>
              </div>

              {/* AI pick result */}
              <div className="flex items-center justify-between pt-1 mt-1 border-t border-white/[0.05]">
                <span className="text-xs text-gray-500">AI will pick</span>
                <span className="text-sm font-bold" style={{ color: aiPickConfig.color }}>
                  🤖 {aiPick} ({Math.round(Math.max(hybridProb1, 1 - hybridProb1) * 100)}% confidence)
                </span>
              </div>
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm mb-4">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Match info pill */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5 text-xs text-gray-500">
            <span className="truncate">📍 {match.venue}, {match.city}</span>
            <span className="shrink-0">
              {new Date(match.match_date).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 min-h-[48px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVote}
              disabled={!selectedTeam}
              loading={loading}
              size="lg"
              className="flex-[2] font-display font-bold tracking-wide min-h-[52px]"
              style={
                selectedConfig
                  ? ({
                      background: `linear-gradient(135deg, ${selectedConfig.color}, ${selectedConfig.color}CC)`,
                      color: "#000",
                      boxShadow: `0 4px 20px ${selectedConfig.color}40`,
                    } as React.CSSProperties)
                  : {}
              }
            >
              {loading
                ? "Locking in..."
                : selectedTeam
                ? `🏏 PREDICT ${selectedTeam}`
                : "Pick a Team"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
