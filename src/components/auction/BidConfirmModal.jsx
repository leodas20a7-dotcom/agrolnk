import React from 'react';
import { X, Gavel, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function BidConfirmModal({
  isOpen,
  auction,
  bidAmount,
  onClose,
  onConfirm,
  isSubmitting = false,
}) {
  if (!isOpen || !auction) return null;

  const totalValue = Number(bidAmount || 0) * Number(auction.quantity || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#E5EDE8] shadow-2xl space-y-6 text-left my-6 animate-in fade-in zoom-in-95 duration-200 relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0B3326] font-heading">
                Confirm Your Bid
              </h3>
              <span className="text-xs text-[#566861]">Live Auction Submission</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Commodity Snapshot */}
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-[#0B3326] font-heading">
                {auction.commodity}
              </h4>
              <Badge variant="dark" size="sm">
                Grade {auction.grade}
              </Badge>
            </div>
            <p className="text-xs text-[#566861] mt-0.5">
              Volume: <strong className="text-[#14211D]">{auction.quantity} {auction.unit}</strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-[#566861] block">Your Proposed Bid</span>
            <span className="text-xl font-extrabold text-[#0B3326] font-heading">
              ₹{bidAmount} / {auction.unit}
            </span>
          </div>
        </div>

        {/* Potential Valuation Box */}
        <div className="p-4 rounded-2xl bg-[#0B3326] text-white border border-[#14624A] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#DCFCE7]/80">
            <span>Potential Contract Value</span>
            <span>
              {auction.quantity} {auction.unit} × ₹{bidAmount}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1 border-t border-[#14624A]">
            <span className="text-sm font-semibold text-white">Total Commitment</span>
            <span className="text-2xl font-extrabold font-heading text-white">
              ₹{totalValue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Escrow & Binding Bid Note */}
        <div className="p-3.5 rounded-xl bg-[#EBF5F0] border border-[#10B981]/25 text-xs text-[#0B3326] flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
          <span>
            If your bid is the highest valid bid when the auction ends, an escrow procurement order will be automatically generated.
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 justify-center font-semibold text-xs py-3 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            disabled={isSubmitting}
            icon={Check}
            iconPosition="right"
            className="flex-1 justify-center font-bold text-xs py-3 shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'Placing Bid...' : 'Confirm Bid'}
          </Button>
        </div>

      </div>
    </div>
  );
}
