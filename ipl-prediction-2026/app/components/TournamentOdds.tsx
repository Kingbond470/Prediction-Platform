"use client";

import { useEffect, useState, useRef } from "react";
import { TeamBadge } from "./TeamBadge";
import { getTeamConfig } from "@/app/lib/teams";

interface OutrightTeam {
  team: string;
  teamFullName: string;
  probability: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function TournamentOdds() {
  const [teams, setTeams] = useState<OutrightTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [barsVisible, setBarsVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/outrights")
      .then((r) => r.json())
      .then((d) => { if (d.teams) setTeams(d.teams); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!containerRef.current || teams.length === 0) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setBarsVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [teams]);

  if (loading) {
    return (
      <div className="rounded-2xl glass p-5 mb-8 animate-pulse">
        <div className="h-5 w-48 bg-white/[0.06] rounded mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
            <div className="flex-1 h-3 bg-white/[0.06] rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (teams.length === 0) return null;

  const maxProb = teams[0].probability;
  const visibleTeams = expanded ? teams : teams.slice(0, 5);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden mb-8"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}
    >
      {/* Top accent line — gold gradient for the trophy section */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, #F59E0B80, #D97706AA, transparent)" }}
      />

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl">🏆</span>
              <h2 className="font-display font-black text-white text-lg">IPL 2026 Champion Odds</h2>
            </div>
            <p className="text-xs text-gray-500 ml-8">Bookmaker consensus · Updated live</p>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.25)",
              color: "#F59E0B",
            }}
          >
            LIVE ODDS
          </span>
        </div>

        {/* Top 3 podium — special treatment */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {teams.slice(0, 3).map((t, idx) => {
            const cfg = getTeamConfig(t.team);
            return (
              <div
                key={t.team}
                className="relative rounded-xl p-3 text-center"
                style={{
                  background: `linear-gradient(135deg, ${cfg.color}12, ${cfg.color}05)`,
                  border: `1px solid ${cfg.color}${idx === 0 ? "35" : "20"}`,
                  boxShadow: idx === 0 ? `0 4px 20px ${cfg.color}20` : undefined,
                }}
              >
                {idx === 0 && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${cfg.color}10, transparent 70%)` }}
                  />
                )}
                <div className="text-lg mb-1">{MEDALS[idx]}</div>
                <div className="flex justify-center mb-1.5">
                  <TeamBadge team={t.team} size="sm" />
                </div>
                <p className="font-display font-black text-sm text-white">{t.team}</p>
                <p
                  className="font-display font-black text-xl mt-1"
                  style={{ color: cfg.color }}
                >
                  {t.probability}%
                </p>
              </div>
            );
          })}
        </div>

        {/* Remaining teams as bars */}
        <div className="space-y-2.5">
          {visibleTeams.slice(3).map((t, idx) => {
            const cfg = getTeamConfig(t.team);
            const barWidth = maxProb > 0 ? (t.probability / maxProb) * 100 : 0;
            return (
              <div key={t.team} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 font-bold w-4 text-center">{idx + 4}</span>
                <TeamBadge team={t.team} size="xs" />
                <span className="text-sm font-semibold text-gray-300 w-10 shrink-0">{t.team}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: barsVisible ? `${barWidth}%` : "0%",
                      background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}99)`,
                      transition: `width 1s cubic-bezier(0.16,1,0.3,1) ${idx * 0.06}s`,
                    }}
                  />
                </div>
                <span
                  className="text-xs font-bold w-8 text-right shrink-0"
                  style={{ color: cfg.color }}
                >
                  {t.probability}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Expand/collapse */}
        {teams.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 w-full text-xs text-gray-500 hover:text-gray-300 transition-smooth flex items-center justify-center gap-1"
          >
            <span>{expanded ? "Show less" : `Show all ${teams.length} teams`}</span>
            <span className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>⌄</span>
          </button>
        )}

        {/* Footer note */}
        <p className="text-xs text-gray-600 text-center mt-3">
          Based on aggregated bookmaker odds · Not a betting platform
        </p>
      </div>
    </div>
  );
}
