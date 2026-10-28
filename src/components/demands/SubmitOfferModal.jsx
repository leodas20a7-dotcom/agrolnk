import React, { useState, useEffect } from 'react';
import { X, Send, ShieldCheck, AlertCircle, Check, TrendingDown } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { submitDemandOffer, placeDemandBid } from '../../utils/demands';
import { showGlobalToast } from '../../context/ToastContext';

export default function SubmitOfferModal({ isOpen, onClose, demand, currentUser, onSuccess, onSubmitted }) {
  const isReverse = demand?.procurement_mode === 'reverse_auction';
  const currentLowest = Number(demand?.current_lowest_bid || demand?.target_price || 0);
  const step = Number(demand?.bid_step) || 25;
  const nextValidBid = Math.max(1, currentLowest - step);

  const [quantityOffered, setQuantityOffered] = useState(String(demand?.quantity || ''));
  const [offerPrice, setOfferPrice] = useState(
    isReverse ? String(nextValidBid) : String(demand?.target_price || '')
  );
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (demand) {
      setQuantityOffered(String(demand.quantity || ''));
      setOfferPrice(isReverse ? String(nextValidBid) : String(demand.target_price || ''));
      setError('');
    }
  }, [demand?.id, isReverse, nextValidBid]);

  if (!isOpen || !demand) return null;

  const isMatchingTargetPrice = Number(offerPrice) === Number(demand.target_price);
  const isMatchingNextBid = Number(offerPrice) === nextValidBid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qty = Number(quantityOffered);
    const prc = Number(offerPrice);

    if (!qty || qty <= 0) {
      setError('Please enter a valid supply quantity.');
      return;
    }
    if (!prc || prc <= 0) {
      setError('Please enter your price quote.');
      return;
    }

    if (isReverse && prc > currentLowest - step) {
      setError(`Your quote must be at least ₹${step} lower than current offer (max ₹${currentLowest - step}/${demand.unit}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isReverse) {
        await placeDemandBid(
          demand.id,
          currentUser?.id,
          currentUser?.name || 'Farmer Partner',
          prc
        );
        showGlobalToast({
          message: `Reverse bid placed successfully at ₹${prc}/${demand.unit}!`,
          type: 'success',
        });
      } else {
        await submitDemandOffer({
          demandId: demand.id,
          farmerId: currentUser?.id,
          farmerName: currentUser?.name || 'Farmer Partner',
          farmerPhone: currentUser?.phone || '',
          offerPrice: prc,
          quantityOffered: qty,
          unit: demand.unit || 'kg',
          message,
        });

        showGlobalToast({
          message: 'Your supply quote has been sent to the buyer!',
          type: 'success',
        });
      }
      if (onSubmitted) onSubmitted();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to submit quote/bid:', err);
      setError(err.message || 'Failed to submit quote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalValue = Number(quantityOffered || 0) * Number(offerPrice || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs p-4 sm:p-6 flex min-h-full items-start justify-center">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-[#E5EDE8] shadow-2xl space-y-5 text-left my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EDE8]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              isReverse ? 'bg-amber-50 text-amber-700' : 'bg-[#EBF5F0] text-[#0B3326]'
            }`}>
              {isReverse ? (
                <TrendingDown className="w-5 h-5 text-amber-600" />
              ) : (
                <Send className="w-5 h-5 text-[#10B981]" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B3326] font-heading">
                {isReverse ? 'Place Reverse Bid' : 'Submit Supply Offer'}
              </h3>
              <p className="text-xs text-[#566861]">
                {isReverse
                  ? `Compete for ${demand.buyer_name || 'Verified Buyer'}'s procurement order.`
                  : `Offer your harvest to ${demand.buyer_name || 'Verified Buyer'}.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demand Snapshot */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
          isReverse ? 'bg-amber-50/60 border-amber-200' : 'bg-[#F8FAF8] border-[#E5EDE8]'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#0B3326]">
                {demand.commodity}
              </span>
              <Badge variant={isReverse ? 'amber' : 'dark'} size="sm">Grade {demand.grade}</Badge>
            </div>
            <p className="text-[#566861] mt-0.5">
              Volume: <strong>{demand.quantity} {demand.unit}</strong> • Delivery: <strong>{demand.delivery_district}, {demand.delivery_state}</strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#566861] block">
              {isReverse ? 'Current Lowest' : "Buyer's Budget"}
            </span>
            <span className={`font-bold text-sm ${isReverse ? 'text-amber-700' : 'text-[#10B981]'}`}>
              ₹{isReverse ? currentLowest : demand.target_price} / {demand.price_unit || demand.unit}
            </span>
            {isReverse && (
              <span className="text-[10px] text-slate-500 block font-medium">
                Step: -₹{step}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Quick Match / Quick Step Bid Button */}
          {isReverse ? (
            <button
              type="button"
              onClick={() => setOfferPrice(String(nextValidBid))}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
            >
              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
              <span>Quick Bid Next Step: ₹{nextValidBid}/{demand.unit} (-₹{step})</span>
            </button>
          ) : (
            demand.target_price > 0 && !isMatchingTargetPrice && (
              <button
                type="button"
                onClick={() => setOfferPrice(String(demand.target_price))}
                className="w-full py-2 px-3 rounded-xl bg-[#EBF5F0] border border-[#10B981]/30 text-[#0B3326] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#10B981] hover:text-white transition-all cursor-pointer shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Buyer's Target Price of ₹{demand.target_price}/{demand.unit}</span>
              </button>
            )
          )}

          {/* Pricing & Volume Inputs (Custom Quote) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#0B3326] block">
                Quantity Offered ({demand.unit}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantityOffered}
                onChange={(e) => setQuantityOffered(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] font-bold text-[#14211D] focus:ring-1 focus:ring-[#10B981]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#0B3326] block">
                {isReverse ? 'Your Reverse Quote' : 'Your Price Quote'} (₹ / {demand.price_unit || demand.unit}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[#0B3326]">₹</span>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className={`w-full pl-6 pr-2 py-2 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] font-bold focus:ring-1 ${
                    isReverse ? 'text-amber-800 focus:ring-amber-500' : 'text-[#0B3326] focus:ring-[#10B981]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Valuation Note */}
          {totalValue > 0 && (
            <div className={`p-3 rounded-xl text-white flex items-center justify-between text-xs ${
              isReverse ? 'bg-amber-800' : 'bg-[#0B3326]'
            }`}>
              <span className="text-white/80">Estimated Deal Value</span>
              <span className="text-base font-extrabold text-white">
                ₹{totalValue.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Optional Message */}
          <div className="space-y-1">
            <label className="font-bold text-[#0B3326] block">
              Notes / Quality Details (Optional)
            </label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Harvested yesterday, packed in 50kg gunny bags, ready for pickup..."
              className="w-full p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E5EDE8] text-xs font-medium text-[#14211D] focus:ring-1 focus:ring-[#10B981] resize-none"
            />
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-white shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isReverse
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                  : 'bg-[#0B3326] hover:bg-[#10B981] active:bg-[#059669]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                'Submitting...'
              ) : isReverse ? (
                <>
                  <TrendingDown className="w-4 h-4" />
                  <span>Place Bid of ₹{Number(offerPrice || nextValidBid).toLocaleString()}/{demand.unit}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Offer (₹{Number(offerPrice || demand.target_price).toLocaleString()}/{demand.unit})</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
