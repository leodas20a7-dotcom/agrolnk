import React from 'react';
import { Eye, Gavel, Clock, Trophy, Zap, ShoppingBag, MapPin } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function AuctionRow({
  auction,
  timeNow = Date.now(),
  onNavigate,
  onEarlyAccept,
  onViewHistory,
}) {
  const isLive = auction.status === 'live';
  const isCompleted = auction.status === 'completed';
  const isUnsold =
    auction.status === 'reserve_not_met' || auction.status === 'ended_unsold';
  const reserveMet = auction.currentBid >= auction.reservePrice;

  const formatRemainingTime = (endsAtStr) => {
    const remainingMs = new Date(endsAtStr).getTime() - timeNow;
    if (remainingMs <= 0) return '00:00 (Ended)';

    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5EDE8] shadow-xs hover:border-[#10B981]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left">
      {/* Left: Thumbnail & Commodity */}
      <div className="flex items-start sm:items-center gap-4 min-w-[260px]">
        <img
          src={
            auction.images?.[0] ||
            'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
          }
          alt={auction.commodity}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-[#E5EDE8] shrink-0"
        />

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-[#0B3326] font-heading">
              {auction.commodity}
            </h4>
            <Badge variant="dark" size="sm">
              Grade {auction.grade}
            </Badge>
            {isLive && (
              <Badge variant="amber" size="sm" dot={true}>
                LIVE NOW
              </Badge>
            )}
            {isCompleted && (
              <Badge variant="emerald" size="sm">
                ✓ WON
              </Badge>
            )}
            {isUnsold && (
              <Badge variant="dark" size="sm">
                RESERVE NOT MET
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#566861] flex-wrap">
            <span>
              Lot: <strong>{auction.quantity} {auction.unit}</strong>
            </span>
            {auction.warehouseLocation && (
              <>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#10B981]" />
                  {auction.warehouseLocation}
                </span>
              </>
            )}
            {isLive && (
              <>
                <span>&bull;</span>
                <span className="flex items-center gap-1 text-amber-700 font-bold bg-[#FEF3C7] px-2 py-0.5 rounded-md text-[11px]">
                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                  {formatRemainingTime(auction.endsAt)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Bidding Financials */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 py-2 lg:py-0 border-y lg:border-y-0 lg:border-x lg:px-6 border-[#E5EDE8] text-xs">
        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Start / Reserve</span>
          <span className="font-bold text-sm text-[#566861]">
            ₹{auction.basePrice || auction.startingBid} / ₹{auction.reservePrice}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Current Bid</span>
          <span className="font-extrabold text-base text-[#10B981]">
            ₹{auction.winningBid || auction.currentBid || auction.basePrice}/{auction.unit}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[#566861] uppercase tracking-wider font-semibold block">Activity</span>
          <span className="font-bold text-sm text-[#0B3326]">
            {auction.totalBids || 0} Bids
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0 flex-wrap">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate('auction-room', { auctionId: auction.id, auction })}
          icon={Eye}
          iconPosition="left"
          className="text-xs font-bold py-2 border-[#E5EDE8] hover:border-[#10B981] cursor-pointer"
        >
          {isLive ? 'Live Room' : 'View Room'}
        </Button>

        {isLive && (auction.highestBidderId || auction.totalBids > 0) && onEarlyAccept && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => onEarlyAccept(auction)}
            icon={Zap}
            iconPosition="left"
            className="text-xs font-bold py-2 shadow-xs cursor-pointer"
          >
            Accept ₹{auction.winningBid || auction.currentBid} & Close
          </Button>
        )}

        {isCompleted && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('farmer-orders')}
            icon={ShoppingBag}
            iconPosition="left"
            className="text-xs font-bold py-2 cursor-pointer"
          >
            View Order
          </Button>
        )}
      </div>
    </div>
  );
}
