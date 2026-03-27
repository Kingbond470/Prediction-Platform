import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, className = "", glow = false, padding = "md" }: CardProps) {
  const padClass = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  }[padding];

  return (
    <div
      className={`rounded-2xl glass ${padClass} ${className}`}
      style={{
        boxShadow: glow
          ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(239,68,68,0.15)"
          : "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </div>
  );
}
