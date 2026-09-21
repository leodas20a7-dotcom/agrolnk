import React, { useState } from 'react';
import {
  X,
  Building2,
  CheckCircle2,
  Truck,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Clock,
  FileText,
  CreditCard,
  Layers,
  Sparkles,
  Check,
  Info
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { acceptWarehouseQuote, declineWarehouseQuote } from '../../utils/warehouses';
import { initiateRazorpayWarehouseRentCheckout } from '../../utils/razorpayRouteClient';

export default function FarmerQuoteReviewModal({
  receipt,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !receipt) return null;

  const totalQty = Number(receipt.totalQuantity || receipt.quantity || 0);
  const monthlyRent = Number(receipt.quotedMonthlyRent || receipt.storageFeeMonthly || 0);
  const ratePerTonne = Number(receipt.quotedRatePerTonne || (totalQty > 0 ? Math.round((monthlyRent / (totalQty / 1000))) : 350)) || 350;
  const ratePerKg = Number((ratePerTonne / 1000).toFixed(2));
  const approxDaily = Math.round(monthlyRent / 30) || 12;

  const handleConfirmAndSendGoods = async () => {
    setLoading(true);
    setError('');

    try {
      // Launch Razorpay Payment Gateway for 1st Month Advance
      await initiateRazorpayWarehouseRentCheckout({
        inventory: receipt,
        amount: monthlyRent,
        extendedDays: 30,
        farmerUser: { name: receipt.farmerName || 'Farmer Depositor', role: 'farmer' },
        onSuccess: async (rzpRes) => {
          const updated = await acceptWarehouseQuote(receipt.id, {
            mode: 'razorpay',
            isPaid: true,
            amount: monthlyRent,
            method: `Razorpay Online (${rzpRes.razorpay_payment_id})`,
            transactionRef: rzpRes.razorpay_payment_id,
          });
          setLoading(false);
          onSuccess?.(updated);
          onClose();
        },
        onFailure: (err) => {
          console.warn('Advance rent checkout canceled or notice:', err);
          setError('Payment was not completed. Please click Pay with Razorpay to try again.');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('Error accepting quote:', err);
      setError('Failed to initiate Razorpay checkout. Please try again.');
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setError('');
    try {
      await declineWarehouseQuote(receipt.id, declineReason || 'Declined by farmer');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error declining warehouse quote:', err);
      setError('Failed to decline quote.');
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
        className="bg-white rounded-3xl max-w-xl w-full max-h-[calc(100dvh-2rem)] flex flex-col border border-[#E5EDE8] shadow-2xl text-left my-auto animate-in zoom-in-95 duration-200 relative overflow-hidden"
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
                  Storage Rent Quote Review & Payment Terms
                </h3>
                <Badge variant="blue" size="sm">
                  Quote Ready
                </Badge>
              </div>
              <span className="text-xs text-[#566861]">
                {receipt.receiptNumber} • {receipt.commodity}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#566861] hover:text-[#0B3326] hover:bg-[#F8FAF8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Facility & Lot Summary Card */}
          <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#E5EDE8] space-y-2.5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#566861] tracking-wider block">
                  Storage Facility & Assigned Chamber
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

          {/* Quoted Fee Details */}
          <div className="p-4 rounded-2xl bg-[#F2FBF6] border-2 border-[#10B981]/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#0B3326] uppercase tracking-wider">
                Confirmed Monthly Storage Tariff
              </span>
              <span className="text-[11px] font-extrabold text-[#10B981]">
                ₹{ratePerKg}/kg/mo (₹{ratePerTonne}/T/mo)
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3326] font-heading">
                  ₹{monthlyRent.toLocaleString('en-IN')}
                  <span className="text-xs font-semibold text-[#566861]"> / month</span>
                </div>
                <span className="text-[11px] text-[#566861]">
                  Standard 30-day billing cycle (≈ ₹{approxDaily} / day)
                </span>
              </div>
            </div>

            {receipt.warehouseNotes && (
              <div className="p-2.5 rounded-xl bg-white/90 border border-[#10B981]/30 text-[11px] text-[#0B3326]">
                <span className="font-bold">Operator Note:</span> {receipt.warehouseNotes}
              </div>
            )}
          </div>

          {/* Payment Gateway - Exclusively Razorpay */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0B3326] uppercase tracking-wider block">
              Payment Gateway
            </label>

            <div className="p-4 rounded-2xl border-2 border-[#10B981] bg-[#F2FBF6] shadow-xs flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0B3326] text-[#34D399] flex items-center justify-center shrink-0 mt-0.5">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#0B3326]">
                      Razorpay Secure Gateway
                    </span>
                    <Badge variant="emerald" size="sm">
                      Online Settlement
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#566861] leading-relaxed">
                    Settle the first month storage advance (₹{monthlyRent.toLocaleString('en-IN')}) securely online via Razorpay. Your chamber reservation and deposit request are confirmed immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dues & Delay Tracking Terms Breakdown */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E5EDE8] space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#0B3326] text-[11px]">
              <Clock className="w-4 h-4 text-[#10B981]" />
              <span>Billing Cycle & Delay Tracking Terms:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#E5EDE8] text-[11px]">
              <div>
                <span className="text-[#566861] block">Due Today:</span>
                <strong className="text-[#0B3326] font-bold">
                  ₹{monthlyRent.toLocaleString('en-IN')}
                </strong>
              </div>
              <div>
                <span className="text-[#566861] block">Cycle Length:</span>
                <strong className="text-[#0B3326] font-bold">30 Days</strong>
              </div>
              <div>
                <span className="text-[#566861] block">Grace Period:</span>
                <strong className="text-[#0B3326] font-bold">5 Days</strong>
              </div>
              <div>
                <span className="text-[#566861] block">Delay Terms:</span>
                <strong className="text-[#D97706] font-bold">5% late fee &gt;5d</strong>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {showDeclineConfirm && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2">
              <span className="font-bold text-red-900 block text-xs">
                Are you sure you want to decline this storage quote?
              </span>
              <input
                type="text"
                placeholder="Reason (e.g. Rate too high, storing locally)"
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
              onClick={handleConfirmAndSendGoods}
              icon={ArrowRight}
              iconPosition="right"
              className="font-extrabold text-xs shadow-md cursor-pointer"
            >
              {loading
                ? 'Processing...'
                : `Pay ₹${monthlyRent.toLocaleString('en-IN')} with Razorpay & Dispatch Goods`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
