"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { href: "/",            icon: "🏠", label: "Home"        },
  { href: "/results",     icon: "📊", label: "My Picks"    },
  { href: "/leaderboard", icon: "🏆", label: "Leaderboard" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 sm:hidden border-t border-white/[0.08]"
      style={{
        background: "rgba(7,17,31,0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <a
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 active:opacity-70 transition-opacity"
            >
              <span
                className="text-[22px] transition-transform duration-200"
                style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
              >
                {tab.icon}
              </span>
              <span
                className="text-[10px] font-bold tracking-wide transition-colors duration-200"
                style={{ color: isActive ? "var(--tc, #EF4444)" : "#4B5563" }}
              >
                {tab.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 w-8 h-0.5 rounded-full"
                  style={{ background: "var(--tc, #EF4444)" }}
                />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
