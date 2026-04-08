export const metadata = {
  title: "Terms of Use | IPL Prediction 2026",
  description: "Terms of use for IPL Prediction 2026.",
  alternates: { canonical: "https://iplprediction2026.in/terms" },
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <h1 className="font-display font-black text-3xl text-white">Terms of Use</h1>
      <p className="text-gray-500 text-sm">Last updated: April 2026</p>

      {[
        {
          title: "1. Free fan contest — no money involved",
          body: "IPL Prediction 2026 is a free fan prediction game. No money is wagered, won, or lost. Points and leaderboard ranks are for entertainment and bragging rights only. This is not gambling.",
        },
        {
          title: "2. Eligibility",
          body: "The platform is open to anyone with a valid Indian mobile number. By signing up you confirm you are participating for personal, non-commercial enjoyment.",
        },
        {
          title: "3. One account per person",
          body: "Each mobile number may have one account. Creating multiple accounts to farm points or manipulate the leaderboard will result in all accounts being removed.",
        },
        {
          title: "4. Predictions are final",
          body: "Once you submit a prediction for a match, it cannot be changed. Predictions lock when the match starts.",
        },
        {
          title: "5. Points and leaderboard",
          body: "Points are awarded automatically after match results are confirmed. IPL Prediction 2026 reserves the right to correct scoring errors. The leaderboard is for fun — points have no monetary value.",
        },
        {
          title: "6. Acceptable use",
          body: "You agree not to attempt to manipulate the platform, scrape data at scale, reverse-engineer the AI model, or disrupt service for other users.",
        },
        {
          title: "7. Changes",
          body: "We may update these terms at any time. Continued use of the platform after changes means you accept the new terms.",
        },
        {
          title: "8. Contact",
          body: "Questions? Email us at hello@iplprediction2026.in.",
        },
      ].map(({ title, body }) => (
        <div key={title} className="glass rounded-2xl p-5 space-y-2">
          <h2 className="font-display font-bold text-white text-base">{title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
        </div>
      ))}

      <a href="/" className="block text-center text-sm text-gray-600 hover:text-gray-400 transition-colors py-2">
        ← Back to Home
      </a>
    </div>
  );
}
