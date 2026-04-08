"use client";

import { useState } from "react";

interface WeeklyStats {
  predictions: number;
  correct: number;
  wrong: number;
  points: number;
  beat_ai: number;
  accuracy: number;
  week_start: string;
}

function weekLabel(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function WeeklyRecap({
  stats,
  username,
  isLastWeek = false,
}: {
  stats: WeeklyStats;
  username: string | null;
  isLastWeek?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const shareText =
    `🏏 My IPL 2026 week (${weekLabel(stats.week_start)}):\n` +
    `${stats.correct}W / ${stats.wrong}L · +${stats.points.toLocaleString("en-IN")} pts` +
    (stats.beat_ai > 0 ? ` · Beat AI ${stats.beat_ai}×` : "") +
    `\nCan you top that? → https://iplprediction2026.in`;

  const waLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  function copyLink() {
    navigator.clipboard?.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const statBlocks = [
    { label: "Correct",  value: stats.correct,  color: "#10B981", emoji: "✅" },
    { label: "Wrong",    value: stats.wrong,     color: "#EF4444", emoji: "❌" },
    { label: "Pts",      value: `+${stats.points.toLocaleString("en-IN")}`, color: "#F59E0B", emoji: "⭐" },
    { label: "Beat AI",  value: stats.beat_ai,   color: "#60A5FA", emoji: "🤖" },
  ];

  return (
    <div
      className="rounded-2xl p-4 mb-5"
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))",
        border: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
            📅 {isLastWeek ? "Last Week" : "This Week"}
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">{weekLabel(stats.week_start)}</p>
        </div>
        <div className="text-right">
          <p className="font-display font-black text-2xl text-white">
            {stats.correct}
            <span className="text-gray-500 font-normal text-base">/{stats.predictions}</span>
          </p>
          <p className="text-[10px] text-gray-500">{stats.accuracy}% accuracy</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {statBlocks.map(({ label, value, color, emoji }) => (
          <div
            key={label}
            className="rounded-xl py-2 text-center"
            style={{ background: `${color}12`, border: `1px solid ${color}25` }}
          >
            <p className="text-base leading-none">{emoji}</p>
            <p className="font-display font-black text-sm text-white mt-1">{value}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Accuracy bar */}
      {stats.predictions > 0 && (
        <div className="mb-3">
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${stats.accuracy}%`,
                background: stats.accuracy >= 60 ? "#10B981" : stats.accuracy >= 40 ? "#F59E0B" : "#EF4444",
              }}
            />
          </div>
        </div>
      )}

      {/* Motivational line */}
      <p className="text-xs text-gray-500 mb-3 text-center">
        {stats.accuracy >= 70
          ? `🔥 Outstanding week${username ? `, ${username}` : ""}! Keep it up.`
          : stats.accuracy >= 50
          ? `💪 Solid week! ${stats.wrong > 0 ? "A few more correct picks and you're flying." : "Perfect so far!"}`
          : stats.predictions < 3
          ? "More predictions = more points. Get in on today's matches! 🏏"
          : "Tough week — the AI had the edge. Make a comeback this week! 💪"}
      </p>

      {/* Share buttons */}
      <div className="flex gap-2">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:opacity-90"
          style={{
            background: "rgba(37,211,102,0.15)",
            border: "1px solid rgba(37,211,102,0.3)",
            color: "#25D366",
          }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.123 1.527 5.856L0 24l6.334-1.507A11.96 11.96 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 0 1-5.039-1.378l-.361-.214-3.755.894.945-3.654-.235-.376A9.836 9.836 0 0 1 2.118 12C2.118 6.535 6.535 2.118 12 2.118c5.464 0 9.882 4.417 9.882 9.882 0 5.464-4.418 9.882-9.882 9.882z"/>
          </svg>
          Share on WhatsApp
        </a>
        <button
          onClick={copyLink}
          className="px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200"
          style={{
            background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
            color: copied ? "#10B981" : "#9CA3AF",
          }}
        >
          {copied ? "✓ Copied" : "🔗 Copy"}
        </button>
      </div>
    </div>
  );
}
