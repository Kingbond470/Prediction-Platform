import { Suspense } from "react";
import dynamic from "next/dynamic";
import { supabase, Match } from "@/lib/supabase";

const HomeClient = dynamic(() => import("./components/HomeClient"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-64 rounded-2xl shimmer-bg" />
      ))}
    </div>
  ),
});

function getMockMatches(): Match[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    { id: "mock-1", match_number: 1, team_1: "CSK", team_2: "RCB", venue: "MA Chidambaram Stadium", city: "Chennai", match_date: new Date(now + 2 * day).toISOString(), vote_start_time: new Date(now - 60 * 60 * 1000).toISOString(), vote_end_time: new Date(now + 2 * day - 30 * 60 * 1000).toISOString(), team_1_probability: 65, team_2_probability: 35, winner: null, status: "upcoming", initial_count_team_1: 7000, initial_count_team_2: 3000 },
    { id: "mock-2", match_number: 2, team_1: "MI",  team_2: "DC",  venue: "Arun Jaitley Stadium", city: "Delhi", match_date: new Date(now + 3 * day).toISOString(), vote_start_time: new Date(now - 60 * 60 * 1000).toISOString(), vote_end_time: new Date(now + 3 * day - 30 * 60 * 1000).toISOString(), team_1_probability: 60, team_2_probability: 40, winner: null, status: "upcoming", initial_count_team_1: 6500, initial_count_team_2: 3500 },
    { id: "mock-3", match_number: 3, team_1: "KKR", team_2: "SRH", venue: "Eden Gardens", city: "Kolkata", match_date: new Date(now + 4 * day).toISOString(), vote_start_time: new Date(now - 60 * 60 * 1000).toISOString(), vote_end_time: new Date(now + 4 * day - 30 * 60 * 1000).toISOString(), team_1_probability: 55, team_2_probability: 45, winner: null, status: "upcoming", initial_count_team_1: 5500, initial_count_team_2: 4500 },
  ];
}

async function getMatches(): Promise<Match[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return getMockMatches();

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true })
      .limit(20);

    if (error || !data || data.length === 0) return getMockMatches();
    return data as Match[];
  } catch {
    return getMockMatches();
  }
}

