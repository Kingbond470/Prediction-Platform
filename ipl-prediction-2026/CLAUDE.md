# IPL Prediction 2026 — Developer & Agent Context

> **For Claude Code agents:** This file is your complete guide to this codebase.
> Read every section before making changes.

---

## Project Overview

**iplprediction2026.in** — India's fan cricket prediction platform.
Users pick IPL match winners, see the AI's pick, and compete on a leaderboard.
No money, no betting — pure cricket knowledge.

**Live domains:** `iplprediction2026.in` (primary) · `iplprediction2026.com` (redirects to .in)
**Hosting:** Vercel (auto-deploy from `main`)
**DB:** Supabase (Postgres, Mumbai region)

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14.1 App Router | `app/` directory, Server + Client components |
| Language | TypeScript (strict) | All files `.tsx` / `.ts` |
| Styling | Tailwind CSS v3 | Config: `tailwind.config.js` (must be `.js`, not `.ts`) |
| CSS | `globals.css` | Dark theme, glassmorphism utilities, modal CSS |
| Fonts | `next/font/google` | Space Grotesk (display) + Inter (body) via CSS vars |
| Animations | CSS keyframes + Framer Motion | Framer available but mostly CSS for perf |
| Icons | Lucide React + emojis | `lucide-react` installed |
| Charts | Recharts | Installed, not used yet (V1.1 backlog) |
| Database | Supabase (Postgres) | `@supabase/supabase-js` |
| Auth | Supabase phone OTP | Production only; dev has bypass |
| Testing | Jest + Testing Library | `npm test`, 26 tests pass |
| Deploy | Vercel | Root dir: `ipl-prediction-2026` |

---

## Critical Config Files

```
tailwind.config.js      ← Must be .js (PostCSS can't read .ts)
postcss.config.js       ← Must be .js (same reason)
next.config.mjs         ← Must be .mjs (Next.js 14.1 rejects .ts)
```

> ⚠️ **Never rename these to `.ts`** — the build will silently fail with no Tailwind styles.

---

## File Structure

```
ipl-prediction-2026/
├── app/
│   ├── globals.css                 # Dark theme, glassmorphism, modal CSS, animations
│   ├── layout.tsx                  # Root layout: nav, footer, Google Fonts, bg blobs
│   ├── page.tsx                    # Home: hero, match list (server component + dynamic import)
│   ├── lib/
│   │   └── teams.ts                # TEAM_CONFIG: colors, emoji, gradients for all 10 IPL teams
│   ├── components/
│   │   ├── Button.tsx              # Primary/secondary/ghost/danger + loading state
│   │   ├── Card.tsx                # Glassmorphism card wrapper
│   │   ├── HomeClient.tsx          # Client shell for home (useRouter, modal state, localStorage)
│   │   ├── MatchCard.tsx           # Match card: team badges, countdown, vote bar, CTA
│   │   ├── PredictionModal.tsx     # Bottom sheet (mobile) / centered dialog (desktop)
│   │   ├── TeamBadge.tsx           # Team emoji badge with team-color border + glow
│   │   └── CountdownTimer.tsx      # Live HH:MM:SS / Xd Xh / LIVE NOW display
│   ├── signup/
│   │   └── page.tsx                # 3-step signup: phone → OTP → username
│   ├── results/
│   │   ├── page.tsx                # Suspense wrapper (required for useSearchParams)
│   │   └── ResultsContent.tsx      # You vs AI, community pulse, share, leaderboard
│   └── api/
│       ├── auth/
│       │   ├── send-otp/route.ts   # POST /api/auth/send-otp
│       │   └── verify-otp/route.ts # POST /api/auth/verify-otp
│       ├── matches/route.ts        # GET /api/matches
│       ├── predictions/route.ts    # POST + GET /api/predictions
│       └── leaderboard/route.ts    # GET /api/leaderboard
├── lib/
│   ├── supabase.ts                 # Server Supabase client (SERVICE_ROLE_KEY)
│   └── supabase-browser.ts         # Browser Supabase client (ANON_KEY)
├── __tests__/
│   ├── api/matches.test.ts         # 5 tests — @jest-environment node
│   ├── api/auth.test.ts            # 8 tests — @jest-environment node
│   └── components/SignupFlow.test.tsx  # 13 tests — jsdom
├── supabase/
│   └── migrations/001_initial_schema.sql
├── .env.local.example
├── jest.config.js
├── jest.setup.ts
├── next.config.mjs                 # Security headers, .com→.in redirects
├── tailwind.config.js
└── postcss.config.js
```

