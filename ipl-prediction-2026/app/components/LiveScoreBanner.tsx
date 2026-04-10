"use client";

import { useEffect, useState } from "react";
import { getTeamConfig } from "@/app/lib/teams";

interface LiveScore {
  team: string;
  runs: number;
  wickets: number;
  overs: number;
}

interface LiveMatchData {
  cricId: string;
  team1: string;
  team2: string;
  status: string;
  score: Array<{ inning: string; r?: number; w?: number; o?: number }>;
  matchStarted: boolean;
  matchEnded: boolean;
}

interface Props {
  team1: string;
  team2: string;
}

export default function LiveScoreBanner({ team1, team2 }: Props) {
  const [liveData, setLiveData] = useState<LiveMatchData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchLive() {
      try {
        const res = await fetch(`/api/live-score?team1=${team1}&team2=${team2}`);
        if (!res.ok) { setError(true); return; }
        const data = await res.json();
        if (!cancelled) setLiveData(data.match ?? null);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    fetchLive();
    const interval = setInterval(fetchLive, 30_000); // refresh every 30s
    return () => { cancelled = true; clearInterval(interval); };
  }, [team1, team2]);

  if (error || !liveData || !liveData.matchStarted) return null;

  const cfg1 = getTeamConfig(team1);
  const cfg2 = getTeamConfig(team2);

  // Parse score innings — CricAPI puts batting team's inning last in score[]
  const innings: LiveScore[] = (liveData.score ?? []).map((s) => {
    const teamCode = Object.keys({ [team1]: 1, [team2]: 1 }).find((t) =>
      s.inning.toLowerCase().includes(t.toLowerCase())
    ) ?? s.inning.split(" ")[0].toUpperCase().slice(0, 3);
    return {
      team: teamCode,
      runs: s.r ?? 0,
      wickets: s.w ?? 0,
      overs: s.o ?? 0,
    };
  });

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(13,26,45,0.95))",
        border: "1px solid rgba(239,68,68,0.2)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="live-dot" />
        <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Live Now</span>
      </div>

      <div className="space-y-2">
        {innings.map((inn) => {
          const cfg = inn.team === team1 ? cfg1 : cfg2;
          return (
            <div key={inn.team} className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: cfg.color }}>
                {cfg.emoji} {inn.team}
              </span>
              <span className="font-display font-black text-white text-sm">
                {inn.runs}/{inn.wickets}
                <span className="text-gray-500 font-normal text-xs ml-1">({inn.overs} ov)</span>
              </span>
            </div>
          );
        })}
      </div>

      {liveData.status && (
        <p className="text-xs text-gray-400 mt-2 truncate">{liveData.status}</p>
      )}
    </div>
  );
}
