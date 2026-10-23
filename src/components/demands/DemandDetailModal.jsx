import React from 'react';
import {
  X,
  MapPin,
  Calendar,
  Building2,
  ShieldCheck,
  TrendingDown,
  ShoppingBag,
  Send,
  Zap,
  Package,
  CheckCircle2,
} from 'lucide-react';
import Button from '../ui/Button';

export default function DemandDetailModal({
  isOpen,
  onClose,
  demand,
  currentUser,
  onOpenOfferModal,
  onQuickBid,
}) {
  if (!isOpen || !demand) return null;

  const isReverse = demand.procurement_mode === 'reverse_auction';
  const currentPrice = Number(demand.current_lowest_bid || demand.target_price);
  const qty = Number(demand.quantity) || 0;
  const unit = demand.unit || 'Quintal';
  const totalEstimatedValue = qty * currentPrice;
  const step = Number(demand.bid_step) || 25;
  const nextBid = currentPrice - step;
  const isLeading = demand.leading_bidder_id === currentUser?.id;

  return (
    <div className="fixed inset-0 z-50 p-2 sm:p-4 bg-black/60 backdrop-blur-xs flex items-center justify-center overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col border border-[#E5EDE8] shadow-2xl overflow-hidden text-left">
        {/* Pinned Top Header */}
        <div
          className={`shrink-0 p-4 sm:p-5 text-white relative overflow-hidden ${
            isReverse
              ? 'bg-gradient-to-r from-amber-700 to-amber-950'
              : 'bg-gradient-to-r from-[#0B3326] to-[#14211D]'
          }`}
        >
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                  {demand.demand_number}
                </span>

                {isReverse ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-900 animate-pulse" />
                    Live Reverse Tender
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#10B981] text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    Fixed Budget
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {demand.commodity}
                </h2>
                <span className="text-xs text-white/80">
                  {demand.variety && demand.variety !== 'None' ? `${demand.variety} • ` : ''}
                  Grade {demand.grade || 'A'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body (Never clips screen!) */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4 text-xs">
          {/* Key Metrics: Qty, Target/Lowest, Total Deal */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Volume
              </p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {qty.toLocaleString()} <span className="text-xs font-semibold text-slate-500">{unit}</span>
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isReverse ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isReverse ? 'Lowest Offer' : 'Target Price'}
              </p>
              <p
                className={`text-base sm:text-lg font-black mt-0.5 ${
                  isReverse ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                ₹{currentPrice.toLocaleString()}
                <span className="text-xs font-semibold text-slate-500">/{unit}</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Deal Value
              </p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                ₹{totalEstimatedValue.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Reverse Bidding Mini Banner if active */}
          {isReverse && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <TrendingDown className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Decrements in: -₹{step}/{unit}</span>
              </div>
              {isLeading ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] bg-emerald-100 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  You are leading!
                </span>
              ) : demand.leading_bidder_name ? (
                <span className="text-[11px] text-slate-600">
                  Leading: <strong>{demand.leading_bidder_name}</strong>
                </span>
              ) : null}
            </div>
          )}

          {/* Clean Combined Buyer & Delivery Details Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                  {demand.buyer_name || 'Verified Agro Trader'}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                KYC Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Delivery Location</span>
                  <p className="font-semibold text-slate-700">
                    {demand.delivery_district ? `${demand.delivery_district}, ${demand.delivery_state}` : 'Pan-India'}
                    {demand.delivery_pincode ? ` - ${demand.delivery_pincode}` : ''}
                  </p>
                </div>
              </div>

              {demand.needed_by_date && (
                <div className="flex items-start gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Needed By Date</span>
                    <p className="font-semibold text-slate-700">
                      {demand.needed_by_date}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {demand.delivery_address && (
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Address</span>
                <p className="font-medium text-slate-800">{demand.delivery_address}</p>
              </div>
            )}
          </div>

          {/* Quality Instructions (only if provided) */}
          {demand.description && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Quality Instructions
              </span>
              <p className="text-slate-700 italic">
                "{demand.description}"
              </p>
            </div>
          )}
        </div>

        {/* Pinned Bottom Footer */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-[#E5EDE8] flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold px-4"
          >
            Close
          </Button>

          {isReverse ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                if (onQuickBid) onQuickBid(demand);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-5 flex items-center gap-1.5 shadow-xs"
            >
              <TrendingDown className="w-4 h-4" />
              Bid ₹{nextBid}/{unit}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                if (onOpenOfferModal) onOpenOfferModal(demand);
              }}
              className="bg-[#0B3326] hover:bg-[#10B981] text-white font-bold text-xs py-2 px-5 flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-4 h-4" />
              Send Supply Offer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
