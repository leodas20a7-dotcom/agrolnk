import React from 'react';
import {
  X,
  Trophy,
  Clock,
  MapPin,
  ShieldCheck,
  Building2,
  TrendingUp,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function AuctionHistoryModal({
  auction,
  isOpen,
  onClose,
  onNavigate,
}) {
  if (!isOpen || !auction) return null;

  const totalQuantity = Number(auction.quantity || 0);
  const finalPrice = Number(auction.currentBid || auction.startingBid || 0);
  const totalValuation = totalQuantity * finalPrice;
  const reserveMet = finalPrice >= Number(auction.reservePrice || 0);
  const winnerName = auction.highestBidderName || 'Winning Bidder';

  const formattedEndedDate = auction.endsAt
    ? new Date(auction.endsAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently Closed';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3326] text-white flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                Auction Closing Record
              </h3>
              <span className="text-xs text-[#566861]">
                {auction.commodity} ({auction.variety || 'Standard Lot'}) • Grade {auction.grade || 'A'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Winner & Final Winning Price Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B3326] to-[#14624A] text-white space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute right-3 -bottom-4 text-white/5 font-mono text-8xl font-black select-none pointer-events-none">
              WON
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#34D399] tracking-wider block">
                  Final Winning Price
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-extrabold font-heading">
                    ₹{finalPrice}
                  </span>
                  <span className="text-xs text-[#DCFCE7]/90 font-medium">
                    / {auction.unit || 'kg'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#34D399] tracking-wider block">
                  Total Lot Value
                </span>
                <span className="text-xl font-extrabold font-heading">
                  ₹{totalValuation.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs relative z-10">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Winner: <strong className="font-bold text-white">{winnerName}</strong></span>
              </div>
              <Badge variant={reserveMet ? 'emerald' : 'amber'} size="sm">
                {reserveMet ? '✓ Reserve Met & Finalized' : 'Reserve Below Target'}
              </Badge>
            </div>
          </div>

          {/* Commodity Details & Time Record */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-[#566861] uppercase font-bold block tracking-wider">
                Auction Ended At
              </span>
              <span className="font-bold text-[#14211D] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#10B981]" />
                {formattedEndedDate}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#566861] uppercase font-bold block tracking-wider">
                Harvest Volume
              </span>
              <span className="font-bold text-[#14211D]">
                {totalQuantity.toLocaleString('en-IN')} {auction.unit || 'kg'}
              </span>
            </div>
          </div>

          {/* Pricing Progression Matrix */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5EDE8] space-y-3">
            <h4 className="text-xs font-bold text-[#0B3326] uppercase tracking-wider">
              Auction Price Summary
            </h4>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <span className="text-[10px] text-[#566861] block">Starting Bid</span>
                <span className="font-bold text-[#14211D] text-sm">₹{auction.startingBid || auction.basePrice || finalPrice}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8]">
                <span className="text-[10px] text-[#566861] block">Reserve Price</span>
                <span className="font-bold text-[#14211D] text-sm">₹{auction.reservePrice || finalPrice}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#EBF5F0] border border-[#10B981]/20">
                <span className="text-[10px] text-[#10B981] font-semibold block">Winning Bid</span>
                <span className="font-extrabold text-[#0B3326] text-sm">₹{finalPrice}</span>
              </div>
            </div>
          </div>

          {/* Origin Location */}
          <div className="flex items-center justify-between text-xs text-[#566861] px-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
              Origin: <strong>{auction.district ? `${auction.district}, ` : ''}{auction.state || 'Tamil Nadu'}</strong>
            </span>
            <span className="font-medium text-[#10B981]">
              100% Escrow Protected
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E5EDE8] bg-[#FAFBF9] flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Close Record
          </Button>

          {onNavigate && (
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={() => {
                onClose();
                onNavigate('buyer-orders');
              }}
              className="text-xs font-bold px-5 py-2.5 shadow-xs cursor-pointer"
            >
              View in Orders
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