---

## Environment Variables

```bash
# .env.local — copy from .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only, never expose to client
NEXT_PUBLIC_SITE_URL=https://iplprediction2026.in
```

**Without Supabase vars:** The `/api/matches` route returns mock match data with future dates automatically. The app runs fully in offline/dev mode.

---

## Design System

### Theme: Night Stadium (Dark)

```
Background:   #07111F  (deep navy)
Card bg:      rgba(255,255,255,0.04) with backdrop-blur (glassmorphism)
Border:       rgba(255,255,255,0.08)
Text primary: #F9FAFB
Text muted:   #9CA3AF
Accent red:   #EF4444  (primary brand)
Gold:         #F59E0B  (trophy, highlights)
Green:        #10B981  (success, correct picks)
```

### CSS Utilities (globals.css)

| Class | Use |
|---|---|
| `.glass` | Frosted glass card (low opacity) |
| `.glass-strong` | Stronger glass (overlays, highlighted cards) |
| `.text-gradient` | Red gradient text (hero headline) |
| `.text-gradient-gold` | Gold gradient text (points, rank) |
| `.live-badge` | Live pill with pulsing dot |
| `.live-dot` | Pulsing red dot only |
| `.shimmer-bg` | Skeleton loading state |
| `.modal-container` | Responsive modal (bottom sheet mobile / dialog desktop) |
| `.modal-visible / .modal-hidden` | Show/hide modal with animation |
| `.no-scrollbar` | Hide scrollbar cross-browser |
| `.transition-smooth` | `transition-all 300ms cubic-bezier(0.16,1,0.3,1)` |

### Team Colors (`app/lib/teams.ts`)

All IPL team configs live here. Use `getTeamConfig(teamName)` anywhere:

```typescript
import { getTeamConfig } from "@/app/lib/teams";
const cfg = getTeamConfig("CSK");
// cfg.color = "#F9CD1C"  (gold)
// cfg.bg    = "#1A1200"
// cfg.emoji = "🦁"
// cfg.gradient = "linear-gradient(135deg, #F9CD1C22, #F9CD1C08)"
// cfg.textColor = "#F9CD1C"
```

Supported: `CSK, MI, RCB, KKR, DC, SRH, PBKS, RR, GT, LSG`
Unknown teams fall back to red/generic config.

### Tailwind Custom Tokens

```
font-display           → Space Grotesk (bold headlines)
font-sans              → Inter (body text)
shadow-glow-red        → 0 0 40px rgba(239,68,68,0.3)
shadow-glow-gold       → 0 0 40px rgba(245,158,11,0.3)
animate-float          → gentle up/down float (4s)
animate-live-ping      → pulsing dot animation
animate-shimmer        → skeleton loading shimmer
bg-hero-radial         → radial glow behind hero text
```

---

## Key Architecture Patterns

### 1. Server Components + Client Shell

`app/page.tsx` is an **async server component** — it fetches matches server-side to avoid client-fetch issues in preview environments:

```typescript
// page.tsx (server)
export default async function HomePage() {
  const matches = await getMatches(); // server-side fetch
  return <HomeClient initialMatches={matches} />;  // passes to client
}
```

`HomeClient.tsx` is loaded via `next/dynamic` with `ssr: false` to prevent SSR of components using `useRouter`:

```typescript
const HomeClient = dynamic(() => import("./components/HomeClient"), { ssr: false });
```

> ⚠️ **Never add `useRouter`, `usePathname`, or `useSearchParams` to server components.** Wrap in `"use client"` + `<Suspense>` if needed.

### 2. Prediction Modal — Responsive Positioning

The modal uses a **pure CSS class system** (not inline transforms) to be responsive:

- **Mobile:** `position: fixed; bottom: 0; left: 0; right: 0` — bottom sheet, slides up
- **Desktop (sm+):** `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)` — centered dialog

Classes are in `globals.css`:
```css
.modal-container          /* positioning */
.modal-visible            /* translateY(0) on mobile, translate(-50%,-50%) on desktop */
.modal-hidden             /* translateY(100%) on mobile, scale(0.95) on desktop */
```

