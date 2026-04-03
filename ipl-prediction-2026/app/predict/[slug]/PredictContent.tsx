"use client";

import { useRouter } from "next/navigation";
import { Match } from "@/lib/supabase";
import { TeamBadge } from "@/app/components/TeamBadge";
import { CountdownTimer } from "@/app/components/CountdownTimer";
import { Button } from "@/app/components/Button";
import { getTeamConfig } from "@/app/lib/teams";
interface Props {
  match: Match;
}

export default function PredictContent({ match }: Props) {
  const router = useRouter();
  const team1 = getTeamConfig(match.team_1);
  const team2 = getTeamConfig(match.team_2);
  const votingOpen =
    match.status === "upcoming" && new Date() < new Date(match.match_date);
  const isCompleted = match.status === "completed";

  const favTeam =
    match.team_1_probability >= match.team_2_probability
      ? match.team_1
      : match.team_2;
  const favPct = Math.max(match.team_1_probability, match.team_2_probability);
  const underdogTeam =
    match.team_1_probability < match.team_2_probability
      ? match.team_1
      : match.team_2;
  const underdogPct = Math.min(match.team_1_probability, match.team_2_probability);

  function handlePredict() {
    const userId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      localStorage.setItem("selectedMatchId", match.id);
      router.push("/signup");
      return;
    }
    // HomeClient picks up selectedMatchId and opens the prediction modal
    localStorage.setItem("selectedMatchId", match.id);
    router.push("/");
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5 animate-slide-up">

      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <nav className="text-xs text-gray-600 flex items-center gap-1.5">
        <a href="/" className="hover:text-gray-400 transition-colors">Home</a>
        <span>/</span>
        <span className="text-gray-500">
          {match.team_1} vs {match.team_2} Prediction
        </span>
      </nav>

      {/* ── Match Hero ────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden p-6"
        style={{
          background: `linear-gradient(135deg, ${team1.color}12, rgba(13,26,45,0.95) 50%, ${team2.color}12)`,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, ${team1.color}60, transparent, ${team2.color}60)`,
          }}
        />

        <div className="text-center mb-5">
          <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">
            IPL 2026 · Match #{match.match_number}
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white mt-1">
            {match.team_1}{" "}
            <span className="text-gray-500 font-normal text-2xl">vs</span>{" "}
            {match.team_2}
          </h1>
          <p className="text-gray-500 text-sm mt-1.5">
            📍 {match.venue}, {match.city} ·{" "}
            {new Date(match.match_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          {votingOpen && (
            <div className="mt-3 inline-flex items-center gap-2">
              <span className="text-xs text-gray-500">Match in</span>
              <CountdownTimer targetDate={match.match_date} />
            </div>
          )}
        </div>

        {/* Teams side by side */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div
            className="p-4 rounded-xl text-center"
            style={{ background: `${team1.color}10`, border: `1px solid ${team1.color}25` }}
          >
            <TeamBadge team={match.team_1} size="lg" />
            <p className="font-display font-black text-2xl text-white mt-2">{match.team_1}</p>
            <p className="text-xs mt-1 font-semibold" style={{ color: team1.color }}>
              AI: {match.team_1_probability}% win
            </p>
          </div>
          <div
            className="p-4 rounded-xl text-center"
            style={{ background: `${team2.color}10`, border: `1px solid ${team2.color}25` }}
          >
            <TeamBadge team={match.team_2} size="lg" />
            <p className="font-display font-black text-2xl text-white mt-2">{match.team_2}</p>
            <p className="text-xs mt-1 font-semibold" style={{ color: team2.color }}>
              AI: {match.team_2_probability}% win
            </p>
          </div>
        </div>

        {/* AI insight strip */}
        <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center mb-5">
          <p className="text-gray-400 text-sm">
            🤖 AI model gives{" "}
            <span className="font-bold" style={{ color: getTeamConfig(favTeam).color }}>
              {favTeam}
            </span>{" "}
            a <span className="text-white font-bold">{favPct}% chance</span> of winning.
            {underdogPct <= 40 && (
              <span className="text-amber-400">
                {" "}Pick {underdogTeam} and get 1.5× points if they win!
              </span>
            )}
          </p>
        </div>

        {/* CTA */}
        {isCompleted ? (
          <Button
            onClick={() => router.push(`/results?match_id=${match.id}`)}
            className="w-full"
            size="lg"
          >
            📊 See Match Result
          </Button>
        ) : votingOpen ? (
          <Button onClick={handlePredict} className="w-full" size="lg">
            🏏 Make Your Prediction — Beat the AI
          </Button>
        ) : (
          <div className="text-center py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-gray-500 text-sm">Voting closed for this match</p>
          </div>
        )}
      </div>

      {/* ── How It Works ──────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h2 className="font-display font-bold text-white text-base">
          How to Beat the AI — {match.team_1} vs {match.team_2}
        </h2>
        <div className="space-y-2">
          {[
            { icon: "1️⃣", text: `Pick ${match.team_1} or ${match.team_2} as your winner` },
            { icon: "2️⃣", text: "AI makes its own prediction based on win probability" },
            { icon: "3️⃣", text: "After the match, correct predictors earn 1,000–1,500 points" },
            { icon: "4️⃣", text: "Beat the AI = +500 bonus points and bragging rights" },
          ].map((step) => (
            <div key={step.icon} className="flex items-center gap-3 text-sm text-gray-400">
              <span className="text-base flex-shrink-0">{step.icon}</span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 pt-1">
          Free fan prediction contest — no money, no betting, pure cricket knowledge.
        </p>
      </div>

      {/* ── Match Preview blurb (indexed by Google) ──────────── */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-bold text-white text-base mb-2">
          {match.team_1} vs {match.team_2} — Match Preview
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          {match.team_1} take on {match.team_2} in IPL 2026 Match #{match.match_number} at{" "}
          {match.venue}, {match.city}.{" "}
          Bookmaker odds give <strong className="text-white">{favTeam}</strong> a{" "}
          <strong className="text-white">{favPct}%</strong> win probability, making{" "}
          <strong className="text-white">{underdogTeam}</strong> the underdog at {underdogPct}%.{" "}
          {underdogPct <= 40
            ? `Picking ${underdogTeam} and winning earns you 1.5× points — a great chance to climb the leaderboard fast.`
            : "This looks like a close contest — your cricket instincts could easily beat the AI here."}
        </p>
        <p className="text-gray-600 text-xs mt-2 leading-relaxed">
          Free IPL fan prediction — no money, no betting, pure cricket knowledge.
          Over {(match.initial_count_team_1 + match.initial_count_team_2).toLocaleString("en-IN")} fans have already voted on this match.
        </p>
      </div>

      {/* ── Community Vote Snapshot ───────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-bold text-white text-base mb-3">
          🌍 Who Do Fans Think Will Win?
        </h2>
        {(() => {
          const total = match.initial_count_team_1 + match.initial_count_team_2;
          const t1Pct = ((match.initial_count_team_1 / total) * 100).toFixed(0);
          const t2Pct = ((match.initial_count_team_2 / total) * 100).toFixed(0);
          return (
            <>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span style={{ color: team1.color }}>{match.team_1} {t1Pct}%</span>
                <span style={{ color: team2.color }}>{t2Pct}% {match.team_2}</span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden bg-white/[0.06] flex">
                <div
                  className="h-full rounded-l-full"
                  style={{ width: `${t1Pct}%`, background: team1.color }}
                />
                <div
                  className="h-full flex-1 rounded-r-full"
                  style={{ background: team2.color }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {total.toLocaleString("en-IN")} fans have voted
              </p>
            </>
          );
        })()}
        <Button onClick={handlePredict} variant="ghost" className="w-full mt-4">
          Add Your Prediction →
        </Button>
      </div>

      {/* ── Back link ─────────────────────────────────────────── */}
      <a href="/" className="block text-center text-sm text-gray-600 hover:text-gray-400 transition-colors py-2">
        ← All IPL 2026 Matches
      </a>
    </div>
  );
}
