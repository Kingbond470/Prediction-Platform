"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
  isClose: boolean; // within 24h
}

function getTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true, isClose: false };

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours   = Math.floor((diff / 1000 / 3600) % 24);
  const days    = Math.floor(diff / (1000 * 3600 * 24));

  return { days, hours, minutes, seconds, isLive: false, isClose: days === 0 };
}

export function CountdownTimer({ targetDate, className = "" }: CountdownTimerProps) {
  const [time, setTime] = useState<TimeLeft>(() => getTimeLeft(targetDate));

  useEffect(() => {
    setTime(getTimeLeft(targetDate));
    const id = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (time.isLive) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-red-500 animate-live-ping shadow-[0_0_6px_#EF4444]" />
        <span className="text-red-400 font-bold text-sm tracking-wide">LIVE NOW</span>
      </div>
    );
  }

  if (!time.isClose && time.days > 0) {
    return (
      <div className={`flex items-center gap-1.5 text-gray-400 ${className}`}>
        <span className="text-sm">⏱️</span>
        <span className="text-sm font-medium">
          {time.days}d {time.hours}h left
        </span>
      </div>
    );
  }

  // Close (within 24h) — show HH:MM:SS countdown
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-sm">⏱️</span>
      <div className="flex items-center gap-0.5">
        {time.hours > 0 && (
          <>
            <TimeUnit value={pad(time.hours)} />
            <span className="text-gray-500 font-bold pb-0.5">:</span>
          </>
        )}
        <TimeUnit value={pad(time.minutes)} />
        <span className="text-gray-500 font-bold pb-0.5">:</span>
        <TimeUnit value={pad(time.seconds)} urgent />
      </div>
    </div>
  );
}

function TimeUnit({ value, urgent = false }: { value: string; urgent?: boolean }) {
  return (
    <span
      className={`font-mono font-bold text-sm px-1 py-0.5 rounded ${
        urgent
          ? "text-orange-400 bg-orange-400/10"
          : "text-white bg-white/10"
      }`}
    >
      {value}
    </span>
  );
}