export default async function HomePage() {
  const matches = await getMatches();

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative text-center mb-14 pt-4 pb-8">
        {/* Radial glow behind hero text */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-64 bg-hero-radial" />
        </div>

        {/* Season badge */}
        <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full glass border border-red-500/20">
          <span className="live-dot" />
          <span className="text-xs font-bold text-red-400 tracking-widest uppercase">IPL 2026 Season Live</span>
        </div>

        {/* Main headline */}
        <h1 className="font-display font-black text-[clamp(3rem,10vw,7rem)] leading-[0.9] tracking-tight mb-4">
          <span className="text-gradient">HUMAN</span>
          <br />
          <span className="text-white">CAN BEAT AI</span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg mb-2 max-w-xs sm:max-w-sm mx-auto">
          Your cricket instincts <span className="text-white font-semibold">&gt;</span> cold algorithms
        </p>
        <p className="text-gray-600 text-sm max-w-[260px] sm:max-w-xs mx-auto mb-8 sm:mb-10">
          Predict IPL winners · Climb the leaderboard · Zero money
        </p>

        {/* Stats row */}
        <div className="flex justify-center gap-2 sm:gap-6 flex-wrap">
          {[
            { value: "2.1L+", label: "Predictions", icon: "🎯", color: "from-red-500/20 to-red-500/5" },
            { value: "74%",   label: "Beat AI",     icon: "🤖", color: "from-green-500/20 to-green-500/5" },
            { value: "74",    label: "Matches",     icon: "🏏", color: "from-amber-500/20 to-amber-500/5" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`px-3 sm:px-5 py-3 rounded-2xl bg-gradient-to-b ${stat.color} border border-white/[0.07] text-center min-w-[78px] sm:min-w-[90px]`}
            >
              <div className="text-xl mb-0.5">{stat.icon}</div>
              <div className="text-2xl font-display font-black text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll cue */}
        <div className="mt-10 flex flex-col items-center gap-1 opacity-30 animate-bounce">
          <div className="w-0.5 h-6 rounded-full bg-white" />
          <div className="text-xs text-white">scroll</div>
        </div>
      </section>

      {/* ── Matches ──────────────────────────────────────────────── */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-2xl text-white">
            ⚔️ Upcoming Battles
          </h2>
          <div className="live-badge">
            <span className="live-dot" />
            {matches.length} live
          </div>
        </div>

        <Suspense fallback={<div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl shimmer-bg" />)}</div>}>
          <HomeClient initialMatches={matches} />
        </Suspense>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section className="mb-14">
        <h2 className="font-display font-bold text-2xl text-white text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              icon: "🏏",
              title: "Pick Your Winner",
              desc: "Browse upcoming IPL matches and predict which team wins. Trust your gut.",
              color: "#EF4444",
            },
            {
              step: "02",
              icon: "🤖",
              title: "See AI's Odds",
              desc: "Our AI analyses historical data, form, and pitch reports to make its own pick.",
              color: "#F59E0B",
            },
            {
              step: "03",
              icon: "🏆",
              title: "Score & Climb",
              desc: "Correct pick: +1,000 pts. Picking the underdog who wins: +1,500 pts. Beat the AI: +500 bonus.",
              color: "#10B981",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative p-6 rounded-2xl glass overflow-hidden group hover:-translate-y-1 transition-smooth"
            >
              {/* Step number watermark */}
              <div
                className="absolute -top-2 -right-2 text-8xl font-display font-black opacity-[0.04] select-none"
                style={{ color: item.color }}
              >
                {item.step}
              </div>

              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{
                  background: `${item.color}18`,
                  border: `1px solid ${item.color}30`,
                  boxShadow: `0 0 20px ${item.color}15`,
                }}
              >
                {item.icon}
              </div>

              <h3 className="font-display font-bold text-white text-lg mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social Proof ─────────────────────────────────────────── */}
      <section className="mb-14">
        <div
          className="relative rounded-2xl overflow-hidden p-8 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(245,158,11,0.08) 100%)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          {/* Decorative blobs */}
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="text-5xl mb-3 animate-float inline-block">🏆</div>
            <h2 className="font-display font-black text-3xl text-white mb-2">
              2,10,000+ fans playing
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Join India&apos;s fastest growing cricket prediction community. Free to play, no betting, just vibes.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-sm shadow-glow-red cursor-pointer hover:shadow-[0_4px_30px_rgba(239,68,68,0.5)] transition-smooth">
              🏏 Start Predicting — It&apos;s Free
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="font-display font-bold text-2xl text-white mb-6">FAQ</h2>
        <div className="space-y-3">
          {[
            {
              q: "🧠 Can humans really beat AI at predictions?",
              a: "Absolutely — and it happens all the time. Magnus Carlsen still beats chess engines in blitz. Nate Silver's FiveThirtyEight model got the 2016 US election wrong. AI can't feel momentum, crowd energy, or know that Dhoni had an argument with the coach yesterday. Your gut + cricket knowledge is a real edge.",
            },
            {
              q: "🏏 Why is cricket the perfect sport to beat AI at?",
              a: "Cricket is gloriously unpredictable. A single over can change everything. AI models work on averages and history — they have no idea a fast bowler has a niggling injury, the pitch is behaving weird, or a player is on a revenge match against his former team. You might. That's the beauty of it.",
            },
            {
              q: "🎯 What's the point if there's no money?",
              a: "The point is the argument. The banter. The feeling of calling it right when everyone doubted you. Sports were never really about money — they're about being part of a shared moment, having an opinion, and screaming at the TV with your mates. This is that, but on your phone.",
            },
            {
              q: "🔥 Has AI ever been publicly beaten by crowds?",
              a: "Yes, constantly. Betfair's in-play crowd odds outperform algorithmic models in live cricket regularly. Wisdom-of-the-crowd experiments at the IPL have outpaced ML systems multiple seasons in a row. A room full of passionate cricket fans beats a model trained on dry statistics more often than anyone admits.",
            },
            {
              q: "💰 Is this a betting platform?",
              a: "Zero money involved. No real cash, no tokens, nothing. It's a free fan prediction contest — pure cricket knowledge and bragging rights.",
            },
            {
              q: "📊 How does scoring work?",
              a: "Correct prediction earns +1,000 points. Pick the underdog and win: +1,500 points. Beat the AI's prediction: +500 bonus points. The AI earns +1,000 points for every correct prediction too — so every match is a real contest.",
            },
            {
              q: "🤖 How does the AI work?",
              a: "Our model analyses team form, head-to-head records, player stats, venue data, and pitch reports to generate win probabilities for each match.",
            },
            {
              q: "🤝 Is it about winning or losing?",
              a: "Neither. It's about having a take and standing by it. The whole joy is in the discussion — why you think CSK will win, why your friend disagrees, and finding out together. Right or wrong, you were in the conversation. That's what sport is for.",
            },
            {
              q: "🔒 Is my data safe?",
              a: "Yes — we only collect your phone number and username. Data is encrypted, never sold. You can delete your account anytime.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="glass rounded-xl overflow-hidden group"
            >
              <summary className="px-5 py-4 cursor-pointer font-semibold text-white hover:text-red-400 transition-smooth list-none flex justify-between items-center">
                <span>{item.q}</span>
                <span className="text-gray-500 group-open:rotate-180 transition-smooth text-lg leading-none">⌄</span>
              </summary>
              <div className="px-5 pb-4 text-gray-400 text-sm leading-relaxed border-t border-white/[0.05]">
                <div className="pt-3">{item.a}</div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
