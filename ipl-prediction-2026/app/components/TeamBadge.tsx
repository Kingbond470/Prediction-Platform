"use client";

import { getTeamConfig } from "@/app/lib/teams";

interface TeamBadgeProps {
  team: string;
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  className?: string;
}

const SIZES = {
  sm:  { outer: "w-10 h-10 text-lg",  text: "text-xs mt-1" },
  md:  { outer: "w-14 h-14 text-2xl", text: "text-xs mt-1.5" },
  lg:  { outer: "w-20 h-20 text-3xl", text: "text-sm mt-2 font-bold" },
  xl:  { outer: "w-28 h-28 text-5xl", text: "text-base mt-2 font-bold" },
};

export function TeamBadge({ team, size = "md", showName = false, className = "" }: TeamBadgeProps) {
  const config = getTeamConfig(team);
  const sz = SIZES[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`${sz.outer} rounded-2xl flex items-center justify-center relative overflow-hidden transition-smooth`}
        style={{
          background: config.gradient,
          border: `1.5px solid ${config.color}30`,
          boxShadow: `0 0 20px ${config.color}15`,
        }}
      >
        {/* Subtle shine */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        <span className="relative z-10">{config.emoji}</span>
      </div>
      {showName && (
        <div className={`${sz.text} font-semibold tracking-wide`} style={{ color: config.color }}>
          {team}
        </div>
      )}
    </div>
  );
}
