import { Suspense } from "react";
import AdminContent from "./AdminContent";

export const metadata = { robots: "noindex" };

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" /></div>}>
      <AdminContent />
    </Suspense>
  );
}