> ⚠️ **Do NOT use inline `style={{ transform: "translate(-50%,...)" }}` on the modal.** It breaks mobile positioning. Use the CSS class system only.

### 3. Dev Auth Bypass

`NODE_ENV !== "production"` triggers the bypass:
- `send-otp` returns success immediately (no real SMS)
- `verify-otp` accepts OTP `"123456"` and creates/looks up user by phone
- Dev user IDs are deterministic UUID v4 derived from the phone number hash

This is automatically disabled on Vercel (`NODE_ENV=production`).

### 4. Voting Window Check

Voting is open when **both**:
1. `match.status === "upcoming"`
2. `new Date() < new Date(match.match_date)`

> ⚠️ **Do NOT use `vote_end_time`** — it can be stale. Always check `match_date` as source of truth. This applies in both `MatchCard.tsx` and `/api/predictions/route.ts`.

### 5. Mock Data Fallback

`/api/matches` checks `process.env.NEXT_PUBLIC_SUPABASE_URL`:
- **Not set:** returns `getMockMatches()` with future-dated matches
- **Set but all matches are stale:** auto-updates match dates in DB + returns refreshed data

This means the app works end-to-end locally with zero Supabase setup.

### 6. User State Storage

User ID and username are stored in `localStorage`:
```typescript
localStorage.setItem("userId", data.user_id);
localStorage.setItem("username", username);
```

`HomeClient.tsx` reads `localStorage` in `useEffect` (client-only) to handle the post-signup redirect flow:
- Stores `selectedMatchId` before redirecting to `/signup`
- On return to home, auto-opens the prediction modal for that match

> This is an MVP simplification. V1.1 should migrate to Supabase sessions / httpOnly cookies.

---

## API Routes Reference

### `GET /api/matches`
Returns all upcoming matches. Falls back to mock data if Supabase URL unset. Auto-refreshes stale match dates.

**Response:** `{ success: true, matches: Match[] }`

### `POST /api/predictions`
Creates a prediction. Validates: match is upcoming, hasn't started, user hasn't already predicted.
Also generates the AI prediction (weighted random based on `team_1_probability`).

**Body:** `{ user_id, match_id, predicted_team }`
**Response:** `{ success: true, prediction, updated_counts }`

### `GET /api/predictions?user_id=X`
Returns all predictions for a user.

### `POST /api/auth/send-otp`
Sends OTP to phone. Dev: returns immediately. Prod: calls `supabase.auth.signInWithOtp`.

**Body:** `{ phone: "+91XXXXXXXXXX" }`

### `POST /api/auth/verify-otp`
Verifies OTP + creates user row. Dev: accepts `"123456"`. Prod: calls `supabase.auth.verifyOtp`.

**Body:** `{ phone, otp, name, username }`
**Response:** `{ success: true, user_id }`

### `GET /api/leaderboard?user_id=X`
Returns top 10 users + requesting user's rank.

---

## Database Schema

```sql
-- users
id          uuid PRIMARY KEY
phone       text UNIQUE
username    text UNIQUE
name        text
created_at  timestamptz

-- matches
id                    uuid PRIMARY KEY
match_number          int
team_1                text   -- e.g. "CSK"
team_2                text   -- e.g. "RCB"
venue                 text
city                  text
match_date            timestamptz  -- source of truth for voting window
status                text         -- "upcoming" | "live" | "completed"
team_1_probability    int          -- 0-100, AI win probability
team_2_probability    int
initial_count_team_1  int          -- seed vote count for social proof
initial_count_team_2  int
winner                text         -- null until result

-- predictions
id                  uuid PRIMARY KEY
user_id             uuid REFERENCES users
match_id            uuid REFERENCES matches
predicted_team      text
ai_predicted_team   text
is_correct          boolean  -- null until result, true/false after
points_earned       int      -- null until scoring runs
created_at          timestamptz

-- users_leaderboard (VIEW or materialized)
-- Computed from predictions: total_points, total_predictions, total_correct, win_percentage, rank
```

---

## Running Tests

```bash
npm test                    # run all 26 tests
npm run test:watch          # watch mode
npm run test:coverage       # coverage report
```

**Test layout:**

