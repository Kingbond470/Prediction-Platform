"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Match } from "@/lib/supabase";
import { TeamBadge } from "@/app/components/TeamBadge";
import { CountdownTimer } from "@/app/components/CountdownTimer";
import { Button } from "@/app/components/Button";
import { getTeamConfig } from "@/app/lib/teams";
import { getTeamPlayers } from "@/app/lib/players";
import { matchToSlug } from "@/lib/matchSlug";
import { supabaseBrowser } from "@/lib/supabase-browser";
import dynamic from "next/dynamic";
const LiveScoreBanner = dynamic(() => import("@/app/components/LiveScoreBanner"), { ssr: false });

// ── AI Probability Chart (Recharts) ───────────────────────────────────────────
import {
  BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList,
} from "recharts";

function AiOddsChart({ match, t1Pct, t2Pct }: {
  match: { team_1: string; team_2: string; team_1_probability: number; team_2_probability: number };
  t1Pct: number;
  t2Pct: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const t1 = getTeamConfig(match.team_1);
  const t2 = getTeamConfig(match.team_2);

  const data = [
    { label: match.team_1, ai: match.team_1_probability, fan: t1Pct, fill: t1.color },
    { label: match.team_2, ai: match.team_2_probability, fan: t2Pct, fill: t2.color },
  ];

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="font-display font-bold text-white text-base mb-1">📊 AI Odds vs Fan Votes</h2>
      <p className="text-gray-500 text-xs mb-4">See where the AI and fans agree — or disagree.</p>
      <div className="flex gap-4 text-[10px] text-gray-500 mb-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm bg-white/30" /> AI Probability
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm opacity-60" style={{ background: data[0].fill }} /> Fan Vote %
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <XAxis dataKey="label" tick={{ fill: "#9CA3AF", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Bar dataKey="ai" name="AI %" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} fillOpacity={0.9} />
            ))}
            <LabelList dataKey="ai" position="top" formatter={(v: number) => `${v}%`} style={{ fill: "#fff", fontSize: 11, fontWeight: 700 }} />
          </Bar>
          <Bar dataKey="fan" name="Fan %" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} fillOpacity={0.4} />
            ))}
            <LabelList dataKey="fan" position="top" formatter={(v: number) => `${v}%`} style={{ fill: "#9CA3AF", fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface Props {
  match: Match;
}

export default function PredictContent({ match }: Props) {
  const router = useRouter();
  const [linkCopied, setLinkCopied] = useState(false);
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

  // Live vote counts (seed + real)
  const [t1Count, setT1Count] = useState(match.initial_count_team_1);
  const [t2Count, setT2Count] = useState(match.initial_count_team_2);
  const [recentVotes, setRecentVotes] = useState(0);
  const [liveFlash, setLiveFlash] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const t1Ref = useRef(match.initial_count_team_1);
  const t2Ref = useRef(match.initial_count_team_2);

  const fetchCounts = () => {
    fetch(`/api/predictions/counts?match_id=${match.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.counts) {
          const newT1 = match.initial_count_team_1 + (d.counts.team_1 ?? 0);
          const newT2 = match.initial_count_team_2 + (d.counts.team_2 ?? 0);
          t1Ref.current = newT1;
          t2Ref.current = newT2;
          setT1Count(newT1);
          setT2Count(newT2);
          setRecentVotes(d.counts.recent_1h ?? 0);
        }
      })
      .catch(() => {/* keep seed counts */});
  };

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    if (!votingOpen) return;

    // Supabase Realtime broadcast — instant update when anyone votes
    const channel = supabaseBrowser
      .channel(`votes:${match.id}`)
      .on("broadcast", { event: "vote" }, (payload) => {
        const { team } = payload.payload as { team: string };
        if (team === match.team_1) {
          t1Ref.current += 1;
          setT1Count(t1Ref.current);
        } else if (team === match.team_2) {
          t2Ref.current += 1;
          setT2Count(t2Ref.current);
        }
        setRecentVotes((v) => v + 1);
        setLiveFlash(true);
        setTimeout(() => setLiveFlash(false), 1500);
      })
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    // Polling fallback every 20s — catches votes from home modal (no broadcast)
    const poll = setInterval(fetchCounts, 20_000);

    return () => {
      supabaseBrowser.removeChannel(channel);
      clearInterval(poll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, match.team_1, match.team_2, match.initial_count_team_1, match.initial_count_team_2, votingOpen]);

  const players1 = getTeamPlayers(match.team_1);
  const players2 = getTeamPlayers(match.team_2);

  function handlePredict() {
    const userId =
      typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      localStorage.setItem("selectedMatchId", match.id);
      localStorage.setItem("authRedirect", window.location.pathname);
      router.push("/signup");
      return;
    }
    localStorage.setItem("selectedMatchId", match.id);
    router.push("/");
  }

  const matchUrl = `https://iplprediction2026.in/predict/${matchToSlug(match)}`;
  const whatsappText = encodeURIComponent(
    `🏏 ${match.team_1} vs ${match.team_2} — IPL 2026 Match #${match.match_number}\n` +
    `AI gives ${favTeam} a ${favPct}% chance. Who do YOU think wins?\n` +
    `Predict & beat the AI 👉 ${matchUrl}`
  );
  const twitterText = encodeURIComponent(
    `🏏 ${match.team_1} vs ${match.team_2} — IPL 2026\n` +
    `AI gives ${favTeam} ${favPct}% chance. Can you beat it?\n` +
    `#IPL2026 #${match.team_1} #${match.team_2}`
  );

  const totalVotes = t1Count + t2Count;
  const t1Pct = totalVotes > 0 ? Math.round((t1Count / totalVotes) * 100) : 50;
  const t2Pct = 100 - t1Pct;

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

      {/* ── Live Score (only when match is in progress) ──────── */}
      {match.status === "live" && (
        <LiveScoreBanner team1={match.team_1} team2={match.team_2} />
      )}

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

      {/* ── Community Vote Bar ────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-white text-base">🌍 Fan Votes</h2>
            {votingOpen && realtimeConnected && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 uppercase tracking-widest">
                <span className="live-dot" />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {recentVotes > 0 && (
              <span className={`text-xs font-semibold transition-colors duration-300 ${liveFlash ? "text-green-300" : "text-green-500"}`}>
                +{recentVotes} this hour
              </span>
            )}
            <span className={`text-xs transition-all duration-300 ${liveFlash ? "text-white font-bold" : "text-gray-600"}`}>
              {totalVotes.toLocaleString("en-IN")} total
            </span>
          </div>
        </div>
        <div className="flex justify-between text-xs font-bold mb-1.5">
          <span style={{ color: team1.color }}>{match.team_1} {t1Pct}%</span>
          <span style={{ color: team2.color }}>{t2Pct}% {match.team_2}</span>
        </div>
        <div className="h-3 w-full rounded-full overflow-hidden bg-white/[0.06] flex">
          <div
            className="h-full rounded-l-full transition-all duration-700"
            style={{ width: `${t1Pct}%`, background: team1.color }}
          />
          <div
            className="h-full flex-1 rounded-r-full"
            style={{ background: team2.color }}
          />
        </div>
        {votingOpen && (
          <Button onClick={handlePredict} variant="ghost" className="w-full mt-4">
            Add Your Vote →
          </Button>
        )}
      </div>

      {/* ── AI Odds vs Fan Votes Chart ───────────────────────── */}
      <AiOddsChart match={match} t1Pct={t1Pct} t2Pct={t2Pct} />

      {/* ── Key Players to Watch ──────────────────────────────── */}
      {(players1 || players2) && (
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display font-bold text-white text-base mb-4">
            ⭐ Key Players to Watch
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { team: match.team_1, cfg: team1, players: players1 },
              { team: match.team_2, cfg: team2, players: players2 },
            ].map(({ team, cfg, players }) =>
              players ? (
                <div key={team}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: cfg.color }}>
                    {cfg.emoji} {team}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">🏏 Batters</p>
                      {players.bat.map((name) => (
                        <p key={name} className="text-xs text-gray-300 py-0.5">{name}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">🎯 Bowlers</p>
                      {players.bowl.map((name) => (
                        <p key={name} className="text-xs text-gray-300 py-0.5">{name}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* ── Match Preview blurb (indexed by Google) ──────────── */}
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display font-bold text-white text-base mb-2">
          {match.team_1} vs {match.team_2} — Match Preview
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          {match.team_1} take on {match.team_2} in IPL 2026 Match #{match.match_number} at{" "}
          {match.venue}, {match.city}.{" "}
          Our AI model gives <strong className="text-white">{favTeam}</strong> a{" "}
          <strong className="text-white">{favPct}%</strong> win probability, making{" "}
          <strong className="text-white">{underdogTeam}</strong> the underdog at {underdogPct}%.{" "}
          {underdogPct <= 40
            ? `If ${underdogTeam} pull off an upset, fans who picked them earn 1.5× points — a big leaderboard boost.`
            : "The teams look evenly matched — your cricket instincts could easily beat the AI here."}
        </p>
        {players1 && players2 && (
          <p className="text-gray-500 text-sm leading-relaxed mt-2">
            Eyes on {players1.bat[0]} and {players1.bowl[0]} for {match.team_1},{" "}
            while {players2.bat[0]} and {players2.bowl[0]} will be key for {match.team_2}.
          </p>
        )}
        <p className="text-gray-600 text-xs mt-3 leading-relaxed">
          Free IPL fan prediction — no money, no betting, pure cricket knowledge.
          {totalVotes > 0 && ` Over ${totalVotes.toLocaleString("en-IN")} fans have already voted.`}
        </p>
      </div>

      {/* ── Share Before the Match ────────────────────────────── */}
      {votingOpen && (
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display font-bold text-white text-base mb-1">
            📣 Challenge Your Friends
          </h2>
          <p className="text-gray-500 text-xs mb-4">
            Share this match, let them predict, then see who beats the AI.
          </p>
          <div className="flex gap-3">
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90"
              style={{ background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366" }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.123 1.527 5.856L0 24l6.334-1.507A11.96 11.96 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 0 1-5.039-1.378l-.361-.214-3.755.894.945-3.654-.235-.376A9.836 9.836 0 0 1 2.118 12C2.118 6.535 6.535 2.118 12 2.118c5.464 0 9.882 4.417 9.882 9.882 0 5.464-4.418 9.882-9.882 9.882z"/>
              </svg>
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${twitterText}&url=${encodeURIComponent(matchUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90"
              style={{ background: "rgba(29,161,242,0.12)", border: "1px solid rgba(29,161,242,0.25)", color: "#1DA1F2" }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X / Twitter
            </a>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(matchUrl).then(() => {
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                });
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 hover:bg-white/[0.08]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${linkCopied ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)"}`,
                color: linkCopied ? "#10B981" : "#9CA3AF",
              }}
              title="Copy link"
            >
              {linkCopied ? "Copied!" : "🔗"}
            </button>
          </div>
        </div>
      )}

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

      {/* ── Back link ─────────────────────────────────────────── */}
      <a href="/" className="block text-center text-sm text-gray-600 hover:text-gray-400 transition-colors py-2">
        ← All IPL 2026 Matches
      </a>
    </div>
  );
}
