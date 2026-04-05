"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/Button";
import { TEAM_CONFIG } from "@/app/lib/teams";
import { setFavoriteTeam } from "@/app/components/ThemeProvider";

// Top Indian cricket cities for quick-pick suggestions
const CRICKET_CITIES = [
  "Mumbai", "Chennai", "Kolkata", "Bengaluru", "Delhi",
  "Hyderabad", "Ahmedabad", "Jaipur", "Lucknow", "Mohali",
  "Pune", "Guwahati", "Ranchi", "Visakhapatnam", "Indore",
];

const TEAMS = Object.entries(TEAM_CONFIG).map(([code, cfg]) => ({
  code,
  emoji: cfg.emoji,
  name: cfg.short,
  color: cfg.color,
}));

// ── Validation helpers ────────────────────────────────────────────────────────
function validatePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "Phone number is required";
  if (digits.length !== 10) return "Must be exactly 10 digits";
  if (!/^[6-9]/.test(digits)) return "Must start with 6, 7, 8, or 9";
  return null;
}

function validateUsername(value: string): string | null {
  if (!value) return "Username is required";
  if (value.length < 3) return "At least 3 characters";
  if (value.length > 20) return "Max 20 characters";
  if (!/^[a-z0-9_]+$/.test(value)) return "Only letters, numbers, underscores";
  if (/^_|_$/.test(value)) return "Cannot start or end with underscore";
  return null;
}

