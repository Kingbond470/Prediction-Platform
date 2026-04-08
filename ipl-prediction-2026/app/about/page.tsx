import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About IPL Prediction 2026 — How It Works, Points & FAQ",
  description:
    "Learn how IPL Prediction 2026 works. Pick match winners, beat the AI, earn points and climb the leaderboard. Free cricket prediction contest — no money, no betting.",
  keywords: [
    "IPL prediction 2026 how it works",
    "free IPL prediction game India",
    "cricket prediction contest free",
    "beat the AI cricket prediction",
    "IPL 2026 prediction leaderboard",
    "is IPL prediction real money",
    "human vs AI cricket prediction",
    "IPL match winner prediction free",
    "about IPL prediction 2026",
    "cricket prediction points system",
  ],
  alternates: { canonical: "https://iplprediction2026.in/about" },
  openGraph: {
    title: "About IPL Prediction 2026 — How It Works, Points & FAQ",
    description:
      "Free IPL 2026 match winner prediction. No money, no betting — just cricket instincts vs AI. Join 10,000+ fans on the leaderboard.",
    url: "https://iplprediction2026.in/about",
    siteName: "IPL Prediction 2026",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_IN",
    type: "website",
  },
};

const FAQS = [
  {
    q: "Is IPL Prediction 2026 free to use?",
    a: "Yes, completely free. There is no entry fee, no subscription, and no hidden charges. Sign up with your phone number and start predicting immediately.",
  },
  {
    q: "Is this real-money betting or gambling?",
    a: "No. IPL Prediction 2026 is a free fan opinion contest — not a betting or gambling platform. You predict match winners for points and leaderboard ranking only. No money changes hands.",
  },
  {
    q: "How do I earn points on IPL Prediction 2026?",
    a: "Correct prediction: 1,000 points. Correct underdog prediction: 1,500 points. Beat the AI's pick on the same match: +500 bonus points. Answer the Daily Trivia correctly: +100 points.",
  },
  {
    q: "What does 'Beat the AI' mean?",
    a: "Before every match, our AI model predicts a winner based on historical data and team form. If you predict a different team and that team wins, you have beaten the AI and earn a 500-point bonus on top of your correct-prediction points.",
  },
  {
    q: "When can I predict a match?",
    a: "Predictions are open from the moment a match is listed until the scheduled match start time. Once the toss happens and the match begins, the prediction window closes.",
  },
  {
    q: "How is the leaderboard calculated?",
    a: "The leaderboard ranks all users by total points earned across the season. Points are credited within minutes of a match result being confirmed. You can also view a weekly leaderboard that resets every Monday.",
  },
  {
    q: "Can I change my prediction after submitting?",
    a: "No. Each user gets one prediction per match and it cannot be changed once submitted. This keeps the contest fair for everyone.",
  },
  {
    q: "What is the Daily Trivia feature?",
    a: "Every day a new cricket trivia question is available. Answer it correctly to earn 100 bonus points. Only one attempt per day per user is allowed.",
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: "📱",
    title: "Sign Up Free",
    detail:
      "Create your account in under 30 seconds using your Indian phone number. No password needed — just OTP verification.",
  },
  {
    step: 2,
    icon: "🏏",
    title: "Pick the Match Winner",
    detail:
      "Browse upcoming IPL 2026 matches, see the AI's prediction, and lock in your own pick before the match starts.",
  },
  {
    step: 3,
    icon: "🏆",
    title: "Earn Points & Climb the Leaderboard",
    detail:
      "Correct picks earn 1,000 pts. Beat the AI on the same match for a 500-pt bonus. Compete with fans across India.",
  },
];

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Predict IPL 2026 Match Winners",
  description:
    "Step-by-step guide to predicting IPL 2026 match winners, earning points and beating the AI on iplprediction2026.in.",
  step: HOW_IT_WORKS.map((s) => ({
    "@type": "HowToStep",
    position: s.step,
    name: s.title,
    text: s.detail,
  })),
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://iplprediction2026.in" },
    { "@type": "ListItem", position: 2, name: "About", item: "https://iplprediction2026.in/about" },
  ],
};

export default function AboutPage() {
  return (
    <>
      {/* Structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="max-w-2xl mx-auto py-4 space-y-12">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="text-center">
          <div
            className="inline-flex w-16 h-16 rounded-2xl items-center justify-center text-3xl mb-5"
            style={{
              background: "linear-gradient(135deg, #EF4444, #B91C1C)",
              boxShadow: "0 0 40px rgba(239,68,68,0.35)",
            }}
          >
            🏏
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white leading-tight mb-4">
            IPL 2026 Prediction —{" "}
            <span className="text-gradient">Can Human Beat AI?</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            India&apos;s free cricket prediction contest. Pick IPL 2026 match winners,
            challenge an AI model, earn points, and see if your cricket instincts
            are sharper than cold algorithms.
          </p>
        </section>

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display font-black text-2xl text-white mb-6 text-center">
            How It Works
          </h2>
          <div className="space-y-4">
            {HOW_IT_WORKS.map((s) => (
              <div
                key={s.step}
                className="flex items-start gap-4 p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  {s.icon}
                </div>
                <div>
                  <p className="font-bold text-white text-sm mb-1">
                    <span className="text-red-400 mr-1.5">Step {s.step}.</span>{s.title}
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Points System ─────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display font-black text-2xl text-white mb-6 text-center">
            How Points Are Earned
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { pts: "1,000", label: "Correct prediction", color: "#10B981", icon: "✅" },
              { pts: "1,500", label: "Correct underdog pick", color: "#F59E0B", icon: "🎯" },
              { pts: "+500", label: "Beat the AI bonus", color: "#60A5FA", icon: "🤖" },
              { pts: "+100", label: "Daily trivia correct", color: "#A78BFA", icon: "🧠" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl p-4 text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="font-display font-black text-2xl mb-1" style={{ color: item.color }}>
                  {item.pts}
                </p>
                <p className="text-xs text-gray-500 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Not Betting ───────────────────────────────────────────────── */}
        <section
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🛡️</span>
            <div>
              <h2 className="font-display font-bold text-white text-lg mb-2">
                Not Betting. Not Gambling. Just Cricket.
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                IPL Prediction 2026 is a <strong className="text-white">free fan opinion contest</strong>.
                No money is wagered, staked, or won. You compete purely for points and leaderboard
                ranking — bragging rights only. This platform is{" "}
                <strong className="text-white">fully legal</strong> under Indian law and has nothing
                to do with real-money fantasy sports or betting apps.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display font-black text-2xl text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <p className="font-semibold text-white text-sm mb-2">{faq.q}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section
          className="rounded-2xl p-8 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <p className="font-display font-black text-2xl text-white mb-2">
            Ready to beat the AI?
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Join 10,000+ cricket fans already predicting IPL 2026 matches. Free. Forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
              style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.45)" }}
            >
              🏏 Join Free — 30 Seconds
            </Link>
            <Link
              href="/"
              className="px-8 py-3 rounded-xl font-semibold text-gray-300 text-sm transition-all hover:text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Browse Matches →
            </Link>
          </div>
        </section>

      </div>
    </>
  );
}
