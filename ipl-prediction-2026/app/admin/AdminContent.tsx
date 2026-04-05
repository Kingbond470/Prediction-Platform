"use client";

import { useState } from "react";

const IPL_TEAMS = ["CSK", "MI", "RCB", "KKR", "DC", "SRH", "PBKS", "RR", "GT", "LSG"] as const;

const IPL_VENUES: { venue: string; city: string }[] = [
  { venue: "Wankhede Stadium",             city: "Mumbai" },
  { venue: "MA Chidambaram Stadium",        city: "Chennai" },
  { venue: "Eden Gardens",                  city: "Kolkata" },
  { venue: "M Chinnaswamy Stadium",         city: "Bengaluru" },
  { venue: "Arun Jaitley Stadium",          city: "Delhi" },
  { venue: "Rajiv Gandhi Intl Cricket Stadium", city: "Hyderabad" },
  { venue: "Narendra Modi Stadium",         city: "Ahmedabad" },
  { venue: "Sawai Mansingh Stadium",        city: "Jaipur" },
  { venue: "BRSABV Ekana Cricket Stadium",  city: "Lucknow" },
  { venue: "PCA Stadium",                   city: "Mohali" },
  { venue: "Himachal Pradesh Cricket Association Stadium", city: "Dharamsala" },
  { venue: "Brabourne Stadium",             city: "Mumbai" },
];

interface Match {
  id: string;
  match_number: number;
  team_1: string;
  team_2: string;
  venue: string;
  match_date: string;
  status: string;
  winner: string | null;
  team_1_probability: number;
  team_2_probability: number;
}

interface ScoringResult {
  match_id: string;
  winner: string;
  scored: number;
  message: string;
}

