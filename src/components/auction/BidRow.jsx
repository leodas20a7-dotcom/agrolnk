import React from 'react';
import { Gavel, Trophy, ArrowRight, ShoppingBag, MapPin, Clock, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function BidRow({ bid, onNavigate }) {
  const lot = bid.auction || { commodity: 'Commodity Lot', grade: 'A', quantity: 500, unit: 'kg' };
  const isLive = lot.status === 'live';
  const isWon = bid.isWinner;
  const isReserveFailed = lot.status === 'reserve_not_met';
  const isLost = lot.status === 'completed' && !isWon;

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-white border shadow-2xs hover:border-[#10B981]/50 hover:shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left ${
        isWon ? 'border-[#10B981] bg-gradient-to-r from-[#F2FBF6] via-white to-white' : 'border-[#E5EDE8]'
      }`}
    >
      {/* Left: Commodity & Status */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[240px]">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
            isWon
              ? 'bg-[#10B981] text-white'
              : isLive && bid.isLeading
              ? 'bg-[#EBF5F0] text-[#10B981]'
              : 'bg-[#F8FAF8] text-[#566861]'
          }`}
        >
          {isWon ? <Trophy className="w-5 h-5" /> : <Gavel className="w-5 h-5" />}
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-[#0B3326] font-heading">
              {lot.commodity}
            </h4>
            <Badge variant="dark" size="xs">
              Grade {lot.grade || 'A'}
            </Badge>

            {isWon && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981] text-white text-[10px] font-bold">
                🏆 Won
              </span>
            )}

            {isLive && bid.isLeading && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#10B981] text-[10px] font-bold border border-[#10B981]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" /> Leading
              </span>
            )}

            {isLive && !bid.isLeading && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Outbid
              </span>
            )}

            {isLost && (
              <Badge variant="dark" size="xs">
                Concluded
              </Badge>
            )}

            {isReserveFailed && (
              <Badge variant="amber" size="xs">
                Reserve Not Met
              </Badge>
            )}
          </div>

          <p className="text-xs text-[#566861]">
            Lot Volume: <strong className="text-[#14211D]">{lot.quantity} {lot.unit || 'kg'}</strong>
            {lot.variety && ` • ${lot.variety}`}
          </p>
        </div>
      </div>

      {/* Middle: Bid Comparison */}
      <div className="grid grid-cols-2 gap-4 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x lg:px-6 border-[#E5EDE8] text-xs">
        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">
            Your Submitted Bid
          </span>
          <span className="text-sm font-extrabold text-[#14211D]">
            ₹{bid.amount} <span className="text-[10px] font-normal text-[#566861]">/{lot.unit || 'kg'}</span>
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">
            {isLive ? 'Current Highest' : 'Final Closing'}
          </span>
          <span className="text-sm font-extrabold text-[#0B3326]">
            ₹{bid.currentHighestBid || bid.amount} <span className="text-[10px] font-normal text-[#566861]">/{lot.unit || 'kg'}</span>
          </span>
        </div>
      </div>

      {/* Right: Action Button */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        {isWon ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate?.('buyer-orders')}
            icon={ShoppingBag}
            iconPosition="left"
            className="text-xs font-bold shadow-xs cursor-pointer"
          >
            View Order
          </Button>
        ) : (
          <Button
            variant={bid.isLeading && isLive ? 'secondary' : 'accent'}
            size="sm"
            onClick={() =>
              onNavigate?.('auction-room', { auctionId: bid.auctionId, auction: bid.auction })
            }
            icon={ArrowRight}
            iconPosition="right"
            className="text-xs font-bold shadow-xs cursor-pointer"
          >
            {isLive ? (bid.isLeading ? 'View Room' : 'Increase Bid') : 'View Result'}
          </Button>
        )}
      </div>

    </div>
  );
}
