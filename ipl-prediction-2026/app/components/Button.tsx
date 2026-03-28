import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#07111F] disabled:opacity-40 disabled:cursor-not-allowed select-none overflow-hidden";

  const variants = {
    primary:
      "bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 focus:ring-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.35)] hover:shadow-[0_4px_30px_rgba(239,68,68,0.5)] hover:-translate-y-0.5 active:translate-y-0",
    secondary:
      "bg-white/[0.07] border border-white/[0.12] text-white hover:bg-white/[0.12] hover:border-white/[0.2] focus:ring-white/30",
    ghost:
      "text-gray-400 hover:text-white hover:bg-white/[0.07] focus:ring-white/20",
    danger:
      "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 focus:ring-red-500",
  }[variant];

  const sizes = {
    sm:  "px-3 py-2 text-sm gap-1.5",
    md:  "px-5 py-2.5 text-sm gap-2 min-h-[44px]",
    lg:  "px-6 py-3.5 text-base gap-2 min-h-[52px]",
  }[size];

  return (
    <button
      className={`${base} ${variants} ${sizes} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {/* Shine overlay */}
      {variant === "primary" && (
        <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
      )}

      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
