# IPL Prediction 2026 — Agent Context

> Read this before touching any code. It will save you hours.

## What This Repo Is

A **mobile-first cricket prediction platform** at `iplprediction2026.in`. Users predict IPL match winners, compete against an AI, and climb a leaderboard. Zero money, pure bragging rights.

- **Live app:** `iplprediction2026.in` (Vercel)
- **Branch:** `claude/suspicious-bose` is the active feature branch; `main` is production
- **Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS v3 · Supabase · Framer Motion · Lucide React

## Monorepo Layout

```
Prediction-Platform/
├── ipl-prediction-2026/     ← The Next.js app (all code lives here)
│   └── CLAUDE.md            ← Detailed per-file agent context
├── 24_HOUR_MVP_EXECUTION_PLAN.md
└── README.md
```

**Always `cd ipl-prediction-2026` before running any npm/next commands.**

## Quick Start for a New Agent

```bash
cd ipl-prediction-2026
npm install
cp .env.local.example .env.local   # fill in Supabase keys
npm run dev                         # http://localhost:3000
npm test                            # 26 tests, all should pass
```

### Dev-mode shortcuts (no real Supabase needed)
- Leave `NEXT_PUBLIC_SUPABASE_URL` empty → app uses mock match data
- OTP bypass: any phone number, OTP = **`123456`** (only in `NODE_ENV !== "production"`)

## Active Branch & PR

Working branch: `claude/suspicious-bose`
Push all changes to this branch. The PR targets `main`.
