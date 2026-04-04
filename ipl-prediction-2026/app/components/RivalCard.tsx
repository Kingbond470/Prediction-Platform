"use client";

interface RivalEntry {
  id: string;
  username: string;
  rank: number;
  total_points: number;
  win_percentage: number;
  total_predictions: number;
  total_correct: number;
  beat_ai_count?: number;
}

interface UserEntry extends RivalEntry {
  current_streak?: number;
}

interface Props {
  userRank: UserEntry;
  rival: RivalEntry;
}

export default function RivalCard({ userRank, rival }: Props) {
  const isAhead = userRank.rank < rival.rank; // rank 1 is ahead of rank 2
  const pointGap = Math.abs(rival.total_points - userRank.total_points);
  const isClose = pointGap <= 500;

  // Approximate predictions needed to close the gap (1000 pts per correct pick)
  const predsNeeded = Math.ceil(pointGap / 1000);

  return (
    <div
      className="rounded-2xl p-4 mb-5"
      style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04))",
        border: "1px solid rgba(139,92,246,0.25)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
          ⚔️ Your Rival
        </p>
        {isClose && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse">
            {isAhead ? "You're ahead!" : "So close!"}
          </span>
        )}
      </div>

      {/* VS layout */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* User side */}
        <div className="text-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">You</p>
          <p className="font-display font-black text-2xl text-white">#{userRank.rank}</p>
          <p className="text-xs font-semibold text-gray-300 truncate">{userRank.username}</p>
          <p className="font-display font-bold text-base text-gradient mt-1">
            {userRank.total_points.toLocaleString("en-IN")}
            <span className="text-xs text-gray-500 font-normal ml-0.5">pts</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">{userRank.win_percentage}% acc.</p>
        </div>

        {/* VS badge */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-sm"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1))",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "#A78BFA",
            }}
          >
            VS
          </div>
          <p
            className="text-[10px] font-bold text-center leading-tight"
            style={{ color: isAhead ? "#10B981" : "#F59E0B" }}
          >
            {isAhead
              ? `+${pointGap.toLocaleString("en-IN")}`
              : `-${pointGap.toLocaleString("en-IN")}`}
            <br />
            <span className="text-gray-600 font-normal">pts</span>
          </p>
        </div>

        {/* Rival side */}
        <div className="text-center">
          <p className="text-[10px] text-purple-400 font-bold uppercase mb-0.5">Rival</p>
          <p className="font-display font-black text-2xl text-white">#{rival.rank}</p>
          <p className="text-xs font-semibold text-gray-300 truncate">{rival.username}</p>
          <p className="font-display font-bold text-base text-white mt-1">
            {rival.total_points.toLocaleString("en-IN")}
            <span className="text-xs text-gray-500 font-normal ml-0.5">pts</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">{rival.win_percentage}% acc.</p>
        </div>
      </div>

      {/* Motivation line */}
      <div
        className="mt-3 px-3 py-2 rounded-xl text-center text-xs"
        style={{
          background: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.15)",
        }}
      >
        {isAhead ? (
          <span className="text-green-400 font-semibold">
            🛡️ You&apos;re ahead of {rival.username} — keep predicting to stay there.
          </span>
        ) : pointGap === 0 ? (
          <span className="text-purple-300 font-semibold">
            🤝 Tied with {rival.username}! Next correct pick breaks the tie.
          </span>
        ) : (
          <span className="text-amber-300 font-semibold">
            {predsNeeded === 1
              ? `1 correct prediction could overtake ${rival.username}!`
              : `${predsNeeded} correct predictions to overtake ${rival.username}.`}
          </span>
        )}
      </div>
    </div>
  );
}
