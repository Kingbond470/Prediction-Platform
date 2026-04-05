"use client";

import { BadgeState } from "@/app/lib/badges";

interface Props {
  badges: BadgeState[];
  compact?: boolean;
}

export default function BadgeRow({ badges, compact = false }: Props) {
  const unlocked = badges.filter((b) => b.unlocked);
  const locked   = badges.filter((b) => !b.unlocked);
  // Show up to 3 unlocked + fill remaining slots with locked (max 6 total)
  const visible  = [...unlocked, ...locked].slice(0, 6);

  if (unlocked.length === 0 && compact) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {visible.map((badge) =>
        badge.unlocked ? (
          <span
            key={badge.id}
            title={badge.description}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
            style={{
              background: `${badge.color}20`,
              border: `1px solid ${badge.color}40`,
              color: badge.color,
            }}
          >
            {badge.emoji} {badge.label}
          </span>
        ) : (
          <span
            key={badge.id}
            title={`Locked: ${badge.description}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap opacity-30"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#6B7280",
            }}
          >
            🔒 {badge.label}
          </span>
        )
      )}
    </div>
  );
}
