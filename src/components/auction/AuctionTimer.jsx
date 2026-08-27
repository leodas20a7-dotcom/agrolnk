import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function AuctionTimer({ endsAt, status = 'live', onTimeUp, className = '' }) {
  const [timeRemaining, setTimeRemaining] = useState(() => {
    return Math.max(0, new Date(endsAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (status !== 'live') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onTimeUp?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, status, onTimeUp]);

  // State 3: ⚫ AUCTION ENDED
  if (status !== 'live' || timeRemaining <= 0) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-gray-500" />
        <span>AUCTION ENDED</span>
      </div>
    );
  }

  const totalSeconds = Math.floor(timeRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  // State 2: 🟡 ENDING SOON (<= 5 minutes)
  const isEndingSoon = totalSeconds <= 300;
  const isUrgent = totalSeconds < 60;

  if (isEndingSoon) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
          isUrgent
            ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
            : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
        } ${className}`}
      >
        <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-600' : 'text-[#D97706]'}`} />
        <span className="text-[10px] uppercase font-bold tracking-wider">
          {isUrgent ? 'FINAL SECONDS' : 'ENDING SOON'}
        </span>
        <span className="font-mono tracking-wider font-extrabold text-sm">
          {hours > 0
            ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
            : `${pad(minutes)}:${pad(seconds)}`}
        </span>
      </div>
    );
  }

  // State 1: 🟢 LIVE (> 5 minutes)
  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#EBF5F0] text-[#0B3326] border border-[#10B981]/30 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
      <span className="text-[10px] uppercase font-bold tracking-wider text-[#10B981]">
        LIVE
      </span>
      <span className="font-mono tracking-wider font-extrabold text-sm text-[#0B3326]">
        {hours > 0
          ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
          : `${pad(minutes)}:${pad(seconds)}`}
      </span>
    </div>
  );
}
