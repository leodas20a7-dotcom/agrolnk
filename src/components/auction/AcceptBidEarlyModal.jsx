import React, { useState } from 'react';
import {
  X,
  Gavel,
  ShieldCheck,
  CheckCircle2,
  Zap,
  User,
  ShoppingBag,
  Truck,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { acceptAuctionBidEarly } from '../../utils/auctions';

export default function AcceptBidEarlyModal({
  isOpen,
  onClose,
  auction,
  onSuccess,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !auction) return null;

  const currentRate = Number(auction.winningBid || auction.currentBid || 0);
  const quantity = Number(auction.quantity || 0);
  const totalValuation = quantity * currentRate;
  const buyerName = auction.highestBidderName || auction.winnerName || 'Leading Verified Buyer';
  const buyerId = auction.highestBidderId || auction.winnerId;

  const handleConfirmAccept = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const result = await acceptAuctionBidEarly(auction.id, {
        acceptedBid: currentRate,
        bidderId: buyerId,
        bidderName: buyerName,
      });

      if (onSuccess) {
        onSuccess(result.auction, result.order);
      }
      onClose();
    } catch (err) {
      console.error('Failed to accept bid early:', err);
      setError(err.message || 'Failed to accept bid and close auction. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#E5EDE8] space-y-5 text-left relative animate-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
            <Zap className="w-6 h-6 fill-[#D97706]" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF5F0] text-[11px] font-bold text-[#10B981]">
              <Gavel className="w-3 h-3" />
              <span>Early Knockdown Settlement</span>
            </div>
            <h3 className="text-xl font-bold text-[#0B3326] font-heading">
              Accept Offer & Close Auction Now
            </h3>
            <p className="text-xs text-[#566861]">
              Satisfied with the current price? Lock in this sale immediately and start fulfillment without waiting for the timer to expire.
            </p>
          </div>
        </div>

        {/* Lot & Bid Details Card */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-3 text-xs">
          
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
            <div>
              <span className="text-[10px] text-[#566861] uppercase font-bold tracking-wider block">
                Produce Lot
              </span>
              <span className="font-bold text-sm text-[#0B3326]">
                {auction.commodity} (Grade {auction.grade})
              </span>
              <span className="text-[#566861] block text-[11px]">
                {auction.quantity} {auction.unit} • {auction.variety || 'Standard Lot'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-[#566861] uppercase font-bold tracking-wider block">
                Agreed Rate
              </span>
              <span className="text-xl font-extrabold text-[#10B981] font-heading">
                ₹{currentRate}
              </span>
              <span className="text-[#566861] text-[10px]"> / {auction.unit}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center font-bold">
                <User className="w-4 h-4 text-[#10B981]" />
              </div>
              <div>
                <span className="text-[10px] text-[#566861] block font-medium">Leading Buyer</span>
                <span className="font-bold text-xs text-[#14211D]">{buyerName}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-[#566861] block font-medium">Total Payout</span>
              <span className="text-base font-extrabold text-[#0B3326]">
                ₹{totalValuation.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

        </div>

        {/* What happens next banner */}
        <div className="p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326] space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-[#0B3326]">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Instant Escrow Order Creation</span>
          </div>
          <ul className="text-[11px] text-[#566861] space-y-1 list-disc list-inside">
            <li>The auction will close immediately with <b>{buyerName}</b> as the winner.</li>
            <li>An <b>Escrow-funded order</b> will be created automatically for ₹{totalValuation.toLocaleString('en-IN')}.</li>
            <li>You can immediately arrange transport / self-delivery to dispatch the produce.</li>
          </ul>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-2 border-t border-[#E5EDE8] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="font-bold text-xs py-2 px-4 cursor-pointer"
          >
            Keep Auction Live
          </Button>

          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={handleConfirmAccept}
            disabled={isSubmitting || !buyerId}
            icon={Zap}
            iconPosition="left"
            className="font-bold text-xs py-2 px-4 shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'Closing & Creating Order...' : `Accept ₹${totalValuation.toLocaleString('en-IN')} & Close Now`}
          </Button>
        </div>

      </div>
    </div>
  );
}
