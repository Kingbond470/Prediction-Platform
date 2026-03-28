"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/Button";

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_OTP = "123456";

type Step = "phone" | "otp" | "username";

function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formattedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

  const handleSendOTP = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone }),
      });
      const data = await res.json();
      if (data.success) setStep("otp");
      else setError(data.error || "Failed to send OTP");
    } catch {
      setError("Error sending OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = () => {
    if (otp.length !== 6) { setError("OTP must be 6 digits"); return; }
    setError("");
    setStep("username");
  };

  const handleCreateAccount = async () => {
    if (!username || username.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (/\s/.test(username)) { setError("Username cannot contain spaces"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, otp, name: name || username, username }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("userId", data.user_id);
        localStorage.setItem("username", username);
        router.push("/");
      } else {
        setError(data.error || "Failed to create account");
      }
    } catch {
      setError("Error creating account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps: Step[] = ["phone", "otp", "username"];
  const stepIdx = steps.indexOf(step);

  const stepMeta = {
    phone:    { label: "Enter Phone",      icon: "📱", title: "Join The Battle" },
    otp:      { label: "Verify OTP",       icon: "🔐", title: "Verify It's You" },
    username: { label: "Create Username",  icon: "🏏", title: "Pick Your Name" },
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 items-center justify-center text-3xl mb-4 shadow-glow-red">
            🏏
          </div>
          <h1 className="font-display font-black text-3xl text-white mb-1">
            {stepMeta[step].title}
          </h1>
          <p className="text-gray-500 text-sm">Predict. Compete. Dominate.</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-7">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full h-1 rounded-full transition-all duration-500"
                style={{
                  background: i <= stepIdx ? "#EF4444" : "rgba(255,255,255,0.08)",
                  boxShadow: i === stepIdx ? "0 0 8px #EF4444" : "none",
                }}
              />
              <span className={`text-xs font-medium transition-colors ${i <= stepIdx ? "text-red-400" : "text-gray-600"}`}>
                {stepMeta[s].label}
              </span>
            </div>
          ))}
        </div>

        {/* Dev banner */}
        {IS_DEV && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
            <span className="text-lg">🛠️</span>
            <div className="text-xs">
              <p className="font-bold text-amber-400 mb-0.5">Dev Mode — Auth Bypassed</p>
              <p className="text-amber-600">
                Any phone works. OTP:{" "}
                <code className="bg-amber-500/20 px-1.5 py-0.5 rounded font-mono font-bold text-amber-300">
                  {DEV_OTP}
                </code>
              </p>
            </div>
          </div>
        )}

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Step icon */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-lg">
              {stepMeta[step].icon}
            </div>
            <div>
              <p className="font-semibold text-white">Step {stepIdx + 1} of 3</p>
              <p className="text-xs text-gray-500">{stepMeta[step].label}</p>
            </div>
          </div>

          {/* ── STEP 1: Phone ── */}
          {step === "phone" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Phone Number
                </label>
                <div className="flex rounded-xl overflow-hidden border border-white/[0.1] focus-within:border-red-500/50 focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.12)] transition-all">
                  <div className="flex items-center gap-2 px-3 bg-white/[0.06] border-r border-white/[0.08] text-sm font-semibold text-gray-300 shrink-0">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={phone.replace("+91", "")}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="flex-1 px-4 py-3.5 bg-white/[0.04] text-white placeholder-gray-600 focus:outline-none text-base"
                    maxLength={10}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1.5">Indian numbers only (+91)</p>
              </div>

              {error && <ErrorBox message={error} />}

              <Button
                onClick={handleSendOTP}
                disabled={phone.replace(/\D/g, "").length !== 10 || loading}
                loading={loading}
                size="lg"
                className="w-full"
              >
                Send OTP →
              </Button>
            </div>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  className="w-full px-4 py-4 rounded-xl bg-white/[0.06] border border-white/[0.1] focus:border-red-500/50 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)] text-white text-center text-3xl tracking-[0.5em] font-mono font-bold focus:outline-none transition-all placeholder:text-gray-700 placeholder:tracking-normal placeholder:text-xl"
                />
                <p className="text-xs text-gray-600 mt-1.5">
                  Sent to +91 {phone.replace("+91", "")}
                </p>
              </div>

              {error && <ErrorBox message={error} />}

              <Button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6}
                size="lg"
                className="w-full"
              >
                Verify OTP →
              </Button>

              <button
                onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                className="w-full py-2.5 text-sm text-gray-500 hover:text-white transition-smooth"
              >
                ← Change Number
              </button>
            </div>
          )}

          {/* ── STEP 3: Username ── */}
          {step === "username" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Display Name <span className="text-gray-600 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] focus:border-red-500/50 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)] text-white placeholder-gray-600 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">@</span>
                  <input
                    type="text"
                    placeholder="cricketking99"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    autoFocus
                    className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] focus:border-red-500/50 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)] text-white placeholder-gray-600 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1.5">
                  Min 3 chars · No spaces · Shown on leaderboard
                </p>
              </div>

              {error && <ErrorBox message={error} />}

              <Button
                onClick={handleCreateAccount}
                disabled={!username || username.length < 3 || loading}
                loading={loading}
                size="lg"
                className="w-full"
              >
                🏏 Create Account & Predict
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-700 mt-5">
          By signing up you agree to our Terms. No spam, no money, just cricket. 🏏
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
      <span>⚠️</span>
      {message}
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
