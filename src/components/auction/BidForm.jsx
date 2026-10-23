import React, { useState, useEffect } from 'react';
import { Gavel, AlertCircle, ArrowUpRight, ArrowDownRight, TrendingDown, TrendingUp, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function BidForm({
  currentBid = 40,
  unit = 'kg',
  auctionType = 'forward',
  bidStep = 25,
  reservePrice = 0,
  isFarmer = false,
  isAuctionEnded = false,
  onInitiateBid,
}) {
  const isReverse = auctionType === 'reverse';
  const step = Math.max(1, Number(bidStep) || 25);
  const numericCurrentBid = Number(currentBid) || 0;
  const numericReservePrice = Number(reservePrice) || 0;

  const defaultSuggestedAmount = isReverse
    ? Math.max(numericReservePrice, numericCurrentBid - step)
    : numericCurrentBid + step;

  const [bidAmount, setBidAmount] = useState(defaultSuggestedAmount);
  const [error, setError] = useState('');

  // Keep suggested bid updated when currentBid shifts in real-time
  useEffect(() => {
    if (isReverse) {
      setBidAmount(Math.max(numericReservePrice, numericCurrentBid - step));
    } else {
      setBidAmount(numericCurrentBid + step);
    }
    setError('');
  }, [numericCurrentBid, step, isReverse, numericReservePrice]);

  // Suggested multipliers: 1x, 2x, 3x, 4x of farmer-defined step
  const suggestedMultipliers = [1, 2, 3, 4];

  const handleQuickSelect = (multiplier) => {
    const delta = multiplier * step;
    const target = isReverse
      ? numericCurrentBid - delta
      : numericCurrentBid + delta;

    if (isReverse && numericReservePrice > 0 && target < numericReservePrice) {
      setError(`Cannot bid below the farmer's reserve floor of ₹${numericReservePrice}/${unit}.`);
      setBidAmount(numericReservePrice);
      return;
    }

    setBidAmount(target);
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
    if (!amount || isNaN(amount)) {
      setError('Please enter a valid bid amount.');
      return;
    }

    if (isReverse) {
      // Reverse auction validation
      if (amount >= numericCurrentBid) {
        setError(`In a reverse auction, your bid must be lower than the current leading offer of ₹${numericCurrentBid}/${unit}.`);
        return;
      }
      const dec = numericCurrentBid - amount;
      if (dec < step) {
        setError(`Your bid must be lower by at least the required step of ₹${step}/${unit}.`);
        return;
      }
      const remainder = Math.round((dec % step) * 100) / 100;
      if (remainder > 0.01 && remainder < (step - 0.01)) {
        setError(`Bids must be in exact step decrements of ₹${step}/${unit} (e.g. ₹${numericCurrentBid - step}, ₹${numericCurrentBid - (step * 2)}).`);
        return;
      }
      if (numericReservePrice > 0 && amount < numericReservePrice) {
        setError(`Bid cannot be lower than the farmer's reserve floor price of ₹${numericReservePrice}/${unit}.`);
        return;
      }
    } else {
      // Forward auction validation
      if (amount <= numericCurrentBid) {
        setError(`Your bid must be higher than the current bid of ₹${numericCurrentBid}/${unit}.`);
        return;
      }
      const inc = amount - numericCurrentBid;
      if (inc < step) {
        setError(`Your bid must increase by at least the required step of ₹${step}/${unit}.`);
        return;
      }
      const remainder = Math.round((inc % step) * 100) / 100;
      if (remainder > 0.01 && remainder < (step - 0.01)) {
        setError(`Bids must be in exact step increments of ₹${step}/${unit} (e.g. ₹${numericCurrentBid + step}, ₹${numericCurrentBid + (step * 2)}).`);
        return;
      }
    }

    onInitiateBid(amount);
  };

  return (
    <div className="p-6 rounded-3xl bg-white border border-[#E5EDE8] shadow-xs space-y-5 text-left">
      {/* Header & Mode Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
        <div className="flex items-center gap-2">
          {isReverse ? (
            <TrendingDown className="w-4 h-4 text-[#D97706]" />
          ) : (
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
          )}
          <h3 className="text-sm font-bold text-[#0B3326] font-heading uppercase tracking-wider">
            {isReverse ? 'Place Reverse Bid' : 'Place Your Bid'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isReverse ? 'amber' : 'emerald'} size="sm">
            {isReverse ? `Step: -₹${step}` : `Step: +₹${step}`}
          </Badge>
          <span className="text-[11px] text-[#566861] font-semibold">
            {isReverse
              ? `Max: ₹${Math.max(numericReservePrice, numericCurrentBid - step)}/${unit}`
              : `Min: ₹${numericCurrentBid + step}/${unit}`}
          </span>
        </div>
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
          
          {/* Quick Suggested Increments / Decrements in exact step multiples */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-[#566861]">
                {isReverse ? 'Quick Step Decrements' : 'Quick Step Increments'}
              </label>
              <span className="text-[10px] text-[#566861] italic">
                Multiples of farmer's step (₹{step})
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {suggestedMultipliers.map((m) => {
                const delta = m * step;
                const targetPrice = isReverse
                  ? numericCurrentBid - delta
                  : numericCurrentBid + delta;

                const isBelowFloor = isReverse && numericReservePrice > 0 && targetPrice < numericReservePrice;
                const isSelected = Number(bidAmount) === targetPrice;

                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isBelowFloor}
                    onClick={() => handleQuickSelect(m)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      isBelowFloor
                        ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 border border-gray-200'
                        : isSelected
                        ? (isReverse ? 'bg-[#92400E] text-white shadow-xs' : 'bg-[#0B3326] text-white shadow-xs')
                        : 'bg-[#F8FAF8] text-[#0B3326] border border-[#E5EDE8] hover:border-[#10B981] hover:bg-[#F2FBF6]'
                    }`}
                  >
                    <span>
                      {isReverse ? '-' : '+'}₹{delta}
                    </span>
                    <span className="text-[10px] block opacity-80 font-normal">
                      (₹{targetPrice})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numeric Bid Input with unit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#14211D]">
                Custom Bid (₹ / {unit})
              </label>
              <span className="text-[11px] text-[#566861]">
                Must be multiple of ₹{step}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0B3326]">
                ₹
              </span>
              <input
                type="number"
                step={step}
                value={bidAmount}
                onChange={(e) => {
                  setBidAmount(e.target.value);
                  setError('');
                }}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#E5EDE8] text-base font-extrabold text-[#0B3326] focus:outline-none focus:ring-2 focus:ring-[#10B981] transition-all"
              />
            </div>
            {isReverse && numericReservePrice > 0 && (
              <span className="text-[11px] text-[#566861] block pt-1">
                🛡️ Reserve floor protection: ₹{numericReservePrice}/{unit} minimum.
              </span>
            )}
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
            variant={isReverse ? 'warning' : 'accent'}
            size="lg"
            icon={isReverse ? ArrowDownRight : ArrowUpRight}
            iconPosition="right"
            className="w-full justify-center py-3.5 font-bold text-sm shadow-xs cursor-pointer"
          >
            {isReverse
              ? `Submit Reverse Bid: ₹${bidAmount}/${unit}`
              : `Place Bid: ₹${bidAmount}/${unit}`}
          </Button>
        </form>
      )}
    </div>
  );
}
