/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#EF4444",
        gold: "#F59E0B",
        surface: "rgba(255,255,255,0.04)",
        "surface-strong": "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space)", "system-ui", "sans-serif"],
      },
      animation: {
        "float": "float 4s ease-in-out infinite",
        "gradient-x": "gradientX 6s ease infinite",
        "live-ping": "livePing 1.4s ease-in-out infinite",
        "bar-grow": "barGrow 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "count-up": "countUp 0.6s ease-out forwards",
        "shimmer": "shimmer 2.5s linear infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        livePing: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(1.3)" },
        },
        barGrow: {
          from: { width: "0%" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(239,68,68,0.3)" },
          "50%": { boxShadow: "0 0 50px rgba(239,68,68,0.6), 0 0 80px rgba(239,68,68,0.2)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(40px) scale(0.95)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.85)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      boxShadow: {
        "glow-red": "0 0 40px rgba(239,68,68,0.3), 0 0 80px rgba(239,68,68,0.1)",
        "glow-gold": "0 0 40px rgba(245,158,11,0.3), 0 0 80px rgba(245,158,11,0.1)",
        "glow-sm": "0 0 20px rgba(239,68,68,0.2)",
        "card": "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      backgroundImage: {
        "hero-radial": "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(239,68,68,0.18) 0%, transparent 60%)",
        "card-shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
        "red-gradient": "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
        "gold-gradient": "linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)",
      },
    },
  },
  plugins: [],
};
module.exports = config;
