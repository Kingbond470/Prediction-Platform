"use client";

import { Suspense } from "react";
import ResultsContent from "./ResultsContent";

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