| File | Env | Tests |
|---|---|---|
| `__tests__/api/matches.test.ts` | `node` | 5 — Supabase data, mock fallback, errors, stale refresh |
| `__tests__/api/auth.test.ts` | `node` | 8 — send-otp, verify-otp, dev bypass, wrong OTP |
| `__tests__/components/SignupFlow.test.tsx` | `jsdom` | 13 — all 3 steps, localStorage, router, errors |

> ⚠️ API route tests **must** have `@jest-environment node` at the top. The Web `Request` API is not available in jsdom.

> ⚠️ Mock `@/lib/supabase` **before** importing the route under test:
> ```typescript
> jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
> import { GET } from "@/app/api/matches/route";
> const mockFrom = supabase.from as jest.Mock; // after import
> ```

---

## Common Gotchas & Workarounds

| Gotcha | Solution |
|---|---|
| `useRouter` in server component → crash | Wrap in `"use client"` + dynamic import with `ssr: false` |
| Tailwind styles not applying | Config must be `.js` not `.ts`. Clear `.next/cache` after changing. |
| Modal cut off on mobile | Use `.modal-container` CSS class, never inline `translate(-50%)` |
| OTP fails in production | Supabase phone auth needs Twilio configured + DLT registration for India |
| Vote shows "closed" prematurely | Check `match_date`, never `vote_end_time` (can be stale) |
| UUID rejected by Postgres | Dev UUIDs must be valid RFC-4122 v4 format |
| `useSearchParams` without Suspense | Wrap page in `<Suspense>` boundary |
| Dark mode OS override | `color-scheme: dark` in html + `<meta name="color-scheme" content="dark">` |
| iOS safe area overlap | `viewport-fit=cover` in meta + `env(safe-area-inset-bottom)` in modal CSS |

---

## What's Working (as of 2026-03-28)

- ✅ Full signup flow: phone → OTP → username (dev bypass with `123456`)
- ✅ Match cards with live countdown timers, team colors, community vote bars
- ✅ Prediction modal: bottom sheet on mobile, centered dialog on desktop
- ✅ Results page: YOU vs AI, animated community pulse bars, share buttons
- ✅ Leaderboard: top 10 + user rank
- ✅ Dark premium UI: glassmorphism, team color accents, Space Grotesk font
- ✅ Mobile responsive: tested at 375px (iPhone SE)
- ✅ 26 Jest tests passing
- ✅ Production config: security headers, .com→.in redirects, OG meta

---

## Backlog (V1.1)

- [ ] Real cricket API (CricAPI / Cricbuzz) for live match data + results
- [ ] Admin panel: update match results, trigger point scoring
- [ ] Supabase Realtime: live vote count updates without page refresh
- [ ] OG image generation (`@vercel/og`) for WhatsApp share previews
- [ ] Push notifications (web push / WhatsApp) when results are out
- [ ] Migrate localStorage auth → Supabase sessions + httpOnly cookies
- [ ] Recharts animated probability chart on results page
- [ ] Streak counter: "🔥 5 correct in a row"
- [ ] MSG91 / 2Factor.in OTP for faster India SMS (alternative to Twilio DLT)
- [ ] Admin dashboard for seeding new matches

---

## Decisions Log

| Date | Decision | Why |
|---|---|---|
| 2026-03-28 | `next.config.mjs` not `.ts` | Next.js 14.1 crashes on TypeScript config |
| 2026-03-28 | `tailwind.config.js` not `.ts` | PostCSS silently ignores TS config → no styles |
| 2026-03-28 | `next/dynamic ssr: false` for HomeClient | `useRouter` requires client-side router context |
| 2026-03-28 | Check `match_date` not `vote_end_time` | `vote_end_time` was seeded with small intervals, now stale |
| 2026-03-28 | Dev OTP bypass (`123456`) | Supabase phone auth = "Unsupported provider" in dev |
| 2026-03-28 | Valid RFC-4122 UUID for dev users | `"devuser-0000-..."` format rejected by Postgres UUID column |
| 2026-03-28 | Post-signup redirect to home, not results | User hadn't made prediction yet; home auto-opens modal via localStorage |
| 2026-03-28 | CSS class system for modal positioning | Inline `translate(-50%)` breaks mobile bottom sheet positioning |
| 2026-03-28 | `color-scheme: dark` everywhere | OS dark mode was overriding app light mode when not set |
| 2026-03-28 | `viewport-fit=cover` + safe-area CSS | iOS home indicator overlapped modal actions |
