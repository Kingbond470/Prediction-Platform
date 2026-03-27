"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/Button";
import { Card } from "@/app/components/Card";

type Step = "phone" | "otp" | "username";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formattedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;

  // Step 1: Send OTP
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
      if (data.success) {
        setStep("otp");
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch {
      setError("Error sending OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP (client-side check only, actual verify at account creation)
  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }
    setError("");
    setStep("username");
  };

  // Step 3: Create account + verify OTP with Supabase
  const handleCreateAccount = async () => {
    if (!username || username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (/\s/.test(username)) {
      setError("Username cannot contain spaces");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formattedPhone,
          otp,
          name: name || username,
          username,
        }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("userId", data.user_id);
        localStorage.setItem("username", username);

        const matchId = localStorage.getItem("selectedMatchId");
        if (matchId) {
          router.push(`/results?match_id=${matchId}`);
        } else {
          router.push("/");
        }
      } else {
        setError(data.error || "Failed to create account");
      }
    } catch {
      setError("Error creating account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels: Record<Step, string> = {
    phone: "Step 1 of 3 — Enter Phone",
    otp: "Step 2 of 3 — Verify OTP",
    username: "Step 3 of 3 — Create Username",
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Join The Community</h1>
        <p className="text-gray-500 text-sm">{stepLabels[step]}</p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {(["phone", "otp", "username"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all ${
              ["phone", "otp", "username"].indexOf(step) >= i
                ? "bg-red-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <Card>
        {step === "phone" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Phone Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600 text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone.replace("+91", "")}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Indian numbers only (+91)
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
            )}

            <Button
              onClick={handleSendOTP}
              disabled={phone.replace(/\D/g, "").length !== 10 || loading}
              size="lg"
              className="w-full"
            >
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-3xl tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sent to +91 {phone.replace("+91", "")}
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
            )}

            <Button
              onClick={handleVerifyOTP}
              disabled={otp.length !== 6}
              size="lg"
              className="w-full"
            >
              Verify OTP
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
              }}
              size="lg"
              className="w-full"
            >
              Change Number
            </Button>
          </div>
        )}

        {step === "username" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="cricketking99"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Min 3 characters. No spaces. Shown on leaderboard.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
            )}

            <Button
              onClick={handleCreateAccount}
              disabled={!username || username.length < 3 || loading}
              size="lg"
              className="w-full"
            >
              {loading ? "Creating Account..." : "Create Account & Predict"}
            </Button>
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-gray-400 mt-6">
        By signing up you agree to our Terms. No spam, no money, just cricket.
      </p>
    </div>
  );
}
