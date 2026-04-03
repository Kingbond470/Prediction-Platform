"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Match, Prediction } from "@/lib/supabase";
import { Button } from "@/app/components/Button";
import { TeamBadge } from "@/app/components/TeamBadge";
import { getTeamConfig } from "@/app/lib/teams";
import WeeklyWinnersBanner from "@/app/components/WeeklyWinnersBanner";
import WeeklyPoolBanner from "@/app/components/WeeklyPoolBanner";
import PastWinners from "@/app/components/PastWinners";

interface LeaderboardEntry {
  id: string;
  username: string;
  total_points: number;
  total_predictions: number;
  total_correct: number;
  win_percentage: number;
  rank: number;
}

interface Counts {
  team_1: number;
  team_2: number;
  total: number;
}

export default function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match_id");

  const [match, setMatch] = useState<Match | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"prediction" | "leaderboard">("prediction");
  const [barsVisible, setBarsVisible] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);
  const [showPastWinners, setShowPastWinners] = useState(false);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const username = typeof window !== "undefined" ? localStorage.getItem("username") : null;

  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const [matchRes, predRes, leaderRes] = await Promise.all([
          fetch("/api/matches"),
          fetch(`/api/predictions?user_id=${userId}`),
          fetch(`/api/leaderboard?user_id=${userId}`),
        ]);
        const [matchData, predData, leaderData] = await Promise.all([
          matchRes.json(), predRes.json(), leaderRes.json(),
        ]);

        const matches: Match[] = matchData.matches || [];
        setAllMatches(matches);
        const preds: Prediction[] = predData.predictions || [];
        setAllPredictions(preds);

        if (matchId) {
          const foundMatch = matches.find((m) => m.id === matchId);
          setMatch(foundMatch || null);
          const userPrediction = preds.find((p) => p.match_id === matchId);
          setPrediction(userPrediction || null);
          if (foundMatch) {
            // Fetch real community vote counts
            try {
              const countsRes = await fetch(`/api/predictions/counts?match_id=${matchId}`);
              const countsData = await countsRes.json();
              if (countsData.counts) {
                const t1 = foundMatch.initial_count_team_1 + (countsData.counts.team_1 || 0);
                const t2 = foundMatch.initial_count_team_2 + (countsData.counts.team_2 || 0);
                setCounts({ team_1: t1, team_2: t2, total: t1 + t2 });
              }
            } catch {
              // Fallback to seed counts if API unavailable
              const t1 = foundMatch.initial_count_team_1;
              const t2 = foundMatch.initial_count_team_2;
              setCounts({ team_1: t1, team_2: t2, total: t1 + t2 });
            }
          }
        }

        setLeaderboard(leaderData.top_10 || []);
        setUserRank(leaderData.user_rank || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [matchId, userId]);

  // Trigger bar animation when counts section scrolls into view
  useEffect(() => {
    if (!barsRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setBarsVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(barsRef.current);
    return () => obs.disconnect();
  }, [counts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        <p className="text-gray-500 text-sm">Loading your prediction...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="text-center py-24">
        <div className="text-6xl mb-4 animate-float inline-block">🏏</div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Join The Action</h2>
        <p className="text-gray-400 mb-6">Sign up to make predictions and see results.</p>
        <Button onClick={() => router.push("/signup")}>Create Account →</Button>
      </div>
    );
  }

  // No specific match in URL — show full prediction history + leaderboard
  if (!matchId || !match || !prediction) {
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-5 animate-slide-up">
        <WeeklyWinnersBanner userId={userId!} onSeeWinners={() => setShowPastWinners(true)} />

        <div className="text-center mb-2">
          <h1 className="font-display font-black text-3xl text-white">My Predictions</h1>
          <p className="text-gray-500 text-sm mt-1">Your full prediction history for IPL 2026</p>
        </div>

        {allPredictions.length === 0 ? (
          <div className="rounded-2xl glass p-10 text-center">
            <div className="text-5xl mb-3">🏏</div>
            <p className="text-white font-semibold mb-1">No predictions yet</p>
            <p className="text-gray-500 text-sm mb-5">Pick a match and beat the AI!</p>
            <Button onClick={() => router.push("/")}>Browse Matches →</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {allPredictions.map((pred) => {
              const m = allMatches.find((x) => x.id === pred.match_id);
              if (!m) return null;
              const myTeam = getTeamConfig(pred.predicted_team);
              const aiTeam = getTeamConfig(pred.ai_predicted_team || "");
              const isCorrect = pred.is_correct;
              const isPending = isCorrect === null || isCorrect === undefined;
              return (
                <div
                  key={pred.id}
                  className="rounded-2xl glass p-4 cursor-pointer hover:border-white/[0.12] transition-smooth border border-white/[0.06]"
                  onClick={() => router.push(`/results?match_id=${m.id}&predicted=${encodeURIComponent(pred.predicted_team)}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Match #{m.match_number}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPending ? "bg-yellow-500/15 text-yellow-400" : isCorrect ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {isPending ? "⏳ Pending" : isCorrect ? "✅ Correct" : "❌ Wrong"}
                    </span>
                  </div>
                  <p className="font-display font-bold text-white text-base">{m.team_1} vs {m.team_2}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span style={{ color: myTeam.color }}>You: <strong>{pred.predicted_team}</strong></span>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-400">AI: <strong style={{ color: aiTeam.color }}>{pred.ai_predicted_team || "—"}</strong></span>
                    {pred.points_earned ? <span className="ml-auto text-amber-400 font-bold">+{pred.points_earned}pts</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard */}
        <div className="rounded-2xl glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white text-lg">🏆 Leaderboard</h3>
            <button onClick={() => router.push("/leaderboard")} className="text-xs text-gray-400 hover:text-white transition-smooth">See full →</button>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No rankings yet — be the first!</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((user, idx) => {
                const isMe = user.username === username;
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                return (
                  <div key={user.id} className={`flex items-center justify-between p-3 rounded-xl ${isMe ? "border" : "border border-white/[0.04]"}`}
                    style={{ background: isMe ? `rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.08)` : "rgba(255,255,255,0.03)", ...(isMe ? { borderColor: `rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.3)` } : {}) }}>
                    <div className="flex items-center gap-2">
                      <span className={`w-6 text-center text-sm ${!medal ? "text-gray-500 font-bold text-xs" : ""}`}>{medal ?? `#${idx + 1}`}</span>
                      <p className="font-semibold text-sm" style={isMe ? { color: "var(--tc,#EF4444)" } : { color: "white" }}>
                        {user.username}{isMe && <span className="text-xs text-gray-500 ml-1">(you)</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-black text-sm text-white">{user.total_points}<span className="text-xs text-gray-500 ml-0.5">pts</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showPastWinners && <PastWinners onClose={() => setShowPastWinners(false)} />}
      </div>
    );
  }

  const team1Cfg = getTeamConfig(match.team_1);
  const team2Cfg = getTeamConfig(match.team_2);
  const myTeamCfg = getTeamConfig(prediction.predicted_team);
  const aiTeamCfg = getTeamConfig(prediction.ai_predicted_team || "");

  const isPending  = prediction.is_correct === null || prediction.is_correct === undefined;
  const isCorrect  = prediction.is_correct === true;
  const isWrong    = prediction.is_correct === false;
  // Same pick = Draw regardless of who won; different picks → winner is whoever was correct
  const samePick   = prediction.ai_predicted_team === prediction.predicted_team;
  const isDraw     = !isPending && samePick;
  const humanWins  = !isPending && !samePick && isCorrect;
  const aiWins     = !isPending && !samePick && isWrong;

  const shareText = humanWins
    ? `I outsmarted the AI! I backed ${prediction.predicted_team} and they won! 🤖🏏 Can you beat the AI? #IPLPrediction2026`
    : isDraw
    ? `I matched the AI's pick — we both called ${prediction.predicted_team}! 🤝🏏 Can you beat the AI? #IPLPrediction2026`
    : `I predicted ${prediction.predicted_team} in the IPL match — try to beat the AI! 🏏 #IPLPrediction2026`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " https://iplprediction2026.in")}`;
  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  const t1Pct = counts ? (counts.team_1 / counts.total) * 100 : 0;
  const t2Pct = counts ? (counts.team_2 / counts.total) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5 animate-slide-up">

      {/* ── Weekly Winners Banner (Mon–Wed only) ──────────────── */}
      <WeeklyWinnersBanner
        userId={userId}
        onSeeWinners={() => setShowPastWinners(true)}
      />

      {/* ── Back to history ──────────────────────────────────── */}
      <button
        onClick={() => router.push("/results")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-smooth mb-1 -mt-1"
      >
        ← My Predictions
      </button>

      {/* ── Result banner ─────────────────────────────────────── */}
      {humanWins && (
        <div
          className="rounded-2xl p-5 text-center animate-slide-up"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(16,185,129,0.12))",
            border: "1px solid rgba(245,158,11,0.35)",
            boxShadow: "0 0 60px rgba(245,158,11,0.15)",
          }}
        >
          <div className="text-4xl mb-2">🏆🤖</div>
          <h2 className="font-display font-black text-2xl text-white mb-1">You Beat the AI!</h2>
          <p className="text-gray-300 text-sm mb-3 max-w-xs mx-auto">
            You backed {prediction.predicted_team} while the AI picked {prediction.ai_predicted_team}. Brilliant call!
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {prediction.points_earned != null && (
              <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-display font-black text-lg">
                +{prediction.points_earned.toLocaleString("en-IN")} pts
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-sm">
              🤖 Beat AI +500
            </span>
          </div>
        </div>
      )}
      {isDraw && (
        <div
          className="rounded-2xl p-4 text-center animate-slide-up"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}
        >
          <p className="text-3xl mb-1">🤝</p>
          <p className="font-display font-black text-white text-lg">
            {isCorrect ? "Great Minds Think Alike!" : "Draw — Same Pick"}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {isCorrect
              ? `You and the AI both called ${prediction.predicted_team}. You each score!`
              : `Both you and the AI picked ${prediction.predicted_team}. Tough one.`}
          </p>
          {prediction.points_earned != null && isCorrect && (
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-sm">
              +{prediction.points_earned.toLocaleString("en-IN")} pts
            </span>
          )}
        </div>
      )}
      {aiWins && (
        <div
          className="rounded-2xl p-4 text-center"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
        >
          <p className="text-2xl mb-1">🤖</p>
          <p className="font-semibold text-white text-sm">AI Wins This Round</p>
          <p className="text-gray-500 text-xs mt-1">
            You picked {prediction.predicted_team}, AI picked {prediction.ai_predicted_team} — and the AI was right.
          </p>
        </div>
      )}

      {/* ── Match Header ──────────────────────────────────────── */}
      <div className="text-center mb-2">
        <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">
          Match #{match.match_number}
        </span>
        <h1 className="font-display font-black text-3xl text-white mt-1">
          {match.team_1} <span className="text-gray-500 font-normal">vs</span> {match.team_2}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          📍 {match.venue} · {new Date(match.match_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
        </p>
      </div>

      {/* ── You vs AI Card ────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden p-5"
        style={{
          background: `linear-gradient(135deg, ${myTeamCfg.color}12, rgba(13,26,45,0.9) 50%, ${aiTeamCfg.color}12)`,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Glow top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, ${myTeamCfg.color}60, transparent, ${aiTeamCfg.color}60)`,
          }}
        />

        {/* Status badge */}
        <div className="text-center mb-5">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide"
            style={
              isPending
                ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }
                : humanWins
                ? { background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#F59E0B" }
                : isDraw
                ? { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)", color: "#818CF8" }
                : { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" }
            }
          >
            {isPending
              ? "✅ Your IPL Prediction vs AI — Locked In"
              : humanWins
              ? "🏆 You Beat the AI!"
              : isDraw
              ? "🤝 Draw — Same Pick"
              : "🤖 AI Wins This Round"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Your pick */}
          <div
            className="p-3 sm:p-4 rounded-xl text-center"
            style={{
              background: `${myTeamCfg.color}10`,
              border: `1px solid ${myTeamCfg.color}30`,
            }}
          >
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 sm:mb-3" style={{ color: myTeamCfg.color }}>
              Your Pick
            </p>
            <div className="flex justify-center mb-2">
              <TeamBadge team={prediction.predicted_team} size="md" />
            </div>
            <p className="font-display font-black text-xl sm:text-2xl text-white">{prediction.predicted_team}</p>
            <p className="text-xs text-green-400 font-semibold mt-1.5">✓ Saved</p>
          </div>

          {/* AI pick */}
          <div
            className="p-3 sm:p-4 rounded-xl text-center"
            style={{
              background: `${aiTeamCfg.color}08`,
              border: `1px solid ${aiTeamCfg.color}20`,
            }}
          >
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 sm:mb-3 text-gray-500">
              AI&apos;s Pick
            </p>
            <div className="flex justify-center mb-2">
              <TeamBadge team={prediction.ai_predicted_team || match.team_1} size="md" />
            </div>
            <p className="font-display font-black text-xl sm:text-2xl text-white">
              {prediction.ai_predicted_team || "—"}
            </p>
            <p
              className="text-xs mt-1.5 font-semibold"
              style={{ color: isPending ? "#6B7280" : aiWins ? "#10B981" : isDraw ? "#F59E0B" : "#EF4444" }}
            >
              {isPending ? "Pending result..." : aiWins ? "✓ AI Won" : isDraw ? "🤝 Draw" : "✗ AI Lost"}
            </p>
          </div>
        </div>

        {/* Result / pending footer */}
        {isPending ? (
          <div className="mt-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.1] text-center">
            <p className="text-gray-400 text-sm">
              ⏳ Match result pending — <span className="text-white font-semibold">check back after the game!</span>
            </p>
          </div>
        ) : (
          <div
            className="mt-4 px-4 py-3 rounded-xl text-center"
            style={{
              background: humanWins ? "rgba(16,185,129,0.05)" : isDraw ? "rgba(99,102,241,0.05)" : "rgba(239,68,68,0.05)",
              border: `1px solid ${humanWins ? "rgba(16,185,129,0.18)" : isDraw ? "rgba(99,102,241,0.18)" : "rgba(239,68,68,0.14)"}`,
            }}
          >
            <p className="text-sm" style={{ color: humanWins ? "#10B981" : isDraw ? "#818CF8" : "#9CA3AF" }}>
              {humanWins
                ? "🤖 You picked differently from the AI — and you were right!"
                : isDraw
                ? `🎯 You and the AI both called ${prediction.predicted_team}${isCorrect ? " — and you were both right!" : " — and were both wrong."}`
                : `The winner was ${match.winner} — better luck next match!`}
            </p>
          </div>
        )}
      </div>

      {/* ── Weekly Draw Pool Banner ───────────────────────────── */}
      <WeeklyPoolBanner userId={userId} matchId={matchId ?? undefined} />

      {/* ── Community Pulse ──────────────────────────────────── */}
      {counts && (
        <div
          ref={barsRef}
          className="rounded-2xl glass p-5"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-white">🌍 Community Pulse</h2>
            <span className="text-xs text-gray-500 font-medium">
              {counts.total.toLocaleString("en-IN")} voted
            </span>
          </div>

          {/* Team 1 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <TeamBadge team={match.team_1} size="sm" />
                <span className="font-bold text-white">{match.team_1}</span>
              </div>
              <div className="text-right">
                <span className="font-display font-black text-xl" style={{ color: team1Cfg.color }}>
                  {t1Pct.toFixed(1)}%
                </span>
                <p className="text-xs text-gray-500">{counts.team_1.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <div className="h-3 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: barsVisible ? `${t1Pct}%` : "0%",
                  background: `linear-gradient(90deg, ${team1Cfg.color}, ${team1Cfg.color}AA)`,
                  transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>
          </div>

          {/* Team 2 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <TeamBadge team={match.team_2} size="sm" />
                <span className="font-bold text-white">{match.team_2}</span>
              </div>
              <div className="text-right">
                <span className="font-display font-black text-xl" style={{ color: team2Cfg.color }}>
                  {t2Pct.toFixed(1)}%
                </span>
                <p className="text-xs text-gray-500">{counts.team_2.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <div className="h-3 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: barsVisible ? `${t2Pct}%` : "0%",
                  background: `linear-gradient(90deg, ${team2Cfg.color}, ${team2Cfg.color}AA)`,
                  transition: "width 1.4s cubic-bezier(0.16,1,0.3,1) 0.1s",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl glass">
        {(["prediction", "leaderboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold capitalize transition-smooth ${
              activeTab === tab
                ? "bg-red-500 text-white shadow-glow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === "prediction" ? "🔗 Share" : "🏆 Leaderboard"}
          </button>
        ))}
      </div>

      {/* ── Share Tab ────────────────────────────────────────── */}
      {activeTab === "prediction" && (
        <div className="rounded-2xl glass p-5 space-y-4">
          <div>
            <h3 className="font-display font-bold text-white text-lg mb-1">
              {humanWins
                ? "Show Off Your Win 🤖🏆"
                : isDraw
                ? "You Both Called It 🤝"
                : "Challenge Your Friends 📣"}
            </h3>
            <p className="text-gray-400 text-sm">
              {humanWins
                ? "Brag a little — you earned it. Dare your friends to beat the AI too."
                : isDraw
                ? "Great minds think alike! Share and see if your friends can beat the AI."
                : "Share your prediction and challenge friends to do better."}
            </p>
          </div>

          {/* Share preview card */}
          <div
            className="p-4 rounded-xl text-center"
            style={{
              background: `linear-gradient(135deg, ${myTeamCfg.color}15, rgba(255,255,255,0.03))`,
              border: `1px solid ${myTeamCfg.color}25`,
            }}
          >
            <p className="text-xs text-gray-500 mb-1">My IPL 2026 Prediction</p>
            <p className="font-display font-black text-2xl" style={{ color: myTeamCfg.color }}>
              {prediction.predicted_team} 🏆
            </p>
            <p className="text-xs text-gray-500 mt-1">{match.team_1} vs {match.team_2}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <button className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-smooth hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 4px 20px rgba(37,211,102,0.3)" }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp
              </button>
            </a>
            <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
              <button className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-smooth hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #1DA1F2, #0d8fd9)", boxShadow: "0 4px 20px rgba(29,161,242,0.3)" }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.857L1.5 2.25H8.06l4.259 5.629L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                Twitter / X
              </button>
            </a>
          </div>

          <Button variant="ghost" className="w-full" onClick={() => router.push("/")}>
            ← Back to All Matches
          </Button>
        </div>
      )}

      {/* ── Leaderboard Tab ──────────────────────────────────── */}
      {activeTab === "leaderboard" && (
        <div className="rounded-2xl glass p-5">
          <h3 className="font-display font-bold text-white text-lg mb-5">🏆 IPL Prediction Leaderboard</h3>

          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-3 animate-float inline-block">🏆</div>
              <p className="text-white font-semibold mb-1">No rankings yet</p>
              <p className="text-gray-500 text-sm">Be the first to score points!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((user, idx) => {
                const isMe = user.username === username;
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl transition-smooth ${
                      isMe ? "border border-white/[0.12]" : "border border-white/[0.04]"
                    }`}
                    style={{
                      background: isMe
                        ? `linear-gradient(135deg, rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.1), rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.04))`
                        : "rgba(255,255,255,0.03)",
                      ...(isMe ? { borderColor: `rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.3)` } : {}),
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-7 shrink-0 text-center text-base ${!medal ? "text-gray-500 font-bold text-xs" : ""}`}>
                        {medal ?? `#${idx + 1}`}
                      </span>
                      <div className="min-w-0">
                        <p className={`font-semibold truncate text-sm ${isMe ? "" : "text-white"}`}
                           style={isMe ? { color: "var(--tc, #EF4444)" } : {}}>
                          {user.username} {isMe && <span className="text-xs text-gray-500">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.total_correct}/{user.total_predictions} · {user.win_percentage}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-black text-base text-white">
                        {user.total_points}
                        <span className="text-xs text-gray-500 ml-0.5">pts</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {userRank && (
            <div
              className="mt-4 p-4 rounded-xl"
              style={{
                background: `linear-gradient(135deg, rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.12), rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.04))`,
                border: `1px solid rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.25)`,
              }}
            >
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Your Standing</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-black text-4xl text-white">#{userRank.rank}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {userRank.total_correct}/{userRank.total_predictions} correct
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-black text-4xl text-gradient">{userRank.total_points}</p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Past Winners Modal ────────────────────────────────── */}
      {showPastWinners && (
        <PastWinners onClose={() => setShowPastWinners(false)} />
      )}
    </div>
  );
}
