import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IPL Prediction 2026 - Beat The AI",
  description: "Predict IPL winners. Prove humans beat AI. Daily.",
  openGraph: {
    title: "IPL Prediction 2026",
    description: "Your cricket knowledge beats algorithms.",
    images: [
      {
        url: "https://iplprediction2026.in/og-image.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gray-50">
        <nav className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="text-xl font-bold text-gray-900">
              🏏 IPL PREDICTION
            </div>
            <div className="text-sm text-gray-600">Beat The AI</div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>

        <footer className="bg-white border-t border-gray-200 mt-12 py-6">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-600">
            <p>IPL Prediction 2026 — Free fan opinion poll. No money involved.</p>
            <p>© 2026. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
