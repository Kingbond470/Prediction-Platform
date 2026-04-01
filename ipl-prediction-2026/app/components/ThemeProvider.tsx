"use client";

import { useEffect } from "react";
import { applyTeamTheme, resetTheme } from "@/lib/themeUtils";

/**
 * Reads favoriteTeam from localStorage on mount and applies the CSS variable
 * theme to <html>. Also listens for the custom "teamChanged" event so the
 * theme updates immediately when the user picks a team during signup.
 *
 * Renders nothing — purely a side-effect component.
 */
export default function ThemeProvider() {
  useEffect(() => {
    // Apply stored theme on first load
    const team = localStorage.getItem("favoriteTeam");
    if (team) {
      applyTeamTheme(team);
    } else {
      resetTheme();
    }

    // Listen for real-time team changes (e.g., during signup picker)
    function onTeamChanged(e: Event) {
      const team = (e as CustomEvent<string>).detail;
      if (team) {
        applyTeamTheme(team);
        localStorage.setItem("favoriteTeam", team);
      } else {
        resetTheme();
        localStorage.removeItem("favoriteTeam");
      }
    }

    window.addEventListener("teamChanged", onTeamChanged);
    return () => window.removeEventListener("teamChanged", onTeamChanged);
  }, []);

  return null;
}

/**
 * Helper to dispatch a teamChanged event from anywhere in the app.
 */
export function setFavoriteTeam(teamCode: string | null) {
  window.dispatchEvent(
    new CustomEvent("teamChanged", { detail: teamCode })
  );
}
