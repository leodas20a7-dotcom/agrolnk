import React from 'react';
import { TrendingUp, ShieldCheck, Check, User, AlertCircle } from 'lucide-react';
import Badge from '../ui/Badge';

export default function CurrentBid({
  currentBid,
  reservePrice,
  unit = 'kg',
  quantity = 500,
  highestBidderName,
  isCurrentUserLeading = false,
  status = 'live',
}) {
  const reserveMet = Number(currentBid) >= Number(reservePrice);
  const totalValuation = Number(currentBid || 0) * Number(quantity || 0);

  return (
    <div className="p-6 rounded-3xl bg-[#0B3326] text-white border border-[#14624A] shadow-md space-y-4 text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#DCFCE7]/80 uppercase tracking-wider">
          {status === 'live' ? 'Current Highest Bid' : 'Final Closing Price'}
        </span>

        {reserveMet ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#34D399] bg-[#0F4A37] px-2.5 py-1 rounded-full border border-[#14624A]">
            <Check className="w-3.5 h-3.5" /> Reserve Met
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#FCD34D] bg-[#0F4A37] px-2.5 py-1 rounded-full border border-[#14624A]">
            ⏳ Below Reserve (₹{reservePrice})
          </span>
        )}
      </div>

      {/* Large Price Display */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl sm:text-5xl font-extrabold font-heading text-white tracking-tight">
              ₹{currentBid}
            </span>
            <span className="text-sm font-semibold text-white/70">/ {unit}</span>
          </div>
          <span className="text-xs text-[#DCFCE7]/80 mt-1 block">
            Lot total: <strong className="text-white">₹{totalValuation.toLocaleString('en-IN')}</strong> ({quantity} {unit})
          </span>
        </div>

        {/* Leading State Indicator */}
        {isCurrentUserLeading ? (
          <div className="p-2.5 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/40 text-right">
            <span className="text-xs font-bold text-[#34D399] block">
              🎉 You're Leading
            </span>
            <span className="text-[10px] text-white/70">Top bid locked</span>
          </div>
        ) : highestBidderName ? (
          <div className="text-right">
            <span className="text-[11px] text-white/70 block">Leader</span>
            <span className="text-xs font-bold text-white flex items-center justify-end gap-1">
              <User className="w-3 h-3 text-[#34D399]" />
              {highestBidderName}
            </span>
          </div>
        ) : null}
      </div>

      {/* Reserve Price Footnote */}
      <div className="pt-3 border-t border-[#14624A] flex items-center justify-between text-xs text-[#DCFCE7]/80">
        <span>Reserve Price Floor: ₹{reservePrice} / {unit}</span>
        <span className="flex items-center gap-1 text-[#34D399]">
          <ShieldCheck className="w-3.5 h-3.5" /> Escrow Protected
        </span>
      </div>
    </div>
  );
}
