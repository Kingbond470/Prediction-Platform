"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function NavAuth() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem("username"));
  }, []);

  const handleLogout = async () => {
    // Clear server-side session cookie
    await fetch("/api/auth/logout", { method: "POST" });
    // Clear client-side state
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("firstName");
    localStorage.removeItem("favoriteTeam");
    localStorage.removeItem("userCity");
    setUsername(null);
    router.push("/");
    router.refresh();
  };

  if (username) {
    return (
      <div className="flex items-center gap-2">
        <a href="/leaderboard" className="text-xs text-gray-400 hidden sm:block hover:text-white transition-smooth">
          🏆 <span className="text-white font-semibold">@{username}</span>
        </a>
        <a href="/results" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-gray-300 hover:text-white hover:bg-white/[0.08] transition-smooth">
          My Picks
        </a>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-smooth"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href="/login"
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-gray-300 hover:text-white hover:bg-white/[0.08] transition-smooth"
      >
        Login
      </a>
      <a
        href="/signup"
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-smooth"
      >
        🏆 Play Now
      </a>
    </div>
  );
}
