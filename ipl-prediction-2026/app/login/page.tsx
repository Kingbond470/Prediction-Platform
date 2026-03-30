"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("userId", data.user_id);
        localStorage.setItem("username", data.username);
        localStorage.setItem("firstName", data.name);
        router.push("/");
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 items-center justify-center text-3xl mb-4 shadow-glow-red">
            🏏
          </div>
          <h1 className="font-display font-black text-3xl text-white mb-1">
            Welcome Back
          </h1>
          <p className="text-gray-500 text-sm">Enter your number to continue</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Phone input */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div
              className={`flex rounded-xl overflow-hidden border transition-all
                ${error
                  ? "border-red-500/60 shadow-[0_0_0_3px_rgba(239,68,68,0.18)]"
                  : "border-white/[0.1] focus-within:border-red-500/50 focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
                }`}
            >
              <div className="flex items-center gap-2 px-3 bg-white/[0.06] border-r border-white/[0.08] text-sm font-semibold text-gray-300 shrink-0">
                🇮🇳 +91
              </div>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phone}
                autoFocus
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                maxLength={10}
                className="flex-1 px-4 py-3.5 bg-transparent text-white placeholder-gray-600 focus:outline-none text-base"
              />
              <div className="flex items-center pr-3">
                <span
                  className={`text-xs font-mono tabular-nums transition-colors ${
                    phone.length === 10 ? "text-green-400" : "text-gray-600"
                  }`}
                >
                  {phone.length}/10
                </span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              <span className="mt-0.5">⚠️</span>
              <span>
                {error}{" "}
                {error.includes("sign up") && (
                  <a href="/signup" className="underline text-red-300 font-semibold">
                    Sign up here →
                  </a>
                )}
              </span>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleLogin}
            disabled={loading || phone.length !== 10}
            loading={loading}
            size="lg"
            className="w-full mt-1"
          >
            Login →
          </Button>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-gray-600 mt-5">
          New here?{" "}
          <a href="/signup" className="text-red-400 font-semibold hover:text-red-300 transition-smooth">
            Create an account →
          </a>
        </p>
      </div>
    </div>
  );
}
