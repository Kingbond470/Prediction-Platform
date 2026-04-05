export const metadata = {
  title: "Privacy Policy | IPL Prediction 2026",
  description: "Privacy policy for IPL Prediction 2026 — how we collect and use your data.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      <h1 className="font-display font-black text-3xl text-white">Privacy Policy</h1>
      <p className="text-gray-500 text-sm">Last updated: April 2026</p>

      {[
        {
          title: "1. What we collect",
          body: "We collect your mobile phone number (for OTP login), a username you choose, your city, and your favourite IPL team. We also store your match predictions and the points you earn.",
        },
        {
          title: "2. How we use it",
          body: "Your data is used solely to run the IPL Prediction 2026 contest — showing your rank on the leaderboard, tracking your prediction streak, and awarding points. We do not sell or share your data with third parties.",
        },
        {
          title: "3. Phone number",
          body: "Your phone number is used only for OTP verification. It is never displayed publicly. We use Supabase (hosted on AWS Mumbai) to store and process your data.",
        },
        {
          title: "4. Cookies",
          body: "We set a single httpOnly session cookie (`uid`) after login to keep you authenticated. No tracking or advertising cookies are used.",
        },
        {
          title: "5. Analytics",
          body: "We use Vercel Analytics and PostHog to understand how the product is used (page views, click events). No personally identifiable information is sent to these services.",
        },
        {
          title: "6. Data deletion",
          body: "To delete your account and all associated data, email us at hello@iplprediction2026.in. We will process your request within 7 days.",
        },
        {
          title: "7. Contact",
          body: "Questions? Reach us at hello@iplprediction2026.in.",
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
