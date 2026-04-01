"use client";

import { useEffect, useState } from "react";

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
  const [scoring, setScoring] = useState<string | null>(null); // match_id being scored
  const [results, setResults] = useState<Record<string, ScoringResult>>({});
  const [error, setError] = useState("");

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

  const pending = matches.filter((m) => m.status !== "completed");
  const completed = matches.filter((m) => m.status === "completed");

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

      {/* Pending matches — need results entered */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
            Pending Results ({pending.length})
          </h2>
          {pending.map((match) => {
            const isScoring = scoring === match.id;
            const result = results[match.id];
            return (
              <div
                key={match.id}
                className="rounded-2xl p-4 border border-white/[0.08]"
                style={{ background: "rgba(255,255,255,0.03)" }}
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
