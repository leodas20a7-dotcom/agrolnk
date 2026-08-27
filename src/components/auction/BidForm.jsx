import React, { useState } from 'react';
import { Gavel, AlertCircle, ArrowUpRight } from 'lucide-react';
import Button from '../ui/Button';

export default function BidForm({
  currentBid = 40,
  unit = 'kg',
  isFarmer = false,
  isAuctionEnded = false,
  onInitiateBid,
}) {
  const minValidBid = Number(currentBid) + 1;
  const [bidAmount, setBidAmount] = useState(minValidBid);
  const [error, setError] = useState('');

  const suggestedIncrements = [1, 2, 5, 10];

  const handleQuickSelect = (increment) => {
    const val = Number(currentBid) + increment;
    setBidAmount(val);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isFarmer) {
      setError('You cannot bid on your own produce auction.');
      return;
    }
    if (isAuctionEnded) {
      setError('This auction has already ended.');
      return;
    }

    const amount = Number(bidAmount);
    if (!amount || amount <= currentBid) {
      setError(`Your bid must be higher than the current bid of ₹${currentBid}/${unit}.`);
      return;
    }

    onInitiateBid(amount);
  };

  return (
    <div className="p-6 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-5 text-left">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-[#10B981]" />
          <h3 className="text-sm font-bold text-[#0B3326] font-heading uppercase tracking-wider">
            Place Your Bid
          </h3>
        </div>
        <span className="text-[11px] text-[#566861]">Min Bid: ₹{minValidBid}/{unit}</span>
      </div>

      {isFarmer ? (
        <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs text-[#566861] text-center space-y-1">
          <p className="font-bold text-[#0B3326]">Producer Monitor Mode</p>
          <p>You are viewing this auction as the seller. Bidding is disabled for your account.</p>
        </div>
      ) : isAuctionEnded ? (
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600 text-center">
          Bidding is closed for this lot.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Quick Suggested Increments */}
          <div>
            <label className="block text-xs font-bold text-[#566861] mb-2">
              Suggested Quick Bids
            </label>
            <div className="grid grid-cols-4 gap-2">
              {suggestedIncrements.map((inc) => {
                const targetPrice = Number(currentBid) + inc;
                const isSelected = Number(bidAmount) === targetPrice;

                return (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleQuickSelect(inc)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#0B3326] text-white shadow-xs'
                        : 'bg-[#F8FAF8] text-[#0B3326] border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6]'
                    }`}
                  >
                    +₹{inc} <span className="text-[10px] block opacity-80">(₹{targetPrice})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numeric Bid Input */}
          <div>
            <label className="block text-xs font-bold text-[#14211D] mb-1.5">
              Custom Bid (₹ / {unit})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0B3326]">
                ₹
              </span>
              <input
                type="number"
                min={minValidBid}
                value={bidAmount}
                onChange={(e) => {
                  setBidAmount(e.target.value);
                  setError('');
                }}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-base font-extrabold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
              />
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <Button
            type="submit"
            variant="accent"
            size="lg"
            icon={ArrowUpRight}
            iconPosition="right"
            className="w-full justify-center py-3.5 font-bold text-sm shadow-xs cursor-pointer"
          >
            Place Bid of ₹{bidAmount}/{unit}
          </Button>
        </form>
      )}
    </div>
  );
}
