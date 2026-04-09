# IPL Prediction 2026

> **Can a cricket fan outpredict an AI?**
> India's free fan prediction platform for IPL 2026. Pick match winners, beat the AI model, earn points, and climb the leaderboard. No money. No betting. Pure cricket instinct.

**Live:** [iplprediction2026.in](https://iplprediction2026.in)

---

## Product Overview

IPL Prediction 2026 is a mobile-first, zero-money cricket prediction contest built around one question: *can a passionate cricket fan outpredict an AI model?*

Before every IPL 2026 match, users lock in their winner prediction. The platform reveals the AI's pick simultaneously. After the result, points are awarded — with a bonus for beating the AI on the same match. The season-long leaderboard ranks all fans against each other.

**Target audience:** Indian cricket fans on mobile. No friction — no app download, no real money, OTP login only.

---

## User Flow

```
Guest visits iplprediction2026.in
        │
        ▼
[Home] Browse upcoming IPL matches
  │   See AI win probabilities on each match card
  │   View community vote bar (who's backing who)
  │
  ├── Guest clicks "BEAT THE AI"
  │       │
  │       ▼
  │   [Signup] Phone number → OTP → Username + team
  │       │   (match context preserved — returns to vote)
  │       ▼
  │   Redirect back → Prediction modal auto-opens
  │
  └── Logged-in user clicks "BEAT THE AI"
          │
          ▼
      [Prediction Modal]
        Pick Team 1 or Team 2
        See AI's analysis (bookmaker odds + crowd vote hybrid)
        Lock in prediction before match starts
          │
          ▼
      [Results Page]
        YOU vs AI result card
        Points awarded (pending until result confirmed)
        Community pulse bar
        Share to WhatsApp / Twitter
          │
          ▼
      [Leaderboard]
        All-time & weekly rankings
        Your rank, accuracy, beat-AI count, streak
        Rival card (fan closest to your rank)
        Invite friends for +500 pts each
```

---

## Features

### Core Prediction Loop
- **Match cards** — upcoming, live, and completed tabs; AI win probabilities; community vote bars; live countdown timer
- **Prediction modal** — pick winner before match starts; AI analysis (bookmaker odds 60% + fan votes 40%); team colour theming
- **Results page** — YOU vs AI result; correct/wrong/pending status; points earned; WhatsApp + Twitter share
- **Voting rules** — one prediction per match per user; locks at match start time; no changes after submission

### Points & Scoring
| Event | Points |
|---|---|
| Correct prediction | 1,000 pts |
| Correct underdog prediction | 1,500 pts |
| Beat the AI's pick on the same match | +500 bonus |
| Daily Trivia correct answer | +100 pts |
| Referral — you + invited friend | +500 pts each |

### Engagement Features
- **Leaderboard** — all-time and weekly periods; live rank delta (↑/↓ vs last visit); top 10 + your standing
- **Rival card** — auto-matched to the fan closest above/below your rank for competitive motivation
- **Achievement badges** — unlocked for milestones: first correct pick, 5-match streak, top 10 rank, beat AI 3×, etc.
- **Weekly Recap** — summary card every week: correct/wrong/pts/beat-AI count with WhatsApp share
- **Daily Trivia** — one cricket question per day; collapses after answering; guest gate
- **Streak tracker** — current correct-pick streak; streak-at-risk banner when a match closes in <6h
- **Favourite team nudge** — personalised banner when your team's next match has an open prediction window
- **Referral program** — shareable invite link; both parties earn 500 pts on signup
- **Match preview pages** — dedicated SEO page per match with venue analysis, key players, AI odds, community votes, full FAQ

### Mobile-First Design

The platform is designed and tested for Indian mobile users first. Every screen is audited at 320px (iPhone SE), 375px (iPhone 14), 768px (iPad), and 1280px (laptop).

| Component | Mobile behaviour | Desktop behaviour |
|---|---|---|
| **Prediction Modal** | Slides up as bottom sheet from bottom of screen | Centred dialog (440px wide) |
| **Submit button** | Sticky footer — always visible, never scrolled out of view | Same sticky footer |
| **Bottom Nav** | Fixed, 3 tabs: Home / My Picks / Leaderboard | Hidden — desktop uses top nav links |
| **Tab bar (Home)** | `text-xs`, count badges hidden to avoid overflow at 320px | `text-sm`, badges visible |
| **Stats grids** | 2 columns (WeeklyRecap, About points) | 4 columns |
| **NavBar logo** | Icon only below 380px — text hides to prevent overflow | Full "IPL PREDICTION 2026" |
| **iOS safe area** | `calc(1.25rem + env(safe-area-inset-bottom))` on modal footer | n/a |

Breakpoints: Tailwind default — `sm: 640px`, `md: 768px`, `lg: 1024px`. Custom: `min-[380px]:` for the nav logo edge case.

### SEO

- **Sitemap** (`/sitemap.xml`) — dynamic, pulls match slugs from Supabase; upcoming matches get `priority: 0.95 / hourly`, live `1.0 / always`, completed `0.6 / weekly`
- **Match preview pages** (`/predict/[slug]`) — SSG with `generateStaticParams`; server-rendered venue analysis, key players, full FAQ for reliable Google indexing
- **JSON-LD schemas** — WebSite, SportsOrganization (root layout), SportsEvent (match pages), FAQPage + HowTo + BreadcrumbList (about + match pages)
- **llms.txt** — AI crawler identity file at `/public/llms.txt` describing the platform for LLM indexers
- **Canonical + robots** — noindex on `/results` (user-specific), `/privacy`, `/terms`; canonical on all other pages
- **OG + Twitter cards** — full metadata on leaderboard, about, match preview, and home pages

### Guest Experience
- Browse all matches without an account
- Guest hero banner explains the platform value prop
- Clicking "BEAT THE AI" saves match context → redirects to signup → returns to vote after auth
- Leaderboard shows a ghost row ("this could be you") for guests
- Daily Trivia shows question but gates submission behind signup CTA

### Admin Panel (`/admin`)
- Protected by `ADMIN_SECRET` env variable
- **Add Match** form — team picker (all 10 IPL teams), venue picker (12 IPL venues), match date/time (IST), AI probability slider with live validation
- **Score Results** — mark winner for completed matches; triggers point calculation for all predictions
- **Upcoming Fixtures** — view-only list of scheduled matches
- **Needs Result** — matches that have started but not yet been scored (match_date ≤ now)

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14.1 (App Router) | Server + Client components, `generateMetadata`, `generateStaticParams` |
| Language | TypeScript (strict) | All files `.tsx` / `.ts` |
| Styling | Tailwind CSS v3 | Dark "Night Stadium" theme, glassmorphism utilities |
| Database | Supabase (Postgres) | Mumbai region (ap-south-1), `maybeSingle()`, RPC functions |
| Auth | Supabase Phone OTP | Dev bypass: any number, OTP `123456` |
| Animations | CSS keyframes + Framer Motion | Framer installed; CSS preferred for performance |
| Analytics | Vercel Analytics + PostHog | Page views + custom events (`beat_ai_clicked`, `prediction_submitted`) |
| Deployment | Vercel | Auto-deploy from `main`; root dir `ipl-prediction-2026` |
| Testing | Jest + Testing Library | 26 tests across API routes and signup flow |
| Icons | Lucide React + emojis | |
| Fonts | Space Grotesk (display) + Inter (body) | Via `next/font/google` |

---

## Project Structure

```
Prediction-Platform/
├── ipl-prediction-2026/          # Next.js app (all code lives here)
│   ├── app/
│   │   ├── layout.tsx            # Root layout: nav, footer, fonts, background blobs
│   │   ├── page.tsx              # Home: server fetch + HomeClient dynamic import
│   │   ├── globals.css           # Dark theme, glassmorphism, modal CSS, animations
│   │   ├── about/page.tsx        # SEO page: HowTo + FAQPage + BreadcrumbList schemas
│   │   ├── admin/                # Admin panel (ADMIN_SECRET protected)
│   │   ├── leaderboard/          # Leaderboard page + LeaderboardContent client
│   │   ├── login/page.tsx        # Phone + username login
│   │   ├── predict/[slug]/       # Match preview pages (SSG, SEO-optimised)
│   │   ├── privacy/page.tsx      # Privacy policy
│   │   ├── results/              # Prediction history + YOU vs AI result
│   │   ├── signup/page.tsx       # 3-field signup: name + phone + username
│   │   ├── terms/page.tsx        # Terms of use
│   │   ├── api/                  # API routes
│   │   │   ├── admin/matches/    # POST — add new match
│   │   │   ├── auth/             # login, logout, register, send-otp, verify-otp
│   │   │   ├── leaderboard/      # GET — top 10 + user rank + rival + weekly stats
│   │   │   ├── matches/          # GET — all matches (mock fallback when no Supabase)
│   │   │   ├── predictions/      # POST create, GET user history, GET counts
│   │   │   ├── trivia/           # GET question, POST answer
│   │   │   └── weekly-draw/      # Weekly pool draw logic
│   │   ├── components/
│   │   │   ├── BottomNav.tsx     # Mobile bottom nav (Home / My Picks / Leaderboard)
│   │   │   ├── DailyTrivia.tsx   # Collapsible trivia card with guest gate
│   │   │   ├── HomeClient.tsx    # Match list, tab bar, modals, banners
│   │   │   ├── InviteCard.tsx    # Referral link + WhatsApp share
│   │   │   ├── MatchCard.tsx     # Match card: teams, countdown, vote bar, CTA
│   │   │   ├── PredictionModal.tsx # Bottom sheet / dialog with sticky submit footer
│   │   │   ├── ResultMatchCard.tsx # Completed match card with community result
│   │   │   ├── RivalCard.tsx     # Head-to-head vs closest rival
│   │   │   ├── WeeklyRecap.tsx   # Weekly stats summary with share
│   │   │   └── ...others
│   │   └── lib/
│   │       ├── badges.ts         # Badge definitions + unlock logic
│   │       ├── players.ts        # Key players per IPL team
│   │       ├── teams.ts          # TEAM_CONFIG: colors, emoji, gradients
│   │       └── venues.ts         # 12 IPL venues: pitch, capacity, conditions
│   ├── lib/
│   │   ├── supabase.ts           # Server client (SERVICE_ROLE_KEY)
│   │   ├── supabase-browser.ts   # Browser client (ANON_KEY)
│   │   ├── matchSlug.ts          # matchToSlug() — "csk-vs-mi-match-1"
│   │   └── mlPredictions.ts      # computeHybridProb() — 60% odds + 40% crowd
│   ├── supabase/migrations/      # 12 SQL migrations (run in order)
│   └── __tests__/                # Jest tests
├── CLAUDE.md                     # Agent context (read before touching code)
└── README.md                     # This file
```

---

## Database Schema (key tables)

```sql
users          — id, phone (unique), username (unique), name, city, favorite_team, created_at
matches        — id, match_number, team_1, team_2, venue, city, match_date, status,
                 team_1_probability, team_2_probability,
                 initial_count_team_1, initial_count_team_2, winner
predictions    — id, user_id → users, match_id → matches,
                 predicted_team, ai_predicted_team,
                 is_correct (null → bool after scoring), points_earned, created_at
trivia_answers — id, user_id, question_id, selected, is_correct, answered_at
referrals      — referrer_id, referred_id, points_awarded, created_at
```

The `users_leaderboard` view computes `total_points`, `total_predictions`, `total_correct`, `win_percentage`, `beat_ai_count`, `current_streak`, `rank` from the predictions table.

---

## Local Development

### Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) project (or run offline — see Mock Mode below)

### Setup

```bash
# 1. Clone and navigate to the app
git clone https://github.com/Kingbond470/Prediction-Platform.git
cd Prediction-Platform/ipl-prediction-2026

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

**.env.local variables:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_SECRET=generate-with-openssl-rand-hex-32
ODDS_API_KEY=your-odds-api-key          # optional
NEXT_PUBLIC_POSTHOG_KEY=phc_...         # optional — disables PostHog if empty
```

### Run Database Migrations

In the Supabase SQL Editor, run migrations in order:

```
supabase/migrations/
  001_initial_schema.sql
  003_add_odds_api_id.sql
  004_weekly_voucher.sql
  005_user_preferences.sql
  006_fix_leaderboard_view.sql
  007_leaderboard_beat_ai.sql
  008_user_streaks.sql
  009_realistic_seed_counts.sql
  010_daily_trivia.sql
  011_trivia_points_in_leaderboard.sql
  012_referral.sql
```

Also enable **Phone Auth** in Supabase → Authentication → Providers → Phone.

### Start Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### Mock Mode (no Supabase needed)

Leave `NEXT_PUBLIC_SUPABASE_URL` empty in `.env.local`. The app automatically uses mock match data with future-dated fixtures. Everything works end-to-end except leaderboard and prediction persistence.

**Dev OTP bypass:** Any phone number + OTP `123456` creates/logs in a user. Only active when `NODE_ENV !== "production"`.

---

## Testing

```bash
npm test                 # Run all 26 tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

| Test file | Environment | Coverage |
|---|---|---|
| `__tests__/api/matches.test.ts` | node | Supabase data, mock fallback, stale refresh |
| `__tests__/api/auth.test.ts` | node | send-otp, verify-otp, dev bypass, wrong OTP |
| `__tests__/components/SignupFlow.test.tsx` | jsdom | All 3 steps, localStorage, router, errors |

---

## Deployment

The app auto-deploys to Vercel on every push to `main`.

**Vercel settings:**
- Root directory: `ipl-prediction-2026`
- Framework preset: Next.js
- Set all env variables from `.env.local.example` in Vercel Dashboard → Settings → Environment Variables

**Domain:** `iplprediction2026.in` (primary). `iplprediction2026.com` redirects to `.in` via `next.config.mjs`.

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| `next.config.mjs` (not `.ts`) | Next.js 14.1 crashes on TypeScript config |
| `tailwind.config.js` (not `.ts`) | PostCSS silently ignores TS config → no styles applied |
| `localStorage` for auth state | MVP simplicity; V1.1 should migrate to Supabase sessions + httpOnly cookies |
| Check `match_date` not `vote_end_time` | `vote_end_time` can be stale; `match_date` is the authoritative voting cutoff |
| CSS class system for modal positioning | Inline `translate(-50%)` breaks mobile bottom-sheet positioning |
| Mock data fallback | Lets the app run fully offline for development and demos |
| `noindex` on `/results`, `/privacy`, `/terms` | Results are user-specific (query-string); legal pages don't add search value |

---

## Scoring & AI Model

The AI prediction is computed from two signals:

- **60% weight — Bookmaker odds** (`team_1_probability` stored on each match, sourced from The Odds API)
- **40% weight — Fan vote distribution** (seeded initial counts + real votes via `computeHybridProb()`)

The hybrid probability determines the AI's pick. Users who pick the opposite team and are correct earn the +500 "Beat the AI" bonus on top of their correct-prediction points.

---

## Changelog

### 2026-04-09 — Responsive Design Audit (`e585133`)
- **PredictionModal**: sticky action footer — submit button never scrolls out of view on any device
- **Tab bar**: `text-xs sm:text-sm` labels + count badges hidden on mobile — fixes 320px overflow
- **WeeklyRecap**: stats grid `grid-cols-2 sm:grid-cols-4` — was 4 columns, cramped at 320px
- **MatchCard**: header `items-start` + `shrink-0` countdown — badges no longer misalign timer when wrapping
- **ResultMatchCard**: "Humans Win!" scales `text-sm sm:text-lg` — prevents overflow in 3-column row
- **NavBar**: logo text `hidden min-[380px]:inline` — icon only below 380px, nav never overflows
- **Leaderboard**: "Updated X ago" `hidden sm:inline` — header row stays clean on mobile
- **README**: full rewrite — user flow, feature list, tech stack, DB schema, setup guide, changelog

### 2026-04-08 — SEO & Meta Tags (`213959d`)
- Sitemap updated with all pages, per-status priorities, and dynamic match slugs
- llms.txt rewritten with correct scoring, all features, and key page URLs
- noindex added to `/results`, `/privacy`, `/terms`
- Full OG + Twitter card meta added to leaderboard page
- Match preview pages enriched: venue analysis, key players (server-rendered), 6-question FAQ, BreadcrumbList schema, internal links

### 2026-04-07 — About Page + Match Preview SEO (`1350da8`, `ee361c8`)
- `/about` page with HowTo, FAQPage (8 Qs), BreadcrumbList JSON-LD schemas
- Added to desktop nav and footer
- `/predict/[slug]` server-rendered sections: venue analysis (pitch type, capacity, avg score), key players, expanded FAQ, internal links to leaderboard and about

### 2026-04-06 — Tab Order + UX Polish (`639a84a`)
- Tab order changed to Upcoming → Live → Results (matches the user's primary intent)
- Removed auto-jump to Live tab — Upcoming is always the landing tab
- Live tab shows a pulsing dot when matches are live (not on the active tab)

### 2026-04-05 — QA Bug Fixes (`3a9b84d`)
- BUG-02: Admin datetime-local value now appends `:00+05:30` (IST) before sending to API
- BUG-03: Changing Team 1 in Add Match form clears Team 2 to prevent invalid state
- BUG-04: Guest banner no longer flashes for logged-in users (lazy `useState` initializer)
- BUG-05: `selectedMatchTeams` cleared when modal reopens and on signup success
- BUG-07: Copy invite link now shows "Copied!" feedback for 2 seconds
- BUG-08: Admin splits pending matches into "Needs Result" (started) vs "Upcoming" (future)

### 2026-04-04 — Admin Add Match Form (`0313900`)
- Full Add Match form in `/admin`: team picker (10 IPL teams), venue picker (12 IPL venues), IST datetime, probability slider with validation
- `POST /api/admin/matches` with server-side validation: team uniqueness, probability sum = 100, no duplicate match numbers
- Admin splits matches into "Needs Result" and "Upcoming Fixtures" sections

### 2026-04-03 — Guest Flow Optimisation (`9d2227d`)
- Guest hero banner on Home explaining the value prop with 3 bullet points and signup CTA
- Match context preserved: guest predict → signup → returns to vote (via `selectedMatchId` + `selectedMatchTeams`)
- DailyTrivia gated for guests — question shown, answer buttons disabled, amber signup CTA shown
- Leaderboard ghost row for guests ("this could be you → Join Free")

### 2026-03-30 — Referral Program
- `?ref=` URL param reading on signup page
- InviteCard component in leaderboard page — shareable link + WhatsApp share
- Referral bonus: +500 pts for both referrer and referred user on signup
- `referrals` table (migration 012) + API logic in `/api/auth/register`

---

## Backlog (V1.1)

- [ ] Real cricket API (CricAPI / Cricbuzz) for live scores and automatic result detection
- [ ] OG image generation (`@vercel/og`) for WhatsApp share previews with match branding
- [ ] Supabase Realtime — live vote count updates without page refresh
- [ ] Push notifications (web push / WhatsApp) when match results are posted
- [ ] Migrate localStorage auth → Supabase sessions + httpOnly cookies
- [ ] Animated probability chart (Recharts) on match preview and results pages
- [ ] MSG91 / 2Factor.in OTP for faster India SMS (alternative to Twilio + DLT)
- [ ] Tournament winner prediction — season-long outright pick for a grand prize

---

## Contact

- Website: [iplprediction2026.in](https://iplprediction2026.in)
- Email: hello@iplprediction2026.in
- Issues: open a GitHub issue on this repo
