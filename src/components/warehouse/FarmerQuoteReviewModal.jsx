import React, { useState } from 'react';
import { X, Building2, CheckCircle2, Truck, AlertCircle, ArrowRight, ShieldCheck, Clock, FileText } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { acceptWarehouseQuote, declineWarehouseQuote } from '../../utils/warehouses';

export default function FarmerQuoteReviewModal({
  receipt,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  if (!isOpen || !receipt) return null;

  const totalQty = Number(receipt.totalQuantity || receipt.quantity || 0);
  const monthlyRent = Number(receipt.quotedMonthlyRent || receipt.storageFeeMonthly || 0);
  const ratePerTonne = Number(receipt.quotedRatePerTonne || Math.round((monthlyRent / (totalQty / 1000)))) || 350;
  const ratePerKg = Number((ratePerTonne / 1000).toFixed(2));
  const approxDaily = Math.round(monthlyRent / 30);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await acceptWarehouseQuote(receipt.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error accepting warehouse quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await declineWarehouseQuote(receipt.id, declineReason || 'Declined by farmer');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error declining warehouse quote:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#E5EDE8] shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF5F0] text-[#0B3326] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0B3326] font-heading">
                  Storage Rent Quote Review
                </h3>
                <Badge variant="blue" size="sm">
                  Quote Received
                </Badge>
              </div>
              <span className="text-xs text-[#566861]">
                {receipt.receiptNumber} • {receipt.commodity}
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

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Facility & Lot Details */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#566861] tracking-wider block">
                  Storage Facility & Chamber
                </span>
                <span className="text-sm font-extrabold text-[#0B3326]">
                  {receipt.warehouseName || 'Agri Storage Hub'}
                </span>
                <span className="text-xs text-[#566861] block font-medium">
                  {receipt.chamber || 'Standard Chamber'}
                </span>
              </div>
              <Badge variant="dark" size="sm">
                Grade {receipt.grade || 'A'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E5EDE8]/60 text-xs">
              <div>
                <span className="text-[#566861] block text-[11px]">Deposit Volume:</span>
                <span className="font-bold text-[#14211D]">
                  {Number(totalQty).toLocaleString('en-IN')} {receipt.unit || 'kg'}
                </span>
              </div>
              <div>
                <span className="text-[#566861] block text-[11px]">Estimated Produce Value:</span>
                <span className="font-bold text-[#10B981]">
                  ₹{Number(receipt.estimatedValue || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Quoted Monthly Rent Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F2FBF6] border-2 border-[#10B981]/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#0B3326] uppercase tracking-wider">
                Confirmed Monthly Storage Tariff
              </span>
              <span className="text-[11px] font-extrabold text-[#10B981]">
                ₹{ratePerKg} / kg / month
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
                  ₹{monthlyRent.toLocaleString('en-IN')}
                  <span className="text-xs font-semibold text-[#566861]"> / month</span>
                </div>
                <span className="text-[11px] text-[#566861]">
                  Rate: ₹{ratePerTonne} / Tonne / month (≈ ₹{approxDaily} / day)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#566861] uppercase tracking-wider block font-semibold">
                  Payment Mode
                </span>
                <span className="text-xs font-bold text-[#10B981]">
                  Razorpay Online / UPI
                </span>
              </div>
            </div>

            {receipt.warehouseNotes && (
              <div className="p-2.5 rounded-xl bg-white/80 border border-[#10B981]/20 text-[11px] text-[#0B3326]">
                <span className="font-bold">Warehouse Note:</span> {receipt.warehouseNotes}
              </div>
            )}
          </div>

          {/* How dispatch & inward works */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5 text-amber-900">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900">
              <Truck className="w-4 h-4 text-amber-600" />
              <span>Next Step: Produce Dispatch & Gate Receipt</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              When you click <strong>"Accept Quote & Send Goods"</strong>, the warehouse space is reserved. Transport the goods to the warehouse gate, where the assayer will weigh, inspect, and issue your official government-insured <strong>e-NWR</strong>.
            </p>
          </div>

          {showDeclineConfirm && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2">
              <span className="font-bold text-red-900 block text-xs">
                Are you sure you want to decline this storage quote?
              </span>
              <input
                type="text"
                placeholder="Reason (e.g., Rate too high, stored elsewhere)"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-red-300 text-xs text-gray-900 focus:outline-none"
              />
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeclineConfirm(false)}
                  className="px-3 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={loading}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showDeclineConfirm && (
          <div className="p-5 sm:p-6 pt-3 border-t border-[#E5EDE8] shrink-0 bg-[#F8FAF8] flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowDeclineConfirm(true)}
              className="text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 cursor-pointer"
            >
              Decline Quote
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              loading={loading}
              onClick={handleAccept}
              icon={ArrowRight}
              iconPosition="right"
              className="font-extrabold text-xs shadow-md cursor-pointer"
            >
              Accept Quote & Send Goods
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
