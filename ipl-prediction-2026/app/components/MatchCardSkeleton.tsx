// Skeleton placeholder that matches the shape of MatchCard.
// Shown during the HomeClient dynamic import and any API loading state.
export function MatchCardSkeleton() {
  return (
    <div
      className="rounded-2xl mb-5 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Top accent line */}
      <div className="h-px shimmer-bg" />

      <div className="p-5">
        {/* Header row: match # badge + countdown placeholder */}
        <div className="flex justify-between items-center mb-5">
          <div className="h-4 w-24 rounded-full shimmer-bg" />
          <div className="h-6 w-20 rounded-full shimmer-bg" />
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between mb-5">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-2 w-[38%]">
            <div className="w-20 h-20 rounded-2xl shimmer-bg" />
            <div className="h-4 w-10 rounded-full shimmer-bg" />
            <div className="h-5 w-16 rounded-full shimmer-bg" />
          </div>

          {/* VS */}
          <div className="w-10 h-10 rounded-full shimmer-bg" />

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-2 w-[38%]">
            <div className="w-20 h-20 rounded-2xl shimmer-bg" />
            <div className="h-4 w-10 rounded-full shimmer-bg" />
            <div className="h-5 w-16 rounded-full shimmer-bg" />
          </div>
        </div>

        {/* Vote bar */}
        <div className="mb-5">
          <div className="flex justify-between mb-1.5">
            <div className="h-3 w-28 rounded-full shimmer-bg" />
            <div className="h-3 w-20 rounded-full shimmer-bg" />
          </div>
          <div className="h-2 w-full rounded-full shimmer-bg" />
        </div>

        {/* CTA button */}
        <div className="h-12 w-full rounded-xl shimmer-bg" />
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5">
      {/* Your standing card */}
      <div className="h-28 rounded-2xl shimmer-bg" />

      {/* Tabs */}
      <div className="h-10 rounded-xl shimmer-bg" />

      {/* Top 10 rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="w-8 h-8 rounded-full shimmer-bg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 rounded-full shimmer-bg" />
            <div className="h-3 w-20 rounded-full shimmer-bg" />
          </div>
          <div className="h-5 w-16 rounded-full shimmer-bg" />
        </div>
      ))}
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5">
      {/* YOU vs AI card */}
      <div className="h-52 rounded-2xl shimmer-bg" />
      {/* Community pulse */}
      <div className="h-24 rounded-2xl shimmer-bg" />
      {/* Share card */}
      <div className="h-36 rounded-2xl shimmer-bg" />
      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 rounded-xl shimmer-bg" />
        <div className="h-12 rounded-xl shimmer-bg" />
      </div>
    </div>
  );
}
