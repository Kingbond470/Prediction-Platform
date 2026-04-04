import { supabase } from "@/lib/supabase";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

// Mock question for dev/offline mode
const MOCK_QUESTION = {
  id: 1,
  question: "Who has scored the most runs in IPL history?",
  option_a: "Rohit Sharma",
  option_b: "Suresh Raina",
  option_c: "Virat Kohli",
  option_d: "David Warner",
  category: "records",
};

// Today's question: deterministic rotation by day-of-year
// Cycles through all questions so each day has a different one
async function getTodaysQuestion() {
  const { data: questions } = await supabase
    .from("trivia_questions")
    .select("id, question, option_a, option_b, option_c, option_d, category")
    .order("id", { ascending: true });

  if (!questions || questions.length === 0) return null;

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return questions[dayOfYear % questions.length];
}

// ── GET /api/trivia?user_id=xxx ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Only serve personal answered-state to the authenticated user themselves
  const cookieUserId = request.cookies.get("uid")?.value;
  const queryUserId = request.nextUrl.searchParams.get("user_id");
  // In production: ignore user_id param if it doesn't match the session cookie
  const userId = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? (cookieUserId === queryUserId ? cookieUserId : null)
    : queryUserId;

  // Dev / offline mode
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      success: true,
      question: MOCK_QUESTION,
      already_answered: false,
      answer: null,
    });
  }

  try {
    const question = await getTodaysQuestion();
    if (!question) {
      return NextResponse.json({ success: true, question: null });
    }

    // Check if this user already answered today
    let alreadyAnswered = false;
    let answer: { selected: string; is_correct: boolean; correct: string } | null = null;

    if (userId) {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const { data: existing } = await supabase
        .from("trivia_answers")
        .select("selected, is_correct")
        .eq("user_id", userId)
        .eq("answered_at", today)
        .maybeSingle();

      if (existing) {
        alreadyAnswered = true;
        // Also fetch the correct answer so we can show it
        const { data: q } = await supabase
          .from("trivia_questions")
          .select("correct")
          .eq("id", question.id)
          .single();
        answer = { ...existing, correct: q?.correct ?? "" };
      }
    }

    return NextResponse.json({
      success: true,
      question,
      already_answered: alreadyAnswered,
      answer,
    });
  } catch (e) {
    console.error("[trivia GET]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST /api/trivia ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 attempts per IP per hour (4 options × some tolerance)
    const ip = getIp(request);
    if (!rateLimit(`trivia:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const body = await request.json() as { user_id?: string; question_id: number; selected: string };

    // Read user identity from session cookie — never trust the request body for auth
    const cookieUserId = request.cookies.get("uid")?.value;
    const user_id = cookieUserId || (process.env.NEXT_PUBLIC_SUPABASE_URL ? null : body.user_id);

    if (!user_id) {
      return NextResponse.json({ error: "Authentication required. Please log in." }, { status: 401 });
    }

    const { question_id, selected } = body;

    if (!question_id || !selected) {
      return NextResponse.json({ error: "question_id and selected are required" }, { status: 400 });
    }
    if (!["a", "b", "c", "d"].includes(selected)) {
      return NextResponse.json({ error: "selected must be a, b, c or d" }, { status: 400 });
    }

    // Dev / offline mode
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const isCorrect = selected === "c"; // Virat Kohli is correct in mock
      return NextResponse.json({ success: true, is_correct: isCorrect, correct: "c", points_earned: isCorrect ? 100 : 0 });
    }

    // Verify question exists and get correct answer
    const { data: question } = await supabase
      .from("trivia_questions")
      .select("correct")
      .eq("id", question_id)
      .single();

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const isCorrect = selected === question.correct;
    const today = new Date().toISOString().split("T")[0];

    // Insert answer (UNIQUE constraint prevents double-answering)
    const { error: insertErr } = await supabase.from("trivia_answers").insert({
      user_id,
      question_id,
      selected,
      is_correct: isCorrect,
      answered_at: today,
    });

    if (insertErr) {
      // Unique violation = already answered today
      if (insertErr.code === "23505") {
        return NextResponse.json({ error: "Already answered today's trivia" }, { status: 400 });
      }
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    // Award 100 points for correct answer via a trivia_points increment on users
    // (kept separate from predictions so leaderboard_humans view is unaffected)
    if (isCorrect) {
      await supabase.rpc("increment_trivia_points", { uid: user_id, pts: 100 });
    }

    return NextResponse.json({
      success: true,
      is_correct: isCorrect,
      correct: question.correct,
      points_earned: isCorrect ? 100 : 0,
    });
  } catch (e) {
    console.error("[trivia POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
