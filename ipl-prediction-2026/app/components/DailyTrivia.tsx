"use client";

import { useState, useEffect } from "react";

interface TriviaQuestion {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  category: string;
}

interface TriviaAnswer {
  selected: string;
  is_correct: boolean;
  correct: string;
}

type TriviaState = "loading" | "question" | "answered" | "already_done" | "unavailable";

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
const OPTION_LABEL: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };

export default function DailyTrivia({ userId }: { userId: string | null }) {
  const [state, setState] = useState<TriviaState>("loading");
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [answer, setAnswer] = useState<TriviaAnswer | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const url = userId ? `/api/trivia?user_id=${userId}` : "/api/trivia";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !d.question) {
          setState("unavailable");
          return;
        }
        setQuestion(d.question);
        if (d.already_answered) {
          setAnswer(d.answer);
          setState("already_done");
          setCollapsed(true);
        } else {
          setState("question");
        }
      })
      .catch(() => setState("unavailable"));
  }, [userId]);

  const handleSubmit = async () => {
    if (!selected || !question || !userId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, question_id: question.id, selected }),
      });
      const d = await res.json();
      if (d.success) {
        setAnswer({ selected, is_correct: d.is_correct, correct: d.correct });
        setPointsEarned(d.points_earned ?? 0);
        setState("answered");
      }
    } catch {
      // silently fail — question remains open
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="rounded-2xl glass p-4 mb-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-5 bg-white/10 rounded w-full mb-4" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (state === "unavailable") return null;

  const optionText = (key: string) =>
    key === "a" ? question!.option_a :
    key === "b" ? question!.option_b :
    key === "c" ? question!.option_c :
    question!.option_d;

  const isAnswered = state === "answered" || state === "already_done";
  const correctKey = answer?.correct ?? null;

  return (
    <div className="rounded-2xl glass border border-white/[0.07] mb-5 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 transition-smooth hover:bg-white/[0.03]"
        onClick={() => isAnswered && setCollapsed((c) => !c)}
        disabled={!isAnswered}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
              Daily Trivia
            </p>
            <p className="text-[11px] text-gray-500 leading-none mt-0.5">
              {isAnswered
                ? state === "answered" && answer?.is_correct
                  ? `+${pointsEarned} pts earned!`
                  : "Come back tomorrow for a new question"
                : "Answer correctly for +100 pts"}
            </p>
          </div>
        </div>
        {isAnswered && (
          <span className="text-gray-600 text-xs">{collapsed ? "▼ Show" : "▲ Hide"}</span>
        )}
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 border-t border-white/[0.05] pt-3">
          <p className="text-white font-semibold text-sm leading-snug mb-3">
            {question?.question}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {OPTION_KEYS.map((key) => {
              const text = optionText(key);
              const isSelected = selected === key || answer?.selected === key;
              const isCorrect = correctKey === key;

              let bg = "rgba(255,255,255,0.05)";
              let border = "rgba(255,255,255,0.08)";
              let textColor = "#D1D5DB";

              if (isAnswered) {
                if (isCorrect) {
                  bg = "rgba(16,185,129,0.15)";
                  border = "rgba(16,185,129,0.4)";
                  textColor = "#10B981";
                } else if (isSelected && !isCorrect) {
                  bg = "rgba(239,68,68,0.12)";
                  border = "rgba(239,68,68,0.35)";
                  textColor = "#EF4444";
                }
              } else if (isSelected) {
                bg = "rgba(245,158,11,0.15)";
                border = "rgba(245,158,11,0.4)";
                textColor = "#F59E0B";
              }

              return (
                <button
                  key={key}
                  disabled={isAnswered || submitting || !userId}
                  onClick={() => setSelected(key)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all duration-200 disabled:cursor-default"
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    color: textColor,
                  }}
                >
                  <span className="text-xs font-black shrink-0" style={{ color: border === "rgba(255,255,255,0.08)" ? "#6B7280" : textColor }}>
                    {OPTION_LABEL[key]}
                  </span>
                  <span className="text-xs font-medium leading-tight">{text}</span>
                  {isAnswered && isCorrect && (
                    <span className="ml-auto shrink-0 text-green-400 text-sm">✓</span>
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <span className="ml-auto shrink-0 text-red-400 text-sm">✗</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Submit / result */}
          {!isAnswered && !userId && (
            <a
              href="/signup"
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.35)",
                color: "#F59E0B",
              }}
            >
              🔐 Sign up free to answer · earn +100 pts →
            </a>
          )}

          {!isAnswered && userId && (
            <button
              disabled={!selected || submitting}
              onClick={handleSubmit}
              className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: selected ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${selected ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: selected ? "#F59E0B" : "#6B7280",
              }}
            >
              {submitting ? "Submitting…" : "Submit Answer"}
            </button>
          )}

          {state === "answered" && (
            <div
              className="mt-3 px-3 py-2 rounded-xl text-center text-sm font-bold"
              style={{
                background: answer?.is_correct ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)",
                border: `1px solid ${answer?.is_correct ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`,
                color: answer?.is_correct ? "#10B981" : "#EF4444",
              }}
            >
              {answer?.is_correct
                ? `🎉 Correct! +${pointsEarned} points added`
                : `❌ Incorrect — the answer was ${OPTION_LABEL[correctKey ?? "a"]}`}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