function validateFirstName(value: string): string | null {
  if (!value.trim()) return "First name is required";
  if (value.trim().length < 2) return "At least 2 characters";
  if (value.trim().length > 30) return "Max 30 characters";
  if (!/^[a-zA-Z\s]+$/.test(value)) return "Letters only";
  return null;
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({
  label, hint, required, error, children,
}: {
  label: string; hint?: string; required?: boolean; error?: string | null; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><span>⚠</span> {error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-600 mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
function SignupForm() {
  const router = useRouter();

  // Redirect already-logged-in users to home
  useEffect(() => {
    if (localStorage.getItem("userId")) router.replace("/");
  }, [router]);

  // Required fields
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");

  // Optional personalization
  const [city, setCity] = useState("");
  const [favoriteTeam, setFavoriteTeamState] = useState<string | null>(null);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const [touched, setTouched] = useState({ firstName: false, phone: false, username: false });
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const firstNameErr = touched.firstName ? validateFirstName(firstName) : null;
  const phoneErr     = touched.phone     ? validatePhone(phone)         : null;
  const usernameErr  = touched.username  ? validateUsername(username)   : null;

  const isFormValid =
    !validateFirstName(firstName) && !validatePhone(phone) && !validateUsername(username);

  const filteredCities = city.length >= 1
    ? CRICKET_CITIES.filter((c) => c.toLowerCase().startsWith(city.toLowerCase())).slice(0, 5)
    : [];

  function handleTeamSelect(code: string) {
    const next = favoriteTeam === code ? null : code;
    setFavoriteTeamState(next);
    // Live-preview the theme change immediately
    setFavoriteTeam(next);
  }

  const handleSubmit = async () => {
    setTouched({ firstName: true, phone: true, username: true });
    if (!isFormValid) return;

    setLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: `+91${phone}`,
          name: firstName.trim(),
          username: username.trim(),
          city: city.trim() || null,
          favorite_team: favoriteTeam || null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("userId", data.user_id);
        localStorage.setItem("username", username.trim());
        localStorage.setItem("firstName", firstName.trim());
        if (favoriteTeam) localStorage.setItem("favoriteTeam", favoriteTeam);
        if (city.trim()) localStorage.setItem("userCity", city.trim());
        localStorage.setItem("newSignup", "1");
        // Signal NavAuth (in the shared layout) to re-read username immediately
        window.dispatchEvent(new CustomEvent("authChanged"));
        const redirect = localStorage.getItem("authRedirect") || "/";
        localStorage.removeItem("authRedirect");
        router.push(redirect);
      } else {
        setServerError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (err: string | null) =>
    `w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border transition-all text-white placeholder-gray-600 focus:outline-none ${
      err
        ? "border-red-500/60 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]"
        : "border-white/[0.1] focus:border-white/30 focus:bg-white/[0.08]"
    }`;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex w-16 h-16 rounded-2xl items-center justify-center text-3xl mb-4"
            style={{
              background: "linear-gradient(135deg, var(--tc, #EF4444), color-mix(in srgb, var(--tc, #EF4444) 70%, black))",
              boxShadow: "0 0 32px rgba(var(--tc-r,239), var(--tc-g,68), var(--tc-b,68), 0.4)",
            }}
          >
            🏏
          </div>
          <h1 className="font-display font-black text-3xl text-white mb-1">Join The Battle</h1>
          <p className="text-gray-500 text-sm">Predict. Compete. Dominate.</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
        >
          {/* First Name */}
          <Field label="First Name" required hint="Shown on the leaderboard" error={firstNameErr}>
            <input
              type="text" placeholder="e.g. Ravi" value={firstName} autoFocus
              onChange={(e) => setFirstName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
              className={inputCls(firstNameErr)}
            />
          </Field>

          {/* Phone */}
          <Field label="Phone Number" required hint="Indian numbers only (+91)" error={phoneErr}>
            <div className={`flex rounded-xl overflow-hidden border transition-all ${phoneErr ? "border-red-500/60" : "border-white/[0.1] focus-within:border-white/30"}`}>
              <div className="flex items-center gap-2 px-3 bg-white/[0.06] border-r border-white/[0.08] text-sm font-semibold text-gray-300 shrink-0">
                🇮🇳 +91
              </div>
              <input
                type="tel" inputMode="numeric" placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                maxLength={10}
                className="flex-1 px-4 py-3.5 bg-transparent text-white placeholder-gray-600 focus:outline-none text-base"
              />
              <div className="flex items-center pr-3">
                <span className={`text-xs font-mono tabular-nums transition-colors ${phone.length === 10 ? "text-green-400" : "text-gray-600"}`}>
                  {phone.length}/10
                </span>
              </div>
            </div>
          </Field>

          {/* Username */}
          <Field label="Username" required hint="3–20 chars · letters, numbers & _ only" error={usernameErr}>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm select-none">@</span>
              <input
                type="text" placeholder="cricketking99" value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                className={`w-full pl-8 pr-9 py-3.5 rounded-xl bg-white/[0.06] border transition-all text-white placeholder-gray-600 focus:outline-none ${usernameErr ? "border-red-500/60" : "border-white/[0.1] focus:border-white/30 focus:bg-white/[0.08]"}`}
              />
              {username && !usernameErr && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-sm">✓</span>
              )}
            </div>
          </Field>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-gray-600 font-medium">Personalise your experience</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Favorite Team */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Favourite Team <span className="text-gray-600 normal-case font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {TEAMS.map((team) => {
                const isSelected = favoriteTeam === team.code;
                return (
                  <button
                    key={team.code}
                    type="button"
                    onClick={() => handleTeamSelect(team.code)}
                    className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 text-center"
                    style={{
                      background: isSelected
                        ? `${team.color}25`
                        : "rgba(255,255,255,0.04)",
                      border: isSelected
                        ? `1.5px solid ${team.color}80`
                        : "1.5px solid rgba(255,255,255,0.08)",
                      boxShadow: isSelected ? `0 0 12px ${team.color}40` : "none",
                      transform: isSelected ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    <span className="text-lg leading-none">{team.emoji}</span>
                    <span
                      className="text-[10px] font-bold leading-none"
                      style={{ color: isSelected ? team.color : "#6B7280" }}
                    >
                      {team.code}
                    </span>
                  </button>
                );
              })}
            </div>
            {favoriteTeam && (
              <p className="text-xs mt-2 text-center" style={{ color: TEAM_CONFIG[favoriteTeam]?.color }}>
                {TEAM_CONFIG[favoriteTeam]?.emoji} Go {favoriteTeam}! Your theme is live.
              </p>
            )}
          </div>

          {/* City */}
          <div className="relative">
            <Field
              label="Your City"
              hint="We'll personalise your experience"
            >
              <input
                type="text"
                placeholder="e.g. Mumbai"
                value={city}
                autoComplete="off"
                onChange={(e) => { setCity(e.target.value); setShowCitySuggestions(true); }}
                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
                onFocus={() => setShowCitySuggestions(true)}
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] focus:border-white/30 focus:bg-white/[0.08] transition-all text-white placeholder-gray-600 focus:outline-none"
              />
            </Field>
            {showCitySuggestions && filteredCities.length > 0 && (
              <div
                className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden"
                style={{ background: "rgba(13,26,45,0.98)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
              >
                {filteredCities.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                    onMouseDown={() => { setCity(c); setShowCitySuggestions(false); }}
                  >
                    📍 {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              <span>⚠️</span> {serverError}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
            size="lg"
            className="w-full mt-1"
            style={favoriteTeam ? {
              background: `linear-gradient(135deg, ${TEAM_CONFIG[favoriteTeam]?.color}, color-mix(in srgb, ${TEAM_CONFIG[favoriteTeam]?.color} 70%, black))`,
              boxShadow: `0 4px 20px ${TEAM_CONFIG[favoriteTeam]?.color}50`,
            } : undefined}
          >
            🏏 Start Predicting →
          </Button>
        </div>

        <p className="text-center text-xs text-gray-700 mt-3">No password. No spam. Just cricket. 🏏</p>
        <p className="text-center text-sm text-gray-600 mt-2">
          Already have an account?{" "}
          <a href="/login" className="text-red-400 font-semibold hover:text-red-300 transition-smooth">Login →</a>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" /></div>}>
      <SignupForm />
    </Suspense>
  );
}
