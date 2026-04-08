import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { NavAuth } from "./components/NavAuth";
import { BottomNav } from "./components/BottomNav";
import { Analytics } from "@vercel/analytics/react";
import { PostHogProvider } from "./components/PostHogProvider";
import ThemeProvider from "./components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IPL Prediction 2026 — Can Human Beat AI?",
  description: "Predict IPL 2026 match winners. Prove your cricket instincts beat the AI. Free fan prediction contest — no money, pure bragging rights. Join 2.1L+ fans.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://iplprediction2026.in"
  ),
  keywords: [
    "today match prediction", "IPL prediction today", "who will win today IPL match",
    "IPL 2026 winner prediction", "cricket prediction free", "IPL match prediction with AI",
    "beat AI cricket prediction", "IPL prediction leaderboard",
    "IPL 2026 prediction", "IPL match prediction", "cricket prediction game",
    "human vs AI cricket", "beat the AI", "free cricket prediction", "IPL leaderboard",
  ],
  openGraph: {
    title: "IPL Prediction 2026 — Can Human Beat AI?",
    description: "Your cricket gut feeling vs cold algorithms. Predict IPL winners, beat the AI, climb the leaderboard. Free. No betting.",
    url: "https://iplprediction2026.in",
    siteName: "IPL Prediction 2026",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "IPL Prediction 2026 — Human Can Beat AI" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IPL Prediction 2026 — Can Human Beat AI?",
    description: "Your cricket gut feeling vs cold algorithms. Free fan prediction contest. Join 2.1L+ fans.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://iplprediction2026.in" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`} style={{ colorScheme: "dark" }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#07111F" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "IPL Prediction 2026",
              "url": "https://iplprediction2026.in",
              "description": "Free IPL 2026 cricket match prediction contest. Predict winners, beat the AI, climb the leaderboard.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://iplprediction2026.in/?q={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "publisher": {
                "@type": "Organization",
                "name": "IPL Prediction 2026",
                "url": "https://iplprediction2026.in",
                "logo": { "@type": "ImageObject", "url": "https://iplprediction2026.in/favicon.svg" }
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsOrganization",
              "name": "IPL Prediction 2026",
              "url": "https://iplprediction2026.in",
              "sport": "Cricket",
              "description": "India's free fan IPL 2026 cricket prediction community. Human Can Beat AI.",
              "sameAs": ["https://iplprediction2026.com"]
            })
          }}
        />
      </head>
      <body className="bg-[#07111F] text-white min-h-screen relative">
        <PostHogProvider>
          <ThemeProvider />

          {/* Background gradient blobs — tinted with team color */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div
              className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px]"
              style={{ background: "rgba(var(--tc-r,239), var(--tc-g,68), var(--tc-b,68), 0.04)" }}
            />
            <div className="absolute top-[20%] -right-[15%] w-[60%] h-[60%] rounded-full bg-amber-500/[0.03] blur-[100px]" />
            <div className="absolute bottom-0 left-[30%] w-[40%] h-[40%] rounded-full bg-blue-600/[0.04] blur-[100px]" />
          </div>

          {/* Premium Navigation */}
          <nav className="sticky top-0 z-50 border-b border-white/[0.07]" style={{ background: "rgba(7,17,31,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
            <div className="max-w-5xl mx-auto px-4 h-14 flex justify-between items-center gap-4">
              {/* Logo */}
              <a href="/" className="flex items-center gap-2.5 group shrink-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm group-hover:scale-105 transition-smooth"
                  style={{
                    background: "linear-gradient(135deg, var(--tc, #EF4444), color-mix(in srgb, var(--tc, #EF4444) 70%, black))",
                    boxShadow: "0 0 16px rgba(var(--tc-r,239), var(--tc-g,68), var(--tc-b,68), 0.35)",
                  }}
                >
                  🏏
                </div>
                <span className="font-display font-bold text-white text-sm tracking-wide">IPL PREDICTION <span className="text-gray-500 font-normal">2026</span></span>
              </a>

              {/* Center: desktop page links */}
              <div className="hidden sm:flex items-center gap-1">
                {[
                  { href: "/", label: "Home" },
                  { href: "/leaderboard", label: "Leaderboard" },
                  { href: "/about", label: "About" },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/[0.06] transition-smooth"
                  >
                    {link.label}
                  </a>
                ))}
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ml-1"
                  style={{
                    background: "rgba(var(--tc-r,239), var(--tc-g,68), var(--tc-b,68), 0.1)",
                    border: "1px solid rgba(var(--tc-r,239), var(--tc-g,68), var(--tc-b,68), 0.3)",
                    color: "var(--tc, #EF4444)",
                  }}
                >
                  <span className="live-dot" />
                  SEASON LIVE
                </div>
              </div>

              {/* Right */}
              <NavAuth />
            </div>
          </nav>

          {/* Main content — extra bottom padding on mobile for bottom nav */}
          <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
            {children}
          </main>

          <BottomNav />

          {/* Footer */}
          <footer className="relative z-10 border-t border-white/[0.06] mt-16 py-8">
            <div className="max-w-5xl mx-auto px-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: "linear-gradient(135deg, var(--tc, #EF4444), color-mix(in srgb, var(--tc, #EF4444) 70%, black))" }}>
                    🏏
                  </div>
                  <span className="text-gray-500 text-sm font-semibold">IPL PREDICTION 2026</span>
                </div>
                <div className="text-center text-xs text-gray-600">
                  <p>Free fan opinion poll — No money, no betting, pure cricket.</p>
                  <p className="mt-1">© 2026 IPL Prediction. All rights reserved.</p>
                </div>
                <div className="flex gap-4 text-xs text-gray-600">
                  <a href="/about" className="hover:text-gray-400 transition-colors">About</a>
                  <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</a>
                  <a href="/terms" className="hover:text-gray-400 transition-colors">Terms</a>
                  <a href="mailto:hello@iplprediction2026.in" className="hover:text-gray-400 transition-colors">Contact</a>
                </div>
              </div>
            </div>
          </footer>

          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  );
}