export default function AdminContent() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ScoringResult>>({});
  const [error, setError] = useState("");

  // ── Add Match form ─────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState("");
  const [addError, setAddError] = useState("");
  const [newMatch, setNewMatch] = useState({
    match_number: "",
    team_1: "",
    team_2: "",
    venue: "",
    city: "",
    match_date: "",
    team_1_probability: "55",
    team_2_probability: "45",
    initial_count_team_1: "500",
    initial_count_team_2: "500",
  });

  const loadMatches = async (adminSecret: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      if (data.matches) {
        setMatches(data.matches.sort((a: Match, b: Match) => a.match_number - b.match_number));
        setAuthed(true);
        setSecret(adminSecret);
      } else {
        setError("Failed to load matches");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    loadMatches(secret);
  };

  const setWinner = async (match: Match, winner: string) => {
    if (scoring) return;
    setScoring(match.id);
    try {
      const res = await fetch("/api/admin/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ match_id: match.id, winner }),
      });
      const data = await res.json();
      if (data.success) {
        setResults((prev) => ({ ...prev, [match.id]: data }));
        // Update local match status
        setMatches((prev) =>
          prev.map((m) =>
            m.id === match.id ? { ...m, status: "completed", winner } : m
          )
        );
      } else {
        setError(data.error || "Failed to score match");
      }
    } catch {
      setError("Network error scoring match");
    } finally {
      setScoring(null);
    }
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");
    const p1 = Number(newMatch.team_1_probability);
    const p2 = Number(newMatch.team_2_probability);
    if (p1 + p2 !== 100) {
      setAddError("Probabilities must add up to 100");
      return;
    }
    setAddSubmitting(true);
    // BUG-02 fix: datetime-local gives local time with no offset — force IST (+05:30)
    const matchDateIST = newMatch.match_date
      ? newMatch.match_date.length === 16
        ? `${newMatch.match_date}:00+05:30`
        : newMatch.match_date
      : "";
    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({
          ...newMatch,
          match_date: matchDateIST,
          match_number: Number(newMatch.match_number),
          team_1_probability: p1,
          team_2_probability: p2,
          initial_count_team_1: Number(newMatch.initial_count_team_1),
          initial_count_team_2: Number(newMatch.initial_count_team_2),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAddSuccess(`Match #${data.match.match_number} — ${data.match.team_1} vs ${data.match.team_2} added!`);
        setNewMatch({ match_number: "", team_1: "", team_2: "", venue: "", city: "", match_date: "", team_1_probability: "55", team_2_probability: "45", initial_count_team_1: "500", initial_count_team_2: "500" });
        loadMatches(secret);
      } else {
        setAddError(data.error || "Failed to add match");
      }
    } catch {
      setAddError("Network error");
    } finally {
      setAddSubmitting(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === "completed") return "text-green-400 bg-green-500/10 border-green-500/20";
    if (status === "live") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-gray-400 bg-white/[0.04] border-white/[0.08]";
  };

  if (!authed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="font-display font-black text-2xl text-white">Admin Panel</h1>
            <p className="text-gray-500 text-sm mt-1">Enter admin secret to continue</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              placeholder="Admin secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-600 focus:outline-none focus:border-white/30"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !secret}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-400 disabled:opacity-50 transition-all"
            >
              {loading ? "Loading..." : "Enter →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const now = new Date();
  const needsResult = matches.filter((m) => m.status !== "completed" && new Date(m.match_date) <= now);
  const upcoming    = matches.filter((m) => m.status !== "completed" && new Date(m.match_date) > now);
  const completed   = matches.filter((m) => m.status === "completed");

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm">{matches.length} matches · {completed.length} completed</p>
        </div>
        <button
          onClick={() => loadMatches(secret)}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-gray-400 hover:text-white transition-all"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── Add Match ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08]" style={{ background: "rgba(255,255,255,0.03)" }}>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <span className="font-bold text-white text-sm">➕ Add New Match</span>
          <span className="text-gray-500 text-xs">{showAddForm ? "▲ Collapse" : "▼ Expand"}</span>
        </button>

        {showAddForm && (
          <form onSubmit={handleAddMatch} className="px-5 pb-5 space-y-4 border-t border-white/[0.06] pt-4">
            {/* Row 1: match number + date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Match #</label>
                <input
                  type="number" min="1" max="74" required
                  placeholder="e.g. 23"
                  value={newMatch.match_number}
                  onChange={(e) => setNewMatch((p) => ({ ...p, match_number: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-600 focus:outline-none focus:border-white/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Match Date & Time (IST)</label>
                <input
                  type="datetime-local" required
                  value={newMatch.match_date}
                  onChange={(e) => setNewMatch((p) => ({ ...p, match_date: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white focus:outline-none focus:border-white/30 text-sm"
                />
              </div>
            </div>

            {/* Row 2: teams */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Team 1</label>
                <select
                  required
                  value={newMatch.team_1}
                  onChange={(e) => setNewMatch((p) => ({ ...p, team_1: e.target.value, team_2: "" }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0d1a2d] border border-white/[0.1] text-white focus:outline-none focus:border-white/30 text-sm"
                >
                  <option value="">Select team</option>
                  {IPL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Team 2</label>
                <select
                  required
                  value={newMatch.team_2}
                  onChange={(e) => setNewMatch((p) => ({ ...p, team_2: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0d1a2d] border border-white/[0.1] text-white focus:outline-none focus:border-white/30 text-sm"
                >
                  <option value="">Select team</option>
                  {IPL_TEAMS.filter((t) => t !== newMatch.team_1).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: venue picker */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Venue</label>
              <select
                required
                value={newMatch.venue}
                onChange={(e) => {
                  const selected = IPL_VENUES.find((v) => v.venue === e.target.value);
                  setNewMatch((p) => ({ ...p, venue: e.target.value, city: selected?.city ?? p.city }));
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0d1a2d] border border-white/[0.1] text-white focus:outline-none focus:border-white/30 text-sm"
              >
                <option value="">Select venue</option>
                {IPL_VENUES.map((v) => (
                  <option key={v.venue} value={v.venue}>{v.venue}, {v.city}</option>
                ))}
              </select>
            </div>

            {/* Row 4: AI probabilities */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                AI Win Probability — must total 100
                <span className="ml-2 font-bold text-white">
                  {newMatch.team_1 || "T1"} {newMatch.team_1_probability}% · {newMatch.team_2 || "T2"} {newMatch.team_2_probability}%
                </span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-8 text-right">{newMatch.team_1_probability}%</span>
                <input
                  type="range" min="5" max="95"
                  value={newMatch.team_1_probability}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setNewMatch((p) => ({ ...p, team_1_probability: String(v), team_2_probability: String(100 - v) }));
                  }}
                  className="flex-1 accent-red-500"
                />
                <span className="text-xs text-gray-500 w-8">{newMatch.team_2_probability}%</span>
              </div>
            </div>

            {/* Row 5: seed counts */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Seed votes — {newMatch.team_1 || "Team 1"}</label>
                <input
                  type="number" min="0"
                  value={newMatch.initial_count_team_1}
                  onChange={(e) => setNewMatch((p) => ({ ...p, initial_count_team_1: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white focus:outline-none focus:border-white/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Seed votes — {newMatch.team_2 || "Team 2"}</label>
                <input
                  type="number" min="0"
                  value={newMatch.initial_count_team_2}
                  onChange={(e) => setNewMatch((p) => ({ ...p, initial_count_team_2: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white focus:outline-none focus:border-white/30 text-sm"
                />
              </div>
            </div>

            {addError && <p className="text-red-400 text-sm">⚠️ {addError}</p>}
            {addSuccess && <p className="text-green-400 text-sm">✅ {addSuccess}</p>}

            <button
              type="submit"
              disabled={addSubmitting}
              className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 transition-all"
              style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)" }}
            >
              {addSubmitting ? "Adding…" : "➕ Add Match"}
            </button>
          </form>
        )}
      </div>

      {/* Matches that have started — need result entered */}
      {needsResult.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Needs Result ({needsResult.length})
          </h2>
          {needsResult.map((match) => {
            const isScoring = scoring === match.id;
            const result = results[match.id];
            return (
              <div
                key={match.id}
                className="rounded-2xl p-4 border border-amber-500/20"
                style={{ background: "rgba(245,158,11,0.04)" }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
                      Match #{match.match_number}
                    </span>
                    <p className="font-display font-bold text-white text-lg">
                      {match.team_1} vs {match.team_2}
                    </p>
                    <p className="text-xs text-gray-500">
                      {match.venue} · {new Date(match.match_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize shrink-0 ${statusColor(match.status)}`}>
                    {match.status}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  AI: {match.team_1_probability >= match.team_2_probability ? match.team_1 : match.team_2} favoured
                  ({Math.max(match.team_1_probability, match.team_2_probability)}%)
                </div>

                {result ? (
                  <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                    ✅ {result.message}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setWinner(match, match.team_1)}
                      disabled={!!isScoring}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-white/[0.1] text-white hover:bg-white/[0.06] disabled:opacity-50 transition-all"
                    >
                      {isScoring ? "Scoring..." : `${match.team_1} Won`}
                    </button>
                    <button
                      onClick={() => setWinner(match, match.team_2)}
                      disabled={!!isScoring}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-white/[0.1] text-white hover:bg-white/[0.06] disabled:opacity-50 transition-all"
                    >
                      {isScoring ? "Scoring..." : `${match.team_2} Won`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming fixtures — view only, no winner buttons */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Upcoming Fixtures ({upcoming.length})
          </h2>
          {upcoming.map((match) => (
            <div
              key={match.id}
              className="rounded-xl p-3.5 flex items-center justify-between border border-white/[0.07]"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div>
                <p className="font-semibold text-white text-sm">
                  Match #{match.match_number} · {match.team_1} vs {match.team_2}
                </p>
                <p className="text-xs text-gray-500">
                  {match.venue} · {new Date(match.match_date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <span className="text-xs text-gray-600 font-semibold shrink-0">Scheduled</span>
            </div>
          ))}
        </div>
      )}

      {/* Completed matches */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Completed ({completed.length})
          </h2>
          {completed.map((match) => (
            <div
              key={match.id}
              className="rounded-xl p-3.5 flex items-center justify-between border border-green-500/10"
              style={{ background: "rgba(16,185,129,0.04)" }}
            >
              <div>
                <p className="font-semibold text-white text-sm">
                  Match #{match.match_number} · {match.team_1} vs {match.team_2}
                </p>
                <p className="text-xs text-gray-500">{match.venue}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500 mb-0.5">Winner</p>
                <p className="font-display font-black text-green-400">{match.winner}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {matches.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-500">No matches found</div>
      )}
    </div>
  );
}
