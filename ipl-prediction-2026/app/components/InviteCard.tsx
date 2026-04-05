"use client";

interface InviteCardProps {
  username: string;
}

export default function InviteCard({ username }: InviteCardProps) {
  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${username}`
      : `/signup?ref=${username}`;

  const whatsappText = encodeURIComponent(
    `Join me on IPL Prediction 2026! 🏏 Predict match winners, beat the AI and climb the leaderboard. Sign up with my link and we both get +500 bonus points 🎁\n${inviteUrl}`
  );

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl).catch(() => {});
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">🎁</span>
        <div>
          <p className="text-sm font-semibold text-white">Invite Friends</p>
          <p className="text-xs text-gray-500">You &amp; your friend each get +500 pts</p>
        </div>
      </div>

      {/* Invite link */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-mono text-gray-400 truncate"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="flex-1 truncate">/signup?ref={username}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 text-gray-500 hover:text-white transition-colors px-1"
          title="Copy link"
        >
          📋
        </button>
      </div>

      {/* WhatsApp share */}
      <a
        href={`https://wa.me/?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
        style={{ background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.3)" }}
      >
        <span>💬</span> Share on WhatsApp
      </a>
    </div>
  );
}
