# IPL Prediction 2026 — MVP Build Context
> Last Updated: 2026-03-28 | Status: Code Complete, Needs npm install + env setup

---

## Project Overview
**Goal:** Launch iplprediction2026.in in 24 hours — a fan cricket prediction platform where users predict IPL match winners and compete against an AI.
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth)
**Deploy Target:** Vercel + custom domain

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | SSR + API routes in one project; Vercel-native |
| Database | Supabase | Built-in phone OTP auth, Postgres, real-time, free tier |
| Auth | Supabase phone OTP | No password friction; India mobile-first audience |
| Styling | Tailwind CSS | Rapid UI; no CSS files to manage |
| State | localStorage | No server sessions for MVP; simpler, faster to ship |
| AI predictions | Probability-weighted random | Real ML in V2; for MVP it creates the "vs AI" UX |
| Vote counts | Seed numbers (104k/60k) + real | Looks active on Day 1; real counts add on top |
| RLS | Enabled on all tables | Security from day 1; matches readable publicly |

---

## File Structure

```
ipl-prediction-2026/
├── app/
│   ├── page.tsx                    # Landing + match cards + prediction modal trigger
│   ├── layout.tsx                  # Root layout with nav + footer
│   ├── globals.css                 # Tailwind + custom animations
│   ├── components/
│   │   ├── Button.tsx              # Reusable button (primary/secondary/ghost)
│   │   ├── Card.tsx                # Card wrapper component
│   │   ├── MatchCard.tsx           # Match display card with BEAT THE AI CTA
│   │   └── PredictionModal.tsx     # Team selection popup modal
│   ├── signup/
│   │   └── page.tsx                # 3-step: phone → OTP → username
│   ├── results/
│   │   ├── page.tsx                # Suspense wrapper
│   │   └── ResultsContent.tsx      # Your pick vs AI + community counts + leaderboard
│   └── api/
│       ├── auth/
│       │   ├── send-otp/route.ts   # POST → Supabase signInWithOtp
│       │   └── verify-otp/route.ts # POST → verifyOtp + create user row
│       ├── predictions/route.ts    # POST create prediction, GET user predictions
│       ├── matches/route.ts        # GET all upcoming matches
│       └── leaderboard/route.ts    # GET top10 + user rank
├── lib/
│   ├── supabase.ts                 # Server-side client (service role key) + types
│   └── supabase-browser.ts         # Client-side client (anon key)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full schema: users, matches, predictions + RLS
├── .env.local.example              # Env vars template
├── package.json
├── tailwind.config.js         ← Must be .js (PostCSS can't read .ts)
├── postcss.config.js          ← Must be .js (same reason)
├── tsconfig.json
└── next.config.mjs            ← Must be .mjs (Next.js 14.1 rejects .ts)
```

---

## User Flow

```
/ (Landing)
  └─ Click "BEAT THE AI" on match card
       ├─ Not logged in → /signup
       │    └─ Phone → OTP → Username → /results?match_id=X
       └─ Logged in → Prediction modal
            └─ Select team → POST /api/predictions → /results?match_id=X

/results?match_id=X
  ├─ Your pick vs AI pick card
  ├─ Community vote counts (seeded + real)
  └─ Leaderboard tab (top 10 + your rank)
```

---

## Key Implementation Notes

### Auth Flow
- Supabase `signInWithOtp(phone)` sends SMS
- `verifyOtp` called on account creation (step 3 of signup)
- `user_id` stored in `localStorage` — MVP simplification (no cookies/sessions)
- Server API routes use **service role key** to bypass RLS for writes

### AI Prediction Logic (MVP)
```typescript
// Weighted random based on historical probability in match data
const aiPredictedTeam =
  Math.random() > match.team_1_probability / 100
    ? match.team_1
    : match.team_2;
```
V2 upgrade: integrate real ML model or CricAPI data.

### Vote Count Display
Initial seed values (104k for team 1, 60k for team 2) are stored in the DB.
Real prediction counts are added on top. This gives social proof on launch day.

### RLS Policies
- `matches` — public read
- `predictions` — users read/insert own only (`auth.uid() = user_id`)
- `users` — users read own only

---

## Setup Checklist (To Run Locally)

1. **Install dependencies**
   ```bash
   cd ipl-prediction-2026
   npm install
   ```

2. **Create Supabase project**
   - Go to https://supabase.com → New project
   - Copy: Project URL, Anon Key, Service Role Key

3. **Set environment variables**
   ```bash
   cp .env.local.example .env.local
   # Fill in your Supabase credentials
   ```

4. **Run DB migration**
   ```bash
   # Option A: Paste SQL into Supabase SQL Editor
   # Option B: Use Supabase CLI
   supabase db push
   ```

5. **Enable Phone Auth in Supabase**
   - Dashboard → Authentication → Providers → Phone → Enable
   - Configure Twilio (or use test mode for dev)

6. **Start dev server**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

---

## Deploy Checklist

1. Push to GitHub
2. Connect repo to Vercel
3. Set env vars in Vercel dashboard (same as .env.local)
4. Deploy → automatic
5. Add custom domain `iplprediction2026.in` in Vercel Settings → Domains
6. Update DNS at registrar → point to Vercel nameservers

---

## V1.1 Backlog (Next 48 Hours)

- [ ] Real cricket API (CricAPI) for live match data
- [ ] Admin panel to update match results + trigger scoring
- [ ] Recharts probability bar chart with Framer Motion animation
- [ ] Email/WhatsApp share card (OG image generation)
- [ ] Push notifications when results are out
- [ ] Supabase Realtime for live vote count updates
- [ ] Better error states + loading skeletons

---

## Critical Decisions Log

| Date | Decision | Alternative Considered | Outcome |
|---|---|---|---|
| 2026-03-28 | localStorage for user session | Next-Auth / Supabase sessions | Faster MVP; upgrade to proper sessions in V1.1 |
| 2026-03-28 | Seed vote counts in DB | Start from 0 | Better social proof on Day 1 |
| 2026-03-28 | Weighted-random AI prediction | Static team | Creates genuine "vs AI" narrative |
| 2026-03-28 | Suspense wrapper for results page | Direct useSearchParams | Required by Next.js App Router for searchParams in client components |
| 2026-03-28 | Service role key in API routes | RLS with JWT | Simpler for MVP; all writes go through server routes anyway |
