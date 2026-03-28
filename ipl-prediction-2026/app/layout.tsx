import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

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
  title: "IPL Prediction 2026 — Beat The AI",
  description: "Predict IPL winners. Prove humans beat AI. Zero money, pure bragging rights.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://iplprediction2026.in"
  ),
  openGraph: {
    title: "IPL Prediction 2026 — Beat The AI",
    description: "Your cricket knowledge > Algorithms. Predict. Compete. Dominate.",
    url: "https://iplprediction2026.in",
    siteName: "IPL Prediction 2026",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IPL Prediction 2026 — Beat The AI",
    description: "Your cricket knowledge > Algorithms. Predict. Compete. Dominate.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`} style={{ colorScheme: "dark" }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#07111F" />
      </head>
      <body className="bg-[#07111F] text-white min-h-screen relative">
        {/* Background gradient blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-red-600/[0.04] blur-[120px]" />
          <div className="absolute top-[20%] -right-[15%] w-[60%] h-[60%] rounded-full bg-amber-500/[0.03] blur-[100px]" />
          <div className="absolute bottom-0 left-[30%] w-[40%] h-[40%] rounded-full bg-blue-600/[0.04] blur-[100px]" />
        </div>

        {/* Premium Navigation */}
        <nav className="sticky top-0 z-50 border-b border-white/[0.07]" style={{ background: "rgba(7,17,31,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
          <div className="max-w-5xl mx-auto px-4 h-14 flex justify-between items-center">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-sm shadow-glow-sm group-hover:scale-105 transition-smooth">
                🏏
              </div>
              <div>
                <span className="font-display font-bold text-white text-sm tracking-wide">IPL PREDICTION</span>
                <span className="hidden sm:inline text-gray-500 text-xs ml-1">2026</span>
              </div>
            </a>

            {/* Center: Live badge */}
            <div className="hidden sm:flex items-center gap-1.5 live-badge">
              <span className="live-dot" />
              SEASON LIVE
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-400 hidden sm:block">
                <span className="text-white font-semibold">2.1L+</span> predictions
              </div>
              <a
                href="/"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-smooth"
              >
                🏆 Play Now
              </a>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/[0.06] mt-16 py-8">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xs">
                  🏏
                </div>
                <span className="text-gray-500 text-sm font-semibold">IPL PREDICTION 2026</span>
              </div>
              <div className="text-center text-xs text-gray-600">
                <p>Free fan opinion poll — No money, no betting, pure cricket.</p>
                <p className="mt-1">© 2026 IPL Prediction. All rights reserved.</p>
              </div>
              <div className="flex gap-4 text-xs text-gray-600">
                <span>Privacy</span>
                <span>Terms</span>
                <span>Contact</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
