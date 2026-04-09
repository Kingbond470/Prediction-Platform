import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase, Match } from "@/lib/supabase";
import { TEAM_CONFIG, getTeamConfig } from "@/app/lib/teams";
import { getTeamPlayers } from "@/app/lib/players";
import { matchToSlug } from "@/lib/matchSlug";

// All valid team slugs (lowercase)
const TEAM_SLUGS = Object.keys(TEAM_CONFIG).map((t) => t.toLowerCase());

function slugToTeam(slug: string): string {
  return slug.toUpperCase();
}

async function getTeamMatches(team: string): Promise<Match[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    const { data } = await supabase
      .from("matches")
      .select("*")
      .or(`team_1.eq.${team},team_2.eq.${team}`)
      .order("match_number", { ascending: true })
      .limit(74);
    return (data as Match[]) ?? [];
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  return TEAM_SLUGS.map((team) => ({ team }));
}

export async function generateMetadata({
  params,
}: {
  params: { team: string };
}): Promise<Metadata> {
  const teamKey = slugToTeam(params.team);
  if (!TEAM_CONFIG[teamKey]) return { title: "Team Not Found | IPL Prediction 2026" };

  const cfg = getTeamConfig(teamKey);
  const title = `${teamKey} IPL 2026 Predictions — Who Will Win ${cfg.short} Matches?`;
  const description =
    `Free ${teamKey} IPL 2026 match predictions. See AI win probabilities for every ` +
    `${teamKey} game, community votes, and predict match winners before the toss. ` +
    `Beat the AI and climb the leaderboard. No money, pure cricket instincts.`;

  return {
    title,
    description,
    keywords: [
      `${teamKey} IPL 2026 prediction`,
      `${teamKey} match prediction today`,
      `who will win ${teamKey} match`,
      `${teamKey} IPL 2026 schedule`,
      `${teamKey} win probability 2026`,
      `${cfg.short} IPL predictions`,
      `beat AI cricket prediction`,
      `IPL 2026 ${teamKey} match winner`,
    ],
    openGraph: {
      title,
      description,
      url: `https://iplprediction2026.in/teams/${params.team}`,
    },
    alternates: {
      canonical: `https://iplprediction2026.in/teams/${params.team}`,
    },
  };
}

export default async function TeamPage({ params }: { params: { team: string } }) {
  const teamKey = slugToTeam(params.team);
  if (!TEAM_CONFIG[teamKey]) notFound();

  const cfg = getTeamConfig(teamKey);
  const players = getTeamPlayers(teamKey);
  const allMatches = await getTeamMatches(teamKey);

  const now = new Date();
  const upcoming = allMatches.filter(
    (m) => m.status === "upcoming" && new Date(m.match_date) > now
  );
  const completed = allMatches.filter((m) => m.status === "completed");

  // Win/loss record from completed matches (where winner is set)
  const wins = completed.filter((m) => m.winner === teamKey).length;
  const losses = completed.filter((m) => m.winner && m.winner !== teamKey).length;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: `linear-gradient(135deg, ${cfg.color}18, ${cfg.color}06)`,
          border: `1px solid ${cfg.color}30`,
        }}
      >
        <div className="text-6xl mb-3">{cfg.emoji}</div>
        <h1 className="font-display font-black text-4xl text-white mb-1">{teamKey}</h1>
        <p className="text-gray-400 text-sm mb-4">{cfg.short} · IPL 2026</p>

        {completed.length > 0 && (
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <span className="text-green-400 font-bold text-xl">{wins}</span>
              <span className="text-gray-500 ml-1">Wins</span>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <span className="text-red-400 font-bold text-xl">{losses}</span>
              <span className="text-gray-500 ml-1">Losses</span>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <span className="text-white font-bold text-xl">{completed.length}</span>
              <span className="text-gray-500 ml-1">Played</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Upcoming matches ───────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-lg text-white mb-3">
            Upcoming {teamKey} Matches
          </h2>
          <div className="space-y-3">
            {upcoming.map((m) => {
              const opponent = m.team_1 === teamKey ? m.team_2 : m.team_1;
              const oppCfg = getTeamConfig(opponent);
              const matchDate = new Date(m.match_date).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", weekday: "short",
              });
              const slug = matchToSlug(m);
              const teamProb = m.team_1 === teamKey ? m.team_1_probability : m.team_2_probability;

              return (
                <Link
                  key={m.id}
                  href={`/predict/${slug}`}
                  className="flex items-center justify-between p-4 rounded-xl transition-all hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{cfg.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm">
                        {teamKey}{" "}
                        <span className="text-gray-500 font-normal">vs</span>{" "}
                        <span style={{ color: oppCfg.color }}>{opponent}</span>
                      </p>
                      <p className="text-xs text-gray-500 truncate">{m.venue}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs text-gray-400">{matchDate}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: cfg.color }}>
                      AI: {teamProb}%
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Key players ────────────────────────────────────────────── */}
      {players && (
        <section>
          <h2 className="font-display font-bold text-lg text-white mb-3">
            Key Players to Watch
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">🏏 Batters</p>
              <ul className="space-y-1">
                {players.bat.map((name) => (
                  <li key={name} className="text-sm text-white">{name}</li>
                ))}
              </ul>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">🎳 Bowlers</p>
              <ul className="space-y-1">
                {players.bowl.map((name) => (
                  <li key={name} className="text-sm text-white">{name}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ── Past results ───────────────────────────────────────────── */}
      {completed.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-lg text-white mb-3">
            Recent Results
          </h2>
          <div className="space-y-2">
            {completed.slice(-5).reverse().map((m) => {
              const opponent = m.team_1 === teamKey ? m.team_2 : m.team_1;
              const oppCfg = getTeamConfig(opponent);
              const won = m.winner === teamKey;
              const matchDate = new Date(m.match_date).toLocaleDateString("en-IN", {
                day: "numeric", month: "short",
              });

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{
                    background: won ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                    border: `1px solid ${won ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)"}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{won ? "✅" : "❌"}</span>
                    <span className="text-sm text-white font-medium">
                      vs <span style={{ color: oppCfg.color }}>{opponent}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${won ? "text-green-400" : "text-red-400"}`}>
                      {won ? "WON" : "LOST"}
                    </span>
                    <span className="text-xs text-gray-600">{matchDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <div
        className="p-5 rounded-2xl text-center"
        style={{
          background: `linear-gradient(135deg, ${cfg.color}12, rgba(255,255,255,0.03))`,
          border: `1px solid ${cfg.color}25`,
        }}
      >
        <p className="text-white font-semibold mb-1">Think you know {teamKey} better than AI?</p>
        <p className="text-gray-500 text-sm mb-4">Predict their next match free — no money, pure cricket instincts.</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white"
          style={{
            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}BB)`,
            boxShadow: `0 4px 20px ${cfg.color}30`,
          }}
        >
          🏏 Predict Now — Beat the AI
        </Link>
      </div>

      {/* ── All teams nav ──────────────────────────────────────────── */}
      <section>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">All Teams</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEAM_CONFIG).map(([key, tcfg]) => (
            <Link
              key={key}
              href={`/teams/${key.toLowerCase()}`}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: key === teamKey ? `${tcfg.color}20` : "rgba(255,255,255,0.05)",
                border: `1px solid ${key === teamKey ? tcfg.color + "50" : "rgba(255,255,255,0.08)"}`,
                color: key === teamKey ? tcfg.color : "#9CA3AF",
              }}
            >
              {tcfg.emoji} {key}
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}
