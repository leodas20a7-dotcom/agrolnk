import React from 'react';
import { User, History, ArrowUpRight } from 'lucide-react';
import Badge from '../ui/Badge';

export default function BidHistory({ bids = [], currentUserId, unit = 'kg' }) {
  const getRelativeTime = (timestamp) => {
    const diffSec = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec} sec ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours} hr ago`;
  };

  return (
    <div className="p-6 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-4 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#10B981]" />
          <h3 className="text-sm font-bold text-[#0B3326] font-heading uppercase tracking-wider">
            Recent Bids ({bids.length})
          </h3>
        </div>
        <span className="text-[11px] text-[#566861]">Live Stream</span>
      </div>

      {bids.length > 0 ? (
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {bids.map((bid, index) => {
            const isUser = bid.buyerId === currentUserId;
            const isTop = index === 0;

            return (
              <div
                key={bid.id || index}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                  isTop
                    ? 'bg-[#F2FBF6] border-[#10B981]/40 shadow-2xs'
                    : isUser
                    ? 'bg-[#EBF5F0]/50 border-[#10B981]/20'
                    : 'bg-[#F8FAF8] border-[#E5EDE8]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isTop
                        ? 'bg-[#10B981] text-white'
                        : isUser
                        ? 'bg-[#0B3326] text-white'
                        : 'bg-white border border-[#E5EDE8] text-[#566861]'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#14211D]">
                        {isUser ? 'You' : bid.buyerName || `Buyer #${bid.buyerId?.slice(-3) || 'X'}`}
                      </span>
                      {isTop && (
                        <Badge variant="emerald" size="sm">
                          Leading
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-[#566861]">
                      {getRelativeTime(bid.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-[#0B3326] font-heading">
                    ₹{bid.amount}
                  </span>
                  <span className="text-[10px] text-[#566861]"> / {unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-[#566861] space-y-1">
          <p>No bids placed yet.</p>
          <p className="text-[11px]">Be the first buyer to open the competitive bidding.</p>
        </div>
      )}
    </div>
  );
}
